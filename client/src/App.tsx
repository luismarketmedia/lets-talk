import React, { useState } from "react";
import { useWebRTC } from "./hooks/useWebRTC";
import { JoinRoom } from "./components/JoinRoom";
import { CallInterface } from "./components/CallInterface";
import { ToastProvider, useToast } from "./components/ui/toast";
import { loadUsername } from "./lib/userStorage";

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const [error, setError] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("Você");
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
      // Update the current username from saved data
      setCurrentUserName(loadUsername() || "Você");
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

  const handleRequestJoinRoom = async (roomId: string, userName: string) => {
    try {
      setError(null);
      // Update the current username
      setCurrentUserName(userName || loadUsername() || "Você");
      await requestJoinRoom(roomId, userName);
    } catch (error) {
      console.error("Erro ao solicitar entrada na sala:", error);
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
        onRequestJoinRoom={handleRequestJoinRoom}
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
      userName={currentUserName}
      onToggleAudio={toggleAudio}
      onToggleVideo={toggleVideo}
      onToggleScreenShare={toggleScreenShare}
      onEndCall={endCall}
    />
  );
}

export default App;
