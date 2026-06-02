// Socket.IO's adapter API still exposes several `any`-typed collections (rooms, sockets, etc.),
// so we temporarily disable the unsafe-access rules for this gateway to keep the implementation clean.
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Namespace, Socket } from 'socket.io';
import { ClassService } from '../class/class.service';
import { ClassDocument } from '../class/schemas/class.schema';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { UserService } from '../user/user.service';
import { userMatchesClassTeacher } from '../class/class.constants';

type LiveRole = 'teacher' | 'student' | 'admin';

type SignalPayload = {
  targetSocketId?: string;
  signal: unknown;
};

type ChatPayload = {
  message: string;
};

type ChatEntry = {
  message: string;
  senderName: string;
  senderId: string;
  sentAt: string;
};

type JoinPayload = {
  classId: string;
};

type HostActionPayload = {
  action: 'mute' | 'mute-all' | 'remove';
  targetSocketId?: string;
};

type RaiseHandPayload = { raised: boolean };

type PeerSummary = {
  socketId: string;
  displayName?: string;
  userId?: string;
  isHost?: boolean;
};

interface ServerToClientEvents {
  'peer-left': (data: { socketId: string }) => void;
  'existing-peers': (data: PeerSummary[]) => void;
  'peer-joined': (data: PeerSummary) => void;
  signal: (data: { from: string; signal: unknown }) => void;
  'chat-message': (data: ChatEntry) => void;
  'chat-history': (data: ChatEntry[]) => void;
  'session-ended': (data: { endedBy: string }) => void;
  'force-mute': () => void;
  removed: (data: { by: string }) => void;
  'hand-raised': (data: {
    socketId: string;
    userId: string;
    displayName: string;
    raised: boolean;
  }) => void;
}

interface ClientToServerEvents {
  'join-room': (payload: JoinPayload) => void;
  signal: (payload: SignalPayload) => void;
  'chat-message': (
    payload: ChatPayload,
    callback?: (response: { ok: boolean; error?: string }) => void,
  ) => void;
  'end-session': () => void;
  'host-action': (payload: HostActionPayload) => void;
  'raise-hand': (payload: RaiseHandPayload) => void;
}

interface SocketData {
  classId?: string;
  userId?: string;
  displayName?: string;
  role?: LiveRole;
  isHost?: boolean;
}

type LiveSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

