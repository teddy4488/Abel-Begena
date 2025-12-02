import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Namespace, Socket } from 'socket.io';
import { ClassService } from '../class/class.service';

type SignalPayload = {
  targetSocketId?: string;
  signal: unknown;
};

type ChatPayload = {
  message: string;
  senderName?: string;
  senderId?: string;
};

type JoinPayload = {
  classId: string;
  userId: string;
  displayName: string;
  role?: 'teacher' | 'student' | 'admin';
};

type PeerSummary = {
  socketId: string;
  displayName?: string;
  userId?: string;
};

interface ServerToClientEvents {
  'peer-left': (data: { socketId: string }) => void;
  'existing-peers': (data: PeerSummary[]) => void;
  'peer-joined': (data: PeerSummary) => void;
  signal: (data: { from: string; signal: unknown }) => void;
  'chat-message': (data: {
    message: string;
    senderName: string;
    senderId: string;
    sentAt: string;
  }) => void;
  'session-ended': (data: { endedBy: string }) => void;
}

interface ClientToServerEvents {
  'join-room': (payload: JoinPayload) => void;
  signal: (payload: SignalPayload) => void;
  'chat-message': (payload: ChatPayload) => void;
  'end-session': () => void;
}

interface SocketData {
  classId?: string;
  userId?: string;
  displayName?: string;
  role?: 'teacher' | 'student' | 'admin';
}

type LiveSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  any,
  SocketData
>;

type LiveNamespace = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  any,
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

  constructor(private readonly classService: ClassService) {}

  handleConnection(client: LiveSocket) {
    this.logger.log(`Client connected ${client.id}`);
  }

  handleDisconnect(client: LiveSocket) {
    this.logger.log(`Client disconnected ${client.id}`);
    if (client.data.classId) {
      client.to(client.data.classId).emit('peer-left', {
        socketId: client.id,
      });
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: LiveSocket,
    @MessageBody() payload: JoinPayload,
  ) {
    try {
      // Ensure class exists; enrollment checks can be added here later.
      await this.classService.findOne(payload.classId);
    } catch (err) {
      this.logger.warn(
        `Join rejected for class ${payload.classId} - not found or inaccessible: ${String(
          err,
        )}`,
      );
      client.disconnect();
      return;
    }

    let existingPeers: PeerSummary[] = [];
    try {
      const room = this.server.adapter.rooms.get(payload.classId);

      if (room && room.size > 0) {
        existingPeers = Array.from(room)
          .filter((id) => id !== client.id)
          .map((socketId) => {
            const socket = this.server.sockets.get(socketId) as
              | LiveSocket
              | undefined;

            return {
              socketId,
              displayName: socket?.data?.displayName || 'Participant',
              userId: socket?.data?.userId || 'unknown',
            };
          });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to read existing peers for class ${payload.classId}: ${String(
          err,
        )}`,
      );
      existingPeers = [];
    }

    client.data.classId = payload.classId;
    client.data.displayName = payload.displayName;
    client.data.userId = payload.userId;
    client.data.role = payload.role;

    await client.join(payload.classId);

    client.emit('existing-peers', existingPeers);
    client.to(payload.classId).emit('peer-joined', {
      socketId: client.id,
      displayName: payload.displayName,
      userId: payload.userId,
    });
    return { socketId: client.id };
  }

  @SubscribeMessage('signal')
  handleSignal(
    @ConnectedSocket() client: LiveSocket,
    @MessageBody() payload: SignalPayload,
  ) {
    if (!client.data.classId) {
      return;
    }
    const body = {
      from: client.id,
      signal: payload.signal,
    };
    if (payload.targetSocketId) {
      const target = this.server.sockets.get(payload.targetSocketId);
      target?.emit('signal', body);
      return;
    }
    client.to(client.data.classId).emit('signal', body);
  }

  @SubscribeMessage('chat-message')
  handleChat(
    @ConnectedSocket() client: LiveSocket,
    @MessageBody() payload: ChatPayload,
  ) {
    if (!client.data.classId) {
      return;
    }
    this.server.in(client.data.classId).emit('chat-message', {
      message: payload.message,
      senderName: payload.senderName ?? client.data.displayName ?? 'Unknown',
      senderId: payload.senderId ?? client.data.userId ?? client.id,
      sentAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage('end-session')
  async endSession(@ConnectedSocket() client: LiveSocket) {
    if (!client.data.classId || !client.data.userId) {
      return;
    }

    try {
      const klass = await this.classService.findOne(client.data.classId);
      const teacherId =
        (klass as any)?.instructorId ??
        (klass as any)?.teacherId ??
        (klass as any)?.teacher?._id;

      if (teacherId && teacherId.toString() !== client.data.userId) {
        this.logger.warn(
          `Non-teacher ${client.id} attempted to end session ${client.data.classId}`,
        );
        return;
      }
    } catch (err) {
      this.logger.warn(
        `Unable to verify teacher for class ${client.data.classId}: ${String(
          err,
        )}`,
      );
    }

    this.server.in(client.data.classId).emit('session-ended', {
      endedBy: client.data.displayName ?? 'Host',
    });
  }
}


