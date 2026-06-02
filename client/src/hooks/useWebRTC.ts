"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SimplePeer, { Instance as PeerInstance, SignalData } from "simple-peer";
import { io, Socket } from "socket.io-client";

type Role = "teacher" | "student" | "admin";

export type PeerConnState = "connecting" | "connected" | "reconnecting" | "failed";

interface RemoteStream {
  socketId: string;
  stream: MediaStream;
  displayName?: string;
}

export interface ChatMessage {
  message: string;
  senderName: string;
  senderId: string;
  sentAt: string | number;
}

export type ParticipantBadge = {
  id: string;
  socketId?: string;
  displayName: string;
  isLocal: boolean;
  isHost?: boolean;
};

export type RaisedHand = { socketId: string; userId: string; displayName: string };

interface UseWebRTCOptions {
  classId: string;
  displayName: string;
  userId: string;
  role: Role;
  cameraId?: string;
  micId?: string;
}

const LIVE_API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:4000";

type IceServerConfig = Pick<RTCIceServer, "urls" | "username" | "credential">;

const DEFAULT_ICE_SERVERS: IceServerConfig[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

const parseCustomIceServers = (): IceServerConfig[] => {
  const rawJson = process.env.NEXT_PUBLIC_TURN_SERVERS;
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as IceServerConfig[];
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      console.warn("[useWebRTC] Failed to parse NEXT_PUBLIC_TURN_SERVERS:", error);
    }
  }
  const urls = process.env.NEXT_PUBLIC_TURN_URLS;
  if (urls) {
    const username = process.env.NEXT_PUBLIC_TURN_USERNAME;
    const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
    return [
      {
        urls: urls.split(",").map((url) => url.trim()),
        username: username || undefined,
        credential: credential || undefined,
      },
    ];
  }
  return [];
};

