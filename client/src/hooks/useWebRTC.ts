import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { CallState, MediaControls } from '../types/webrtc';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const useWebRTC = (): CallState & MediaControls & {
  joinRoom: (roomId: string) => Promise<void>;
  socket: Socket | null;
} => {
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    roomId: null,
    localStream: null,
    remoteStreams: new Map(),
    isAudioEnabled: true,
    isVideoEnabled: true,
    isScreenSharing: false,
    connectionState: 'disconnected'
  });

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Conectar ao servidor Socket.IO
    socketRef.current = io('http://localhost:3000');
    const socket = socketRef.current;

    socket.on('connect', () => {
      setCallState(prev => ({ ...prev, connectionState: 'connected' }));
    });

    socket.on('disconnect', () => {
      setCallState(prev => ({ ...prev, connectionState: 'disconnected' }));
    });

    socket.on('user-joined', async (userId: string) => {
      console.log('Usuário entrou:', userId);
      await createOffer(userId);
    });

    socket.on('user-left', (userId: string) => {
      console.log('Usuário saiu:', userId);
      const peerConnection = peerConnectionsRef.current.get(userId);
      if (peerConnection) {
        peerConnection.close();
        peerConnectionsRef.current.delete(userId);
      }

      setCallState(prev => {
        const newRemoteStreams = new Map(prev.remoteStreams);
        newRemoteStreams.delete(userId);
        return { ...prev, remoteStreams: newRemoteStreams };
      });
    });

    socket.on('offer', async (data) => {
      await handleOffer(data.offer, data.sender);
    });

    socket.on('answer', async (data) => {
      await handleAnswer(data.answer, data.sender);
    });

    socket.on('ice-candidate', async (data) => {
      await handleIceCandidate(data.candidate, data.sender);
    });

    return () => {
      socket.disconnect();
      peerConnectionsRef.current.forEach(pc => pc.close());
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const createPeerConnection = (userId: string): RTCPeerConnection => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Adicionar stream local se disponível
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Lidar com stream remoto
    peerConnection.ontrack = (event) => {
      console.log('Stream remoto recebido de:', userId);
      const [remoteStream] = event.streams;
      setCallState(prev => {
        const newRemoteStreams = new Map(prev.remoteStreams);
        newRemoteStreams.set(userId, remoteStream);
        return { ...prev, remoteStreams: newRemoteStreams };
      });
    };

    // Lidar com candidatos ICE
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          target: userId
        });
      }
    };

    peerConnectionsRef.current.set(userId, peerConnection);
    return peerConnection;
  };

  const createOffer = async (userId: string) => {
    const peerConnection = createPeerConnection(userId);
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      if (socketRef.current) {
        socketRef.current.emit('offer', {
          offer,
          target: userId
        });
      }
    } catch (error) {
      console.error('Erro ao criar oferta:', error);
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, senderId: string) => {
    const peerConnection = createPeerConnection(senderId);
    try {
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      if (socketRef.current) {
        socketRef.current.emit('answer', {
          answer,
          target: senderId
        });
      }
    } catch (error) {
      console.error('Erro ao lidar com oferta:', error);
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, senderId: string) => {
    const peerConnection = peerConnectionsRef.current.get(senderId);
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(answer);
      } catch (error) {
        console.error('Erro ao lidar com resposta:', error);
      }
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidate, senderId: string) => {
    const peerConnection = peerConnectionsRef.current.get(senderId);
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error('Erro ao adicionar candidato ICE:', error);
      }
    }
  };

  const joinRoom = useCallback(async (roomId: string) => {
    try {
      setCallState(prev => ({ ...prev, connectionState: 'connecting' }));

      // Obter stream local
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      setCallState(prev => ({
        ...prev,
        localStream: stream,
        isInCall: true,
        roomId,
        connectionState: 'connected'
      }));

      // Entrar na sala via Socket.IO
      if (socketRef.current) {
        socketRef.current.emit('join-room', roomId);
      }
    } catch (error) {
      console.error('Erro ao entrar na sala:', error);
      setCallState(prev => ({ ...prev, connectionState: 'failed' }));
      throw error;
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isAudioEnabled: audioTrack.enabled }));
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
      }
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!callState.isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Substituir track de vídeo em todas as conexões
        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnectionsRef.current.forEach(peerConnection => {
          const sender = peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Atualizar stream local
        if (localStreamRef.current) {
          const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
          localStreamRef.current.removeTrack(oldVideoTrack);
          localStreamRef.current.addTrack(videoTrack);
          oldVideoTrack.stop();
        }

        setCallState(prev => ({ ...prev, isScreenSharing: true }));

        // Parar compartilhamento quando o usuário para
        videoTrack.onended = () => {
          setCallState(prev => ({ ...prev, isScreenSharing: false }));
        };
      }
    } catch (error) {
      console.error('Erro ao compartilhar tela:', error);
    }
  }, [callState.isScreenSharing]);

  const endCall = useCallback(() => {
    // Parar todas as tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Fechar todas as conexões peer
    peerConnectionsRef.current.forEach(peerConnection => {
      peerConnection.close();
    });
    peerConnectionsRef.current.clear();

    // Resetar estado
    setCallState({
      isInCall: false,
      roomId: null,
      localStream: null,
      remoteStreams: new Map(),
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      connectionState: 'connected'
    });
  }, []);

  return {
    ...callState,
    joinRoom,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    endCall,
    socket: socketRef.current
  };
};
