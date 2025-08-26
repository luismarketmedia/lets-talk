import React, { useState } from "react";
import { useWebRTC } from "./hooks/useWebRTC";
import { JoinRoom } from "./components/JoinRoom";
import { CallInterface } from "./components/CallInterface";
import { ToastProvider, useToast } from "./components/ui/toast";

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const {
    isInCall,
    roomId,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionState,
    joinRoom,
    requestJoinRoom,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    endCall,
    socket,
    isHost,
  } = useWebRTC({
    onNotification: (type, title, message) => {
      addToast({ type, title, message });
    },
  });

  const handleJoinRoom = async (roomId: string) => {
    try {
      setError(null);
      await joinRoom(roomId);
    } catch (error) {
      console.error("Erro ao entrar na sala:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao acessar câmera/microfone. Verifique as permissões do navegador.";
      setError(errorMessage);
    }
  };

  if (!isInCall) {
    return (
      <JoinRoom
        onJoinRoom={handleJoinRoom}
        isConnecting={connectionState === "connecting"}
        error={error}
        onClearError={() => setError(null)}
      />
    );
  }

  return (
    <CallInterface
      roomId={roomId || ""}
      localStream={localStream}
      remoteStreams={remoteStreams}
      isAudioEnabled={isAudioEnabled}
      isVideoEnabled={isVideoEnabled}
      isScreenSharing={isScreenSharing}
      socket={socket}
      isHost={isHost}
      userName="Você" // TODO: Add user name input in future
      onToggleAudio={toggleAudio}
      onToggleVideo={toggleVideo}
      onToggleScreenShare={toggleScreenShare}
      onEndCall={endCall}
    />
  );
}

export default App;
