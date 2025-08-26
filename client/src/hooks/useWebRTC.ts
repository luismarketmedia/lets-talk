import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { CallState, MediaControls } from "../types/webrtc";

interface WebRTCOptions {
  onNotification?: (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message?: string,
  ) => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useWebRTC = (
  options: WebRTCOptions = {},
): CallState &
  MediaControls & {
    joinRoom: (roomId: string) => Promise<void>;
    requestJoinRoom: (roomId: string, userName?: string) => Promise<void>;
    socket: Socket | null;
    isHost: boolean;
  } => {
  const { onNotification } = options;
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    roomId: null,
    localStream: null,
    remoteStreams: new Map(),
    isAudioEnabled: true,
    isVideoEnabled: true,
    isScreenSharing: false,
    connectionState: "disconnected",
  });

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    // Conectar ao servidor Socket.IO via proxy do Vite
    const serverUrl = import.meta.env.DEV ? "http://localhost:3000" : window.location.origin;

    console.log("Conectando ao servidor WebRTC:", serverUrl);
    socketRef.current = io(serverUrl, {
      transports: ["websocket", "polling"],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("✅ Socket conectado com sucesso:", socket.id);
      setCallState((prev) => ({ ...prev, connectionState: "connected" }));
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket desconectado:", reason);
      setCallState((prev) => ({ ...prev, connectionState: "disconnected" }));
    });

    socket.on("connect_error", (error) => {
      console.error("🚫 Erro de conexão socket:", error);
      setCallState((prev) => ({ ...prev, connectionState: "failed" }));
    });

    socket.on("user-joined", async (userId: string) => {
      console.log("Usuário entrou:", userId);
      await createOffer(userId);
    });

    socket.on("user-left", (userId: string) => {
      console.log("Usuário saiu:", userId);
      const peerConnection = peerConnectionsRef.current.get(userId);
      if (peerConnection) {
        peerConnection.close();
        peerConnectionsRef.current.delete(userId);
      }

      setCallState((prev) => {
        const newRemoteStreams = new Map(prev.remoteStreams);
        newRemoteStreams.delete(userId);
        return { ...prev, remoteStreams: newRemoteStreams };
      });
    });

    socket.on("offer", async (data) => {
      await handleOffer(data.offer, data.sender);
    });

    socket.on("answer", async (data) => {
      await handleAnswer(data.answer, data.sender);
    });

    socket.on("ice-candidate", async (data) => {
      await handleIceCandidate(data.candidate, data.sender);
    });

    // Listen for participant state changes
    socket.on("participant-state-changed", (data) => {
      console.log("Participant state changed:", data);
      // This will be used to update UI in the future
      // For now, we just log it as the VideoTile components will handle mute indicators
    });

    // Eventos do sistema de aprovação
    socket.on("join-approved", (data) => {
      console.log("Entrada aprovada na sala:", data.roomId);
      if (onNotification) {
        onNotification(
          "success",
          "Entrada Aprovada",
          "Você foi aceito na sala!",
        );
      }
    });

    socket.on("join-rejected", (data) => {
      console.log("Entrada rejeitada na sala:", data.roomId);
      if (onNotification) {
        onNotification(
          "error",
          "Entrada Rejeitada",
          "Sua solicitação foi recusada.",
        );
      }
    });

    socket.on("join-error", (data) => {
      console.log("Erro ao entrar na sala:", data.message);
      if (onNotification) {
        onNotification("error", "Erro", data.message);
      }
    });

    return () => {
      socket.disconnect();
      peerConnectionsRef.current.forEach((pc) => pc.close());
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const createPeerConnection = (userId: string): RTCPeerConnection => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Adicionar stream local se disponível
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Lidar com stream remoto
    peerConnection.ontrack = (event) => {
      console.log("Stream remoto recebido de:", userId);
      const [remoteStream] = event.streams;
      setCallState((prev) => {
        const newRemoteStreams = new Map(prev.remoteStreams);
        newRemoteStreams.set(userId, remoteStream);
        return { ...prev, remoteStreams: newRemoteStreams };
      });
    };

    // Lidar com candidatos ICE
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          candidate: event.candidate,
          target: userId,
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
        socketRef.current.emit("offer", {
          offer,
          target: userId,
        });
      }
    } catch (error) {
      console.error("Erro ao criar oferta:", error);
    }
  };

  const handleOffer = async (
    offer: RTCSessionDescriptionInit,
    senderId: string,
  ) => {
    const peerConnection = createPeerConnection(senderId);
    try {
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      if (socketRef.current) {
        socketRef.current.emit("answer", {
          answer,
          target: senderId,
        });
      }
    } catch (error) {
      console.error("Erro ao lidar com oferta:", error);
    }
  };

  const handleAnswer = async (
    answer: RTCSessionDescriptionInit,
    senderId: string,
  ) => {
    const peerConnection = peerConnectionsRef.current.get(senderId);
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(answer);
      } catch (error) {
        console.error("Erro ao lidar com resposta:", error);
      }
    }
  };

  const handleIceCandidate = async (
    candidate: RTCIceCandidate,
    senderId: string,
  ) => {
    const peerConnection = peerConnectionsRef.current.get(senderId);
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error("Erro ao adicionar candidato ICE:", error);
      }
    }
  };

  const joinRoom = useCallback(async (roomId: string) => {
    try {
      setCallState((prev) => ({ ...prev, connectionState: "connecting" }));

      // Verificar disponibilidade de dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some((device) => device.kind === "videoinput");
      const hasAudio = devices.some((device) => device.kind === "audioinput");

      console.log("Dispositivos disponíveis:", { hasVideo, hasAudio });

      if (!hasVideo && !hasAudio) {
        throw new Error(
          "Nenhum dispositivo de mídia encontrado. Verifique se sua câmera e microfone estão conectados.",
        );
      }

      let stream: MediaStream | null = null;

      // Tentar obter vídeo e ��udio primeiro
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: hasVideo
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              }
            : false,
          audio: hasAudio
            ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            : false,
        });
        console.log("Stream obtido com sucesso:", {
          video: stream.getVideoTracks().length > 0,
          audio: stream.getAudioTracks().length > 0,
        });
      } catch (videoError) {
        console.warn(
          "Falha ao obter vídeo e áudio, tentando apenas áudio:",
          videoError,
        );

        // Fallback: tentar apenas áudio
        if (hasAudio) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
            console.log("Stream de áudio obtido com sucesso");
          } catch (audioError) {
            console.error("Falha ao obter áudio:", audioError);
            throw new Error(
              "Não foi possível acessar o microfone. Verifique as permissões do navegador.",
            );
          }
        } else {
          throw new Error("Nenhum dispositivo de áudio disponível.");
        }
      }

      if (!stream) {
        throw new Error("Não foi possível obter stream de mídia.");
      }

      localStreamRef.current = stream;
      setCallState((prev) => ({
        ...prev,
        localStream: stream,
        isInCall: true,
        roomId,
        connectionState: "connected",
        isVideoEnabled: stream.getVideoTracks().length > 0,
        isAudioEnabled: stream.getAudioTracks().length > 0,
      }));

      // Entrar na sala via Socket.IO como host
      if (socketRef.current) {
        socketRef.current.emit("join-room", roomId);
        setIsHost(true); // Definir como host quando cria/entra diretamente na sala
      }
    } catch (error) {
      console.error("Erro ao entrar na sala:", error);
      setCallState((prev) => ({ ...prev, connectionState: "failed" }));

      // Fornecer mensagens de erro mais específicas
      if (error instanceof Error) {
        if (
          error.name === "NotFoundError" ||
          error.message.includes("Requested device not found")
        ) {
          throw new Error(
            "Dispositivo n��o encontrado. Verifique se sua câmera e microfone estão conectados e funcionando.",
          );
        } else if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          throw new Error(
            "Permissão negada. Clique no ícone de câmera na barra de endereços e permita o acesso à câmera e microfone.",
          );
        } else if (error.name === "NotReadableError") {
          throw new Error(
            "Dispositivo em uso. Feche outros aplicativos que possam estar usando sua câmera ou microfone.",
          );
        } else if (error.name === "OverconstrainedError") {
          throw new Error(
            "Configurações de mídia não suportadas pelo dispositivo.",
          );
        } else if (error.name === "SecurityError") {
          throw new Error(
            "Erro de segurança. Use HTTPS para acessar a câmera e microfone.",
          );
        }
      }

      throw error;
    }
  }, []);

  const requestJoinRoom = useCallback(
    async (roomId: string, userName?: string) => {
      try {
        setCallState((prev) => ({ ...prev, connectionState: "connecting" }));

        // Verificar disponibilidade de dispositivos
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some((device) => device.kind === "videoinput");
        const hasAudio = devices.some((device) => device.kind === "audioinput");

        console.log("Dispositivos disponíveis:", { hasVideo, hasAudio });

        if (!hasVideo && !hasAudio) {
          throw new Error(
            "Nenhum dispositivo de mídia encontrado. Verifique se sua câmera e microfone estão conectados.",
          );
        }

        let stream: MediaStream | null = null;

        // Tentar obter vídeo e áudio primeiro
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: hasVideo
              ? {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  frameRate: { ideal: 30 },
                }
              : false,
            audio: hasAudio
              ? {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                }
              : false,
          });
          console.log("Stream obtido com sucesso:", {
            video: stream.getVideoTracks().length > 0,
            audio: stream.getAudioTracks().length > 0,
          });
        } catch (videoError) {
          console.warn(
            "Falha ao obter vídeo e áudio, tentando apenas áudio:",
            videoError,
          );

          // Fallback: tentar apenas áudio
          if (hasAudio) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
              });
              console.log("Stream de áudio obtido com sucesso");
            } catch (audioError) {
              console.error("Falha ao obter áudio:", audioError);
              throw new Error(
                "Não foi possível acessar o microfone. Verifique as permissões do navegador.",
              );
            }
          } else {
            throw new Error("Nenhum dispositivo de áudio disponível.");
          }
        }

        if (!stream) {
          throw new Error("Não foi possível obter stream de mídia.");
        }

        localStreamRef.current = stream;
        setCallState((prev) => ({
          ...prev,
          localStream: stream,
          roomId,
          isVideoEnabled: stream.getVideoTracks().length > 0,
          isAudioEnabled: stream.getAudioTracks().length > 0,
        }));

        // Solicitar entrada na sala via Socket.IO
        if (socketRef.current) {
          socketRef.current.emit("request-join-room", { roomId, userName });
          setIsHost(false); // Não é host quando solicita entrada
        }

        // Aguardar aprovação...
        if (onNotification) {
          onNotification(
            "info",
            "Aguardando Aprovação",
            "Solicitação enviada para o host da sala.",
          );
        }

        // Listener para aprovação
        const handleApproval = () => {
          setCallState((prev) => ({
            ...prev,
            isInCall: true,
            connectionState: "connected",
          }));
          socketRef.current?.off("join-approved", handleApproval);
        };

        const handleRejection = () => {
          // Limpar stream se rejeitado
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
          }
          setCallState((prev) => ({
            ...prev,
            localStream: null,
            roomId: null,
            connectionState: "failed",
          }));
          socketRef.current?.off("join-rejected", handleRejection);
        };

        socketRef.current?.on("join-approved", handleApproval);
        socketRef.current?.on("join-rejected", handleRejection);
      } catch (error) {
        console.error("Erro ao solicitar entrada na sala:", error);
        setCallState((prev) => ({ ...prev, connectionState: "failed" }));

        // Fornecer mensagens de erro mais específicas
        if (error instanceof Error) {
          if (
            error.name === "NotFoundError" ||
            error.message.includes("Requested device not found")
          ) {
            throw new Error(
              "Dispositivo não encontrado. Verifique se sua câmera e microfone estão conectados e funcionando.",
            );
          } else if (
            error.name === "NotAllowedError" ||
            error.name === "PermissionDeniedError"
          ) {
            throw new Error(
              "Permissão negada. Clique no ícone de câmera na barra de endereços e permita o acesso à câmera e microfone.",
            );
          } else if (error.name === "NotReadableError") {
            throw new Error(
              "Dispositivo em uso. Feche outros aplicativos que possam estar usando sua câmera ou microfone.",
            );
          } else if (error.name === "OverconstrainedError") {
            throw new Error(
              "Configurações de mídia não suportadas pelo dispositivo.",
            );
          } else if (error.name === "SecurityError") {
            throw new Error(
              "Erro de segurança. Use HTTPS para acessar a câmera e microfone.",
            );
          }
        }

        throw error;
      }
    },
    [onNotification],
  );

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newState = audioTrack.enabled;

        setCallState((prev) => ({
          ...prev,
          isAudioEnabled: newState,
        }));

        // Emit state change to other participants
        if (socketRef.current && callState.roomId) {
          socketRef.current.emit("participant-state-change", {
            roomId: callState.roomId,
            isAudioEnabled: newState,
            isVideoEnabled: callState.isVideoEnabled,
          });
        }
      }
    }
  }, [callState.roomId, callState.isVideoEnabled]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState((prev) => ({
          ...prev,
          isVideoEnabled: videoTrack.enabled,
        }));
      }
    }
  }, []);

  const checkScreenShareSupport = useCallback(() => {
    // Verificar se a API de compartilhamento de tela está disponível
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      return { supported: false, reason: "API não suportada pelo navegador" };
    }

    // Verificar se estamos em contexto seguro (HTTPS ou localhost)
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      return { supported: false, reason: "Requer HTTPS para funcionar" };
    }

    return { supported: true, reason: null };
  }, []);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!callState.isScreenSharing) {
        // Verificar suporte antes de tentar
        const support = checkScreenShareSupport();
        if (!support.supported) {
          throw new Error(
            `Compartilhamento de tela não disponível: ${support.reason}`,
          );
        }

        let screenStream: MediaStream;

        try {
          // Tentar obter compartilhamento de tela
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              mediaSource: "screen",
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 },
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch (displayError) {
          console.warn(
            "Falha ao obter áudio da tela, tentando apenas vídeo:",
            displayError,
          );

          // Fallback: tentar apenas vídeo
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              mediaSource: "screen",
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 },
            },
            audio: false,
          });
        }

        // Verificar se conseguimos o stream
        if (!screenStream || screenStream.getVideoTracks().length === 0) {
          throw new Error(
            "Não foi possível obter stream de compartilhamento de tela",
          );
        }

        const videoTrack = screenStream.getVideoTracks()[0];

        // Substituir track de vídeo em todas as conexões peer
        peerConnectionsRef.current.forEach((peerConnection) => {
          const sender = peerConnection
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(videoTrack).catch((err) => {
              console.warn("Erro ao substituir track de vídeo:", err);
            });
          }
        });

        // Atualizar stream local
        if (localStreamRef.current) {
          const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldVideoTrack) {
            localStreamRef.current.removeTrack(oldVideoTrack);
            oldVideoTrack.stop();
          }
          localStreamRef.current.addTrack(videoTrack);
        }

        setCallState((prev) => ({ ...prev, isScreenSharing: true }));

        // Notificar sucesso
        if (onNotification) {
          onNotification(
            "success",
            "Compartilhamento Iniciado",
            "Sua tela está sendo compartilhada com os participantes",
          );
        }

        // Parar compartilhamento quando o usuário para ou a tela é fechada
        videoTrack.onended = async () => {
          console.log("Compartilhamento de tela finalizado pelo usuário");

          try {
            // Voltar para câmera original
            const originalStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });

            const newVideoTrack = originalStream.getVideoTracks()[0];

            // Substituir de volta para câmera
            peerConnectionsRef.current.forEach((peerConnection) => {
              const sender = peerConnection
                .getSenders()
                .find((s) => s.track && s.track.kind === "video");
              if (sender) {
                sender.replaceTrack(newVideoTrack).catch((err) => {
                  console.warn("Erro ao voltar para câmera:", err);
                });
              }
            });

            // Atualizar stream local
            if (localStreamRef.current) {
              const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
              if (oldVideoTrack) {
                localStreamRef.current.removeTrack(oldVideoTrack);
              }
              localStreamRef.current.addTrack(newVideoTrack);
            }
          } catch (error) {
            console.warn(
              "Erro ao voltar para câmera após compartilhamento:",
              error,
            );
          }

          setCallState((prev) => ({ ...prev, isScreenSharing: false }));

          // Notificar fim do compartilhamento
          if (onNotification) {
            onNotification(
              "info",
              "Compartilhamento Finalizado",
              "Compartilhamento de tela foi interrompido",
            );
          }
        };
      } else {
        // Parar compartilhamento manualmente
        if (localStreamRef.current) {
          const screenTrack = localStreamRef.current.getVideoTracks()[0];
          if (screenTrack) {
            screenTrack.stop(); // Isso irá disparar o evento onended
          }
        }
      }
    } catch (error) {
      console.error("Erro ao compartilhar tela:", error);

      // Mensagens de erro específicas
      let errorMessage = "Erro desconhecido ao compartilhar tela";

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage =
            'Permissão negada para compartilhamento de tela. Clique em "Permitir" quando solicitado.';
        } else if (error.name === "NotFoundError") {
          errorMessage = "Nenhuma tela disponível para compartilhamento.";
        } else if (error.name === "NotReadableError") {
          errorMessage =
            "Não foi possível acessar a tela. Verifique se não há outros aplicativos usando o recurso.";
        } else if (error.name === "OverconstrainedError") {
          errorMessage =
            "Configurações de compartilhamento não suportadas pelo sistema.";
        } else if (
          error.name === "SecurityError" ||
          error.message.includes("permissions policy")
        ) {
          errorMessage =
            "Compartilhamento de tela bloqueado por política de segurança. Recarregue a página ou use HTTPS.";
        } else if (error.name === "AbortError") {
          errorMessage = "Compartilhamento de tela cancelado pelo usu��rio.";
        } else {
          errorMessage = error.message;
        }
      }

      // Mostrar erro para o usuário via notificação
      if (onNotification) {
        onNotification(
          "error",
          "Erro no Compartilhamento de Tela",
          errorMessage,
        );
      } else {
        console.error("Erro no compartilhamento de tela:", errorMessage);
      }

      setCallState((prev) => ({ ...prev, isScreenSharing: false }));
    }
  }, [callState.isScreenSharing, checkScreenShareSupport]);

  const endCall = useCallback(() => {
    // Parar todas as tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Fechar todas as conexões peer
    peerConnectionsRef.current.forEach((peerConnection) => {
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
      connectionState: "connected",
    });
    setIsHost(false);
  }, []);

  return {
    ...callState,
    joinRoom,
    requestJoinRoom,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    endCall,
    socket: socketRef.current,
    isHost,
    peerConnections: peerConnectionsRef.current,
  };
};