export function useWebRTC({
  classId,
  displayName,
  userId,
  role,
  cameraId,
  micId,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ParticipantBadge[]>([
    { id: "local", displayName, isLocal: true },
  ]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [sessionEndedBy, setSessionEndedBy] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(role === "teacher" || role === "admin");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
  const [removedBy, setRemovedBy] = useState<string | null>(null);
  const [peerStatus, setPeerStatus] = useState<Record<string, PeerConnState>>({});
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "reconnecting"
  >("connecting");

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, PeerInstance>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const participantDirectory = useRef<
    Record<string, { socketId: string; displayName?: string; userId?: string; isHost?: boolean }>
  >({});
  const iceServers = useMemo(
    () => [...DEFAULT_ICE_SERVERS, ...parseCustomIceServers()],
    [],
  );

  const setPeerState = useCallback((socketId: string, state: PeerConnState) => {
    setPeerStatus((prev) => ({ ...prev, [socketId]: state }));
  }, []);

  const syncMicState = useCallback(() => {
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
    if (!audioTracks.length) {
      setIsMicMuted(false);
      return;
    }
    setIsMicMuted(audioTracks.every((track) => !track.enabled));
  }, []);

  const syncCameraState = useCallback(() => {
    const videoTracks = localStreamRef.current?.getVideoTracks() ?? [];
    if (!videoTracks.length) {
      setIsCameraOff(false);
      return;
    }
    setIsCameraOff(videoTracks.every((track) => !track.enabled));
  }, []);

  const refreshParticipants = useCallback(() => {
    const remoteEntries = Object.values(participantDirectory.current).map(
      (participant) => ({
        id: participant.socketId,
        socketId: participant.socketId,
        displayName: participant.displayName ?? "Participant",
        isLocal: false,
        isHost: participant.isHost,
      }),
    );
    setParticipants([
      { id: "local", displayName, isLocal: true, isHost },
      ...remoteEntries,
    ]);
  }, [displayName, isHost]);

  const cleanupConnections = useCallback(
    (stopLocalTracks = false) => {
      Object.values(peersRef.current).forEach((peer) => peer.destroy());
      peersRef.current = {};
      setRemoteStreams([]);
      setPeerStatus({});
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (stopLocalTracks && localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
      participantDirectory.current = {};
      setParticipants([{ id: "local", displayName, isLocal: true, isHost }]);
    },
    [displayName, isHost],
  );

  const removePeer = useCallback(
    (socketId: string) => {
      peersRef.current[socketId]?.destroy();
      delete peersRef.current[socketId];
      delete participantDirectory.current[socketId];
      setRemoteStreams((prev) => prev.filter((s) => s.socketId !== socketId));
      setPeerStatus((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      setRaisedHands((prev) => prev.filter((h) => h.socketId !== socketId));
      refreshParticipants();
    },
    [refreshParticipants],
  );

  const createPeer = useCallback(
    (remoteSocketId: string, initiator: boolean): PeerInstance => {
      const existing = peersRef.current[remoteSocketId];
      if (existing) return existing;

      setPeerState(remoteSocketId, "connecting");
      const peer = new SimplePeer({
        initiator,
        trickle: true,
        config: { iceServers },
        stream: localStreamRef.current ?? undefined,
      });

      peer.on("signal", (signal: SignalData) => {
        socketRef.current?.emit("signal", { targetSocketId: remoteSocketId, signal });
      });
      peer.on("connect", () => setPeerState(remoteSocketId, "connected"));
      peer.on("stream", (stream: MediaStream) => {
        setRemoteStreams((prev) => [
          ...prev.filter((s) => s.socketId !== remoteSocketId),
          {
            socketId: remoteSocketId,
            stream,
            displayName:
              participantDirectory.current[remoteSocketId]?.displayName ?? "Participant",
          },
        ]);
      });
      peer.on("close", () => removePeer(remoteSocketId));
      peer.on("error", (err) => {
        console.error("Peer connection error:", err);
        setPeerState(remoteSocketId, "failed");
        removePeer(remoteSocketId);
      });

      peersRef.current[remoteSocketId] = peer;
      if (localStreamRef.current) {
        try {
          peer.addStream(localStreamRef.current);
        } catch {
          // ignore
        }
      }
      return peer;
    },
    [iceServers, removePeer, setPeerState],
  );

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !socketRef.current) return;
    try {
      // Sender identity is enforced server-side from the auth token.
      const ack = await socketRef.current.emitWithAck("chat-message", { message: trimmed });
      if (ack?.ok === false) console.warn("[useWebRTC] chat send failed:", ack?.error);
    } catch (error) {
      console.error("[useWebRTC] chat send error:", error);
    }
  }, []);

  const toggleMic = useCallback(() => {
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
    if (!audioTracks.length) return;
    const nextEnabled = !audioTracks[0].enabled;
    audioTracks.forEach((track) => (track.enabled = nextEnabled));
    syncMicState();
  }, [syncMicState]);

  const toggleCamera = useCallback(() => {
    const videoTracks = localStreamRef.current?.getVideoTracks() ?? [];
    if (!videoTracks.length) return;
    const nextEnabled = !videoTracks[0].enabled;
    videoTracks.forEach((track) => (track.enabled = nextEnabled));
    syncCameraState();
  }, [syncCameraState]);

  // ---- Raise hand ----
  const raiseHand = useCallback((raised: boolean) => {
    setIsHandRaised(raised);
    socketRef.current?.emit("raise-hand", { raised });
  }, []);

  // ---- Host controls ----
  const hostMute = useCallback((targetSocketId: string) => {
    socketRef.current?.emit("host-action", { action: "mute", targetSocketId });
  }, []);
  const hostMuteAll = useCallback(() => {
    socketRef.current?.emit("host-action", { action: "mute-all" });
  }, []);
  const hostRemove = useCallback((targetSocketId: string) => {
    socketRef.current?.emit("host-action", { action: "remove", targetSocketId });
  }, []);

  // ---- Screen share ----
  const stopScreenShare = useCallback(() => {
    const screenStream = screenStreamRef.current;
    const cameraTrack = cameraTrackRef.current;
    const local = localStreamRef.current;
    if (!screenStream || !local) return;
    const screenTrack = screenStream.getVideoTracks()[0];
    if (cameraTrack && screenTrack) {
      Object.values(peersRef.current).forEach((peer) => {
        try {
          peer.replaceTrack(screenTrack, cameraTrack, local);
        } catch {
          // ignore
        }
      });
      local.removeTrack(screenTrack);
      local.addTrack(cameraTrack);
    }
    screenStream.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
    setLocalStream(local);
  }, []);

  const startScreenShare = useCallback(async () => {
    const local = localStreamRef.current;
    if (!local) return;
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = display.getVideoTracks()[0];
      const cameraTrack = local.getVideoTracks()[0] ?? null;
      cameraTrackRef.current = cameraTrack;
      screenStreamRef.current = display;

      if (cameraTrack && screenTrack) {
        Object.values(peersRef.current).forEach((peer) => {
          try {
            peer.replaceTrack(cameraTrack, screenTrack, local);
          } catch {
            // ignore
          }
        });
        local.removeTrack(cameraTrack);
        local.addTrack(screenTrack);
      }
      setIsScreenSharing(true);
      setLocalStream(local);
      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.warn("[useWebRTC] screen share denied/cancelled", err);
    }
  }, [stopScreenShare]);

  // ---- Recording (teacher-side) ----
  const startRecording = useCallback(() => {
    const local = localStreamRef.current;
    if (!local || recorderRef.current) return;
    try {
      recordChunksRef.current = [];
      const recorder = new MediaRecorder(local, { mimeType: "video/webm" });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: "video/webm" });
        setRecordingBlob(blob);
        recorderRef.current = null;
        setIsRecording(false);
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingBlob(null);
    } catch (err) {
      console.error("[useWebRTC] recording failed to start", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const clearRecording = useCallback(() => setRecordingBlob(null), []);

  const leaveSession = useCallback(() => {
    cleanupConnections(true);
    setMessages([]);
    setSessionEndedBy(null);
  }, [cleanupConnections]);

  const notifySessionEnd = useCallback(() => {
    socketRef.current?.emit("end-session");
  }, []);

  // ---- Get user media (with selected devices) ----
  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({
        video: cameraId ? { deviceId: { exact: cameraId } } : true,
        audio: micId ? { deviceId: { exact: micId } } : true,
      })
      .then((stream) => {
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        syncMicState();
        syncCameraState();
        Object.values(peersRef.current).forEach((peer) => {
          try {
            peer.addStream(stream);
          } catch {
            // ignore
          }
        });
      })
      .catch((err) => console.error("Camera/mic blocked", err));

    return () => {
      mounted = false;
      cleanupConnections(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId, micId]);

  // ---- Active speaker detection ----
  useEffect(() => {
    let raf = 0;
    let ctx: AudioContext | null = null;
    const analysers: {
      id: string;
      analyser: AnalyserNode;
      data: Uint8Array<ArrayBuffer>;
    }[] = [];
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      const add = (id: string, stream: MediaStream) => {
        if (!stream.getAudioTracks().length || !ctx) return;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        analysers.push({
          id,
          analyser,
          data: new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)),
        });
      };
      if (localStreamRef.current) add("local", localStreamRef.current);
      remoteStreams.forEach((r) => add(r.socketId, r.stream));

      const tick = () => {
        let loudest: { id: string; level: number } | null = null;
        for (const a of analysers) {
          a.analyser.getByteFrequencyData(a.data);
          let sum = 0;
          for (let i = 0; i < a.data.length; i++) sum += a.data[i];
          const level = sum / a.data.length;
          if (!loudest || level > loudest.level) loudest = { id: a.id, level };
        }
        setActiveSpeakerId(loudest && loudest.level > 15 ? loudest.id : null);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } catch {
      // AudioContext unavailable — skip active-speaker detection.
    }
    return () => {
      cancelAnimationFrame(raf);
      void ctx?.close();
    };
  }, [remoteStreams, localStream]);

  // ---- Socket lifecycle ----
  useEffect(() => {
    if (!classId || !localStream) return;

    const socket = io(`${LIVE_API_BASE}/live`, {
      transports: ["websocket"],
      reconnectionAttempts: 10,
      withCredentials: true,
    });
    socketRef.current = socket;

    const joinRoom = () => {
      socket.emit(
        "join-room",
        { classId, displayName, userId, role },
        (ack?: { socketId?: string; isHost?: boolean }) => {
          if (ack?.isHost !== undefined) setIsHost(ack.isHost);
        },
      );
    };

    socket.on("connect", () => {
      setConnectionState("connected");
      // On (re)connect, drop stale peers then (re)join cleanly.
      Object.values(peersRef.current).forEach((p) => p.destroy());
      peersRef.current = {};
      participantDirectory.current = {};
      setRemoteStreams([]);
      joinRoom();
    });
    socket.io.on("reconnect_attempt", () => setConnectionState("reconnecting"));

    socket.on(
      "existing-peers",
      (peers: Array<{ socketId: string; displayName?: string; userId?: string; isHost?: boolean }>) => {
        peers.forEach((peer) => {
          participantDirectory.current[peer.socketId] = peer;
          createPeer(peer.socketId, false);
        });
        refreshParticipants();
      },
    );
    socket.on(
      "peer-joined",
      (peer: { socketId: string; displayName?: string; userId?: string; isHost?: boolean }) => {
        participantDirectory.current[peer.socketId] = peer;
        createPeer(peer.socketId, true);
        refreshParticipants();
      },
    );
    socket.on("peer-left", ({ socketId }: { socketId: string }) => removePeer(socketId));
    socket.on("signal", ({ from, signal }: { from: string; signal: SignalData }) => {
      const peer = peersRef.current[from] || createPeer(from, false);
      peer?.signal(signal);
    });
    socket.on("chat-history", (history: ChatMessage[]) => setMessages(history));
    socket.on("chat-message", (msg: ChatMessage) => setMessages((prev) => [...prev, msg]));
    socket.on("session-ended", ({ endedBy }: { endedBy?: string }) => {
      setSessionEndedBy(endedBy ?? "Host");
      cleanupConnections(true);
    });
    socket.on("force-mute", () => {
      const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
      audioTracks.forEach((t) => (t.enabled = false));
      setIsMicMuted(true);
    });
    socket.on("removed", ({ by }: { by?: string }) => {
      setRemovedBy(by ?? "Host");
      cleanupConnections(true);
    });
    socket.on(
      "hand-raised",
      (data: { socketId: string; userId: string; displayName: string; raised: boolean }) => {
        setRaisedHands((prev) => {
          const without = prev.filter((h) => h.socketId !== data.socketId);
          return data.raised
            ? [...without, { socketId: data.socketId, userId: data.userId, displayName: data.displayName }]
            : without;
        });
      },
    );

    return () => {
      socket.off();
      socket.io.off("reconnect_attempt");
      cleanupConnections();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, displayName, userId, role, localStream]);

  return {
    localStream,
    remoteStreams,
    messages,
    sendMessage,
    participants,
    isMicMuted,
    isCameraOff,
    toggleMic,
    toggleCamera,
    leaveSession,
    notifySessionEnd,
    sessionEndedBy,
    // new
    isHost,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    raisedHands,
    raiseHand,
    isHandRaised,
    hostMute,
    hostMuteAll,
    hostRemove,
    removedBy,
    peerStatus,
    activeSpeakerId,
    isRecording,
    startRecording,
    stopRecording,
    recordingBlob,
    clearRecording,
    connectionState,
  };
}
