export interface User {
  id: string;
  stream?: MediaStream;
}

export interface CallState {
  isInCall: boolean;
  roomId: string | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionState: "disconnected" | "connecting" | "connected" | "failed";
}

export interface MediaControls {
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  endCall: () => void;
}

export interface SocketEvents {
  "join-room": (roomId: string) => void;
  "user-joined": (userId: string) => void;
  "user-left": (userId: string) => void;
  offer: (data: { offer: RTCSessionDescriptionInit; sender: string }) => void;
  answer: (data: { answer: RTCSessionDescriptionInit; sender: string }) => void;
  "ice-candidate": (data: {
    candidate: RTCIceCandidate;
    sender: string;
  }) => void;
}

// Type aliases for better compatibility
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "failed";
