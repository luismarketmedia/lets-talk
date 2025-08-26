import React, { useState } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { JoinRoom } from './components/JoinRoom';
import { CallInterface } from './components/CallInterface';
import { ToastProvider, useToast } from './components/ui/toast';

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const [error, setError] = useState<string | null>(null);

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
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    endCall
  } = useWebRTC();

  const handleJoinRoom = async (roomId: string) => {
    try {
      setError(null);
      await joinRoom(roomId);
    } catch (error) {
      console.error('Erro ao entrar na sala:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Erro desconhecido ao acessar câmera/microfone. Verifique as permissões do navegador.';
      setError(errorMessage);
    }
  };

  if (!isInCall) {
    return (
      <JoinRoom
        onJoinRoom={handleJoinRoom}
        isConnecting={connectionState === 'connecting'}
        error={error}
        onClearError={() => setError(null)}
      />
    );
  }

  return (
    <CallInterface
      roomId={roomId || ''}
      localStream={localStream}
      remoteStreams={remoteStreams}
      isAudioEnabled={isAudioEnabled}
      isVideoEnabled={isVideoEnabled}
      isScreenSharing={isScreenSharing}
      onToggleAudio={toggleAudio}
      onToggleVideo={toggleVideo}
      onToggleScreenShare={toggleScreenShare}
      onEndCall={endCall}
    />
  );
}

export default App;
