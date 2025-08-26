import React from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { JoinRoom } from './components/JoinRoom';
import { CallInterface } from './components/CallInterface';

function App() {
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
      await joinRoom(roomId);
    } catch (error) {
      console.error('Erro ao entrar na sala:', error);
      alert('Erro ao acessar câmera/microfone. Verifique as permissões do navegador.');
    }
  };

  if (!isInCall) {
    return (
      <JoinRoom
        onJoinRoom={handleJoinRoom}
        isConnecting={connectionState === 'connecting'}
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