type LiveNamespace = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URI?.split(',') ?? '*',
    credentials: true,
  },
  namespace: 'live',
})
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: LiveNamespace;

  private readonly logger = new Logger(LiveGateway.name);
  private readonly chatHistory = new Map<string, ChatEntry[]>();
  private readonly CHAT_HISTORY_LIMIT = 200;

  constructor(
    private readonly classService: ClassService,
    private readonly enrollmentService: EnrollmentService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  /** Extract a cookie value from a raw Cookie header. */
  private readCookie(
    cookieHeader: string | undefined,
    name: string,
  ): string | undefined {
    if (!cookieHeader) return undefined;
    for (const part of cookieHeader.split(';')) {
      const [k, ...rest] = part.trim().split('=');
      if (k === name) return decodeURIComponent(rest.join('='));
    }
    return undefined;
  }

  private mapRole(role?: string): LiveRole {
    if (role === 'Admin' || role === 'SuperAdmin') return 'admin';
    if (role === 'Teacher') return 'teacher';
    return 'student';
  }

  /**
   * Authenticate the socket from the JWT (access_token cookie, or auth.token
   * fallback). On success, set the server-trusted identity on client.data.
   */
  async handleConnection(client: LiveSocket) {
    try {
      const cookieToken = this.readCookie(
        client.handshake.headers.cookie,
        'access_token',
      );
      const authToken = (client.handshake.auth as { token?: string } | undefined)
        ?.token;
      const token = cookieToken ?? authToken;
      if (!token) {
        throw new Error('No auth token');
      }
      const payload = this.jwtService.verify<{ sub: string; role?: string }>(token);
      client.data.userId = payload.sub;
      client.data.role = this.mapRole(payload.role);

      const user = await this.userService.findById(payload.sub);
      const u = user as
        | { firstName?: string; lastName?: string; email?: string }
        | null;
      client.data.displayName =
        [u?.firstName, u?.lastName].filter(Boolean).join(' ') ||
        u?.email ||
        'Participant';

      this.logger.log(`Client connected ${client.id} (user ${payload.sub})`);
    } catch {
      this.logger.warn(`Rejected unauthenticated socket ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: LiveSocket) {
    this.logger.log(`Client disconnected ${client.id}`);
    if (client.data.classId) {
      client.to(client.data.classId).emit('peer-left', {
        socketId: client.id,
      });
      const room = this.server.adapter.rooms.get(client.data.classId);
      if (!room || room.size === 0) {
        this.chatHistory.delete(client.data.classId);
      }
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(client: LiveSocket, payload: JoinPayload) {
    // Identity is taken from the authenticated socket, NOT the payload.
    const userId = client.data.userId;
    const role = client.data.role;
    if (!userId || !role) {
      client.disconnect();
      return;
    }

    const klass = await this.classService.findById(payload.classId);
    if (!klass) {
      this.logger.warn(`Join rejected for class ${payload.classId} - not found`);
      client.disconnect();
      return;
    }

    const { allowed, reason } = await this.isUserAllowedInClass(
      klass,
      userId,
      role,
    );
    if (!allowed) {
      this.logger.warn(
        `Join rejected for user ${userId} in class ${payload.classId}: ${reason}`,
      );
      client.disconnect();
      return;
    }

    const isHost = role === 'admin' || userMatchesClassTeacher(klass, userId);

    let existingPeers: PeerSummary[] = [];
    try {
      const room = this.server.adapter.rooms.get(payload.classId);
      if (room && room.size > 0) {
        existingPeers = Array.from(room)
          .filter((id) => id !== client.id)
          .map((socketId) => {
            const socket = this.server.sockets.get(socketId);
            return {
              socketId,
              displayName: socket?.data?.displayName || 'Participant',
              userId: socket?.data?.userId || 'unknown',
              isHost: socket?.data?.isHost ?? false,
            };
          });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to read existing peers for class ${payload.classId}: ${String(err)}`,
      );
      existingPeers = [];
    }

    client.data.classId = payload.classId;
    client.data.isHost = isHost;

    await client.join(payload.classId);

    client.emit('existing-peers', existingPeers);
    const history = this.chatHistory.get(payload.classId);
    if (history?.length) {
      client.emit('chat-history', [...history]);
    }
    client.to(payload.classId).emit('peer-joined', {
      socketId: client.id,
      displayName: client.data.displayName,
      userId,
      isHost,
    });
    return { socketId: client.id, isHost };
  }

  private async isUserAllowedInClass(
    klass: ClassDocument,
    userId: string,
    role: LiveRole,
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (!userId) {
      return { allowed: false, reason: 'Missing user id' };
    }

    // Admins always allowed; any assigned teacher (multi-teacher aware) allowed.
    if (role === 'admin') {
      return { allowed: true };
    }
    if (role === 'teacher' && userMatchesClassTeacher(klass, userId)) {
      return { allowed: true };
    }

    // Students must be actively enrolled.
    const enrollments = await this.enrollmentService.findByStudent(userId);
    const classIdStr = (
      klass as unknown as { _id: { toString(): string } }
    )._id.toString();
    const isEnrolled = enrollments.some(
      (enrollment: {
        classId?: { _id?: { toString(): string } } | { toString(): string };
        status?: string;
      }) => {
        const cid =
          typeof enrollment.classId === 'object' && enrollment.classId !== null
            ? '_id' in enrollment.classId
              ? enrollment.classId._id?.toString()
              : enrollment.classId.toString()
            : enrollment.classId;
        return cid === classIdStr && enrollment.status === 'active';
      },
    );

    if (isEnrolled) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'User is not enrolled or instructor/admin for this class',
    };
  }

  @SubscribeMessage('signal')
  handleSignal(client: LiveSocket, payload: SignalPayload) {
    if (!client.data.classId) {
      return;
    }
    const body = { from: client.id, signal: payload.signal };
    if (payload.targetSocketId) {
      const target = this.server.sockets.get(payload.targetSocketId);
      target?.emit('signal', body);
      return;
    }
    client.to(client.data.classId).emit('signal', body);
  }

  @SubscribeMessage('chat-message')
  handleChat(client: LiveSocket, payload: ChatPayload) {
    if (!client.data.classId) {
      return { ok: false, error: 'NOT_IN_ROOM' };
    }
    const message = payload.message?.trim();
    if (!message) {
      return { ok: false, error: 'EMPTY_MESSAGE' };
    }

    // Sender identity comes from the authenticated socket only.
    const entry: ChatEntry = {
      message: message.slice(0, 2000),
      senderName: client.data.displayName ?? 'Unknown',
      senderId: client.data.userId ?? client.id,
      sentAt: new Date().toISOString(),
    };

    const existing = this.chatHistory.get(client.data.classId) ?? [];
    existing.push(entry);
    if (existing.length > this.CHAT_HISTORY_LIMIT) {
      existing.splice(0, existing.length - this.CHAT_HISTORY_LIMIT);
    }
    this.chatHistory.set(client.data.classId, existing);

    this.server.in(client.data.classId).emit('chat-message', entry);
    return { ok: true };
  }

  @SubscribeMessage('raise-hand')
  handleRaiseHand(client: LiveSocket, payload: RaiseHandPayload) {
    if (!client.data.classId || !client.data.userId) return;
    this.server.in(client.data.classId).emit('hand-raised', {
      socketId: client.id,
      userId: client.data.userId,
      displayName: client.data.displayName ?? 'Participant',
      raised: !!payload?.raised,
    });
  }

  @SubscribeMessage('host-action')
  handleHostAction(client: LiveSocket, payload: HostActionPayload) {
    // Only the room host (class teacher / admin) may run host controls.
    if (!client.data.classId || !client.data.isHost) {
      return { ok: false, error: 'NOT_HOST' };
    }
    const room = client.data.classId;

    if (payload.action === 'mute-all') {
      const sockets = this.server.adapter.rooms.get(room);
      if (sockets) {
        for (const sid of sockets) {
          if (sid === client.id) continue;
          this.server.sockets.get(sid)?.emit('force-mute');
        }
      }
      return { ok: true };
    }

    if (!payload.targetSocketId) {
      return { ok: false, error: 'NO_TARGET' };
    }
    const target = this.server.sockets.get(payload.targetSocketId);
    if (!target || target.data.classId !== room) {
      return { ok: false, error: 'TARGET_NOT_IN_ROOM' };
    }

    if (payload.action === 'mute') {
      target.emit('force-mute');
      return { ok: true };
    }
    if (payload.action === 'remove') {
      target.emit('removed', { by: client.data.displayName ?? 'Host' });
      this.server.in(room).emit('peer-left', { socketId: target.id });
      void target.leave(room);
      target.disconnect();
      return { ok: true };
    }
    return { ok: false, error: 'UNKNOWN_ACTION' };
  }

  @SubscribeMessage('end-session')
  endSession(client: LiveSocket) {
    if (!client.data.classId || !client.data.isHost) {
      return;
    }
    this.server.in(client.data.classId).emit('session-ended', {
      endedBy: client.data.displayName ?? 'Host',
    });
    this.chatHistory.delete(client.data.classId);
  }
}
