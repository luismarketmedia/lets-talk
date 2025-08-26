import React, { useState, useEffect } from "react";
import { Users, Copy, Check, AlertTriangle } from "lucide-react";
import { Socket } from "socket.io-client";
import { VideoGrid } from "./VideoGrid";
import { ViewModeSelector, useViewMode } from "./ViewModeSelector";
import { PollModal } from "./PollModal";
import { SimpleReactionsModal } from "./SimpleReactionsModal";
import { MediaControls } from "./MediaControls";
import { AudioDeviceModal } from "./AudioDeviceModal";
import { DeviceTestModal } from "./DeviceTestModal";
import { AdvancedMediaControls } from "./AdvancedMediaControls";
import { ConnectionIndicator } from "./ConnectionIndicator";
import {
  ParticipantManagerModal,
  useParticipantManager,
} from "./ParticipantManagerModal";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { useAdvancedMediaControls } from "../hooks/useAdvancedMediaControls";
import { useConnectionMonitor } from "../hooks/useConnectionMonitor";
import { useSpeakerDetection } from "../hooks/useSpeakerDetection";

interface CallInterfaceProps {
  roomId: string;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  socket: Socket | null;
  isHost: boolean;
  userName?: string;
  peerConnections: Map<string, RTCPeerConnection>;
  participantStates: Map<
    string,
    { isAudioEnabled: boolean; isVideoEnabled: boolean }
  >;
  participantNames: Map<string, string>;
  screenSharingParticipant: string | null;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

export const CallInterface: React.FC<CallInterfaceProps> = ({
  roomId,
  localStream,
  remoteStreams,
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  socket,
  isHost,
  userName = "Você",
  peerConnections,
  participantStates,
  participantNames,
  screenSharingParticipant,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyMethod, setCopyMethod] = useState<
    "clipboard" | "fallback" | "manual"
  >("clipboard");
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [showClipboardWarning, setShowClipboardWarning] = useState(false);

  // Participant manager modal
  const participantManager = useParticipantManager(socket, roomId, isHost);
  const [showParticipantModal, setShowParticipantModal] = useState(false);

  // View mode management
  const viewModeControls = useViewMode("gallery");

  // Speaker detection
  const speakerInfo = useSpeakerDetection({
    remoteStreams,
    localStream,
    threshold: 25,
    updateInterval: 100,
  });

  // Poll modal
  const [showPollModal, setShowPollModal] = useState(false);

  // Reactions modal
  const [showReactionsModal, setShowReactionsModal] = useState(false);

  // Hand raise state
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState(new Map<string, { name: string; timestamp: Date }>());

  // Reactions state
  const [recentReactions, setRecentReactions] = useState<any[]>([]);

  // Auto-open participant modal when there are pending requests
  useEffect(() => {
    if (participantManager.pendingCount > 0 && !showParticipantModal) {
      setShowParticipantModal(true);
    }
  }, [participantManager.pendingCount, showParticipantModal]);

  // Hand raise handler
  const handleToggleHandRaise = () => {
    if (!socket || !roomId) return;

    const newState = !isHandRaised;
    setIsHandRaised(newState);

    socket.emit('hand-raise', {
      roomId,
      isRaised: newState,
      participantName: userName,
    });
  };

  // Handle reactions and hand raise events from other participants
  useEffect(() => {
    if (!socket) return;

    const handleReaction = (data: any) => {
      const newReaction = {
        id: `${Date.now()}-${Math.random()}`,
        emoji: data.emoji,
        name: data.name,
        participantId: data.participantId,
        participantName: data.participantName,
        timestamp: new Date(),
      };

      setRecentReactions(prev => [...prev, newReaction]);

      // Remove reaction after 3 seconds
      setTimeout(() => {
        setRecentReactions(prev => prev.filter(r => r.id !== newReaction.id));
      }, 3000);
    };

    const handleHandRaise = (data: any) => {
      if (data.isRaised) {
        setRaisedHands(prev => new Map(prev.set(data.participantId, {
          name: data.participantName,
          timestamp: new Date(),
        })));
      } else {
        setRaisedHands(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.participantId);
          return newMap;
        });
      }
    };

    socket.on('reaction', handleReaction);
    socket.on('hand-raise', handleHandRaise);

    return () => {
      socket.off('reaction', handleReaction);
      socket.off('hand-raise', handleHandRaise);
    };
  }, [socket]);
  const remoteStreamArray = Array.from(remoteStreams.entries());
  const totalParticipants = 1 + remoteStreamArray.length; // Local + remotes

  // Advanced media controls
  const advancedControls = useAdvancedMediaControls({
    localStream,
    onVideoQualityChange: (quality) => {
      console.log("Video quality changed to:", quality);
      // Here you would implement actual video quality change
    },
  });

  // Connection monitoring
  const connectionStats = useConnectionMonitor({
    peerConnections,
    enabled: totalParticipants > 1, // Only monitor when there are remote participants
  });

  useEffect(() => {
    // Detectar se estamos em iframe
    const inIframe = window !== window.top;
    setIsInIframe(inIframe);

    // Detectar se clipboard API está disponível
    const hasClipboard = navigator.clipboard && window.isSecureContext;

    // Mostrar aviso se estamos em iframe e pode ter restrições
    if (inIframe && !hasClipboard) {
      setShowClipboardWarning(true);
    }
  }, []);

  const copyRoomId = async () => {
    try {
      // Tentar usar Clipboard API moderna primeiro
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(roomId);
        setCopyMethod("clipboard");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      // Fallback 1: Método de seleção de texto (funciona na maioria dos ambientes)
      const textArea = document.createElement("textarea");
      textArea.value = roomId;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        setCopyMethod("fallback");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      // Fallback 2: Mostrar prompt para cópia manual
      fallbackCopyPrompt();
    } catch (error) {
      console.warn("Clipboard API bloqueada, usando fallback:", error);

      // Se chegou aqui, tentar fallback de seleção
      try {
        const textArea = document.createElement("textarea");
        textArea.value = roomId;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (successful) {
          setCopyMethod("fallback");
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          fallbackCopyPrompt();
        }
      } catch (fallbackError) {
        console.warn("Fallback de seleção também falhou:", fallbackError);
        fallbackCopyPrompt();
      }
    }
  };

  const fallbackCopyPrompt = () => {
    // Mostrar aviso sobre restrições se aplicável
    if (isInIframe) {
      setShowClipboardWarning(true);
    }

    // Método final: mostrar prompt para cópia manual
    if (window.prompt) {
      window.prompt(
        "Ambiente restrito detectado. Copie o código manualmente (Ctrl+C / Cmd+C):",
        roomId,
      );
    } else {
      // Se nem prompt funcionar, mostrar alert
      alert(
        `Código da sala: ${roomId}\n\nAmbiente com restrições - Copie manualmente este código.`,
      );
    }

    // Simular "copied" por feedback visual
    setCopyMethod("manual");
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col" data-call-interface>
      {/* Scrollable main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          {/* Header */}
          <div className="max-w-6xl mx-auto mb-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 mb-1">
                      Chamada em Andamento
                    </h1>
                    <div className="flex items-center space-x-4">
                      <p className="text-sm font-medium text-gray-600">
                        {totalParticipants} participante
                        {totalParticipants !== 1 ? "s" : ""} conectado
                        {totalParticipants !== 1 ? "s" : ""}
                      </p>
                      {screenSharingParticipant && (
                        <div className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          <span>🖥️</span>
                          <span>
                            {participantNames.get(screenSharingParticipant) ||
                              "Participante"}{" "}
                            está compartilhando
                          </span>
                        </div>
                      )}
                      {/* Sempre mostrar indicador de conexão quando em chamada */}
                      <ConnectionIndicator
                        quality={connectionStats.quality}
                        rtt={connectionStats.rtt}
                        bandwidth={connectionStats.bandwidth}
                      />
                      {/* Botão para gerenciar participantes */}
                      {isHost && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowParticipantModal(true)}
                          className="relative flex items-center space-x-2"
                        >
                          <Users className="w-4 h-4" />
                          <span>Gerenciar</span>
                          {participantManager.pendingCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                              {participantManager.pendingCount}
                            </span>
                          )}
                        </Button>
                      )}
                      {/* Seletor de modo de visualização */}
                      <ViewModeSelector
                        currentMode={viewModeControls.viewMode}
                        onModeChange={viewModeControls.changeViewMode}
                        participantCount={totalParticipants}
                        activeSpeaker={speakerInfo.activeSpeaker}
                      />
                    </div>
                  </div>
                </div>

                {/* Código da sala */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 bg-gray-100 rounded-xl px-4 py-2 border">
                    <span className="text-sm font-medium text-gray-700">
                      ID da Sala:
                    </span>
                    <span
                      className="text-sm font-mono font-bold text-blue-600 select-all cursor-text px-2 py-1 rounded-lg bg-blue-50 border border-blue-200"
                      title="Clique para selecionar e copiar com Ctrl+C"
                    >
                      {roomId}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyRoomId}
                    className={cn(
                      "flex items-center space-x-2 font-medium",
                      copied && copyMethod === "manual"
                        ? "border-yellow-400 bg-yellow-50 text-yellow-700"
                        : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
                    )}
                  >
                    {copied ? (
                      copyMethod === "manual" ? (
                        <Copy className="w-4 h-4" />
                      ) : (
                        <Check className="w-4 h-4 text-green-600" />
                      )
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>
                      {copied
                        ? copyMethod === "manual"
                          ? "Use Ctrl+C"
                          : "Copiado!"
                        : "Copiar"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Aviso sobre restri��ões de clipboard */}
          {showClipboardWarning && (
            <div className="max-w-6xl mx-auto mb-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-800 mb-1">
                      Restrições de Ambiente Detectadas
                    </h3>
                    <p className="text-sm text-yellow-700 mb-2">
                      A cópia automática pode não funcionar neste ambiente. Use
                      os métodos alternativos:
                    </p>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>
                        • <strong>Seleção manual:</strong> Clique no código e
                        copie com Ctrl+C
                      </li>
                      <li>
                        • <strong>Prompt do navegador:</strong> Use a janela de
                        prompt quando aparecer
                      </li>
                      <li>
                        • <strong>Compartilhamento:</strong> Compartilhe
                        diretamente a URL da página
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => setShowClipboardWarning(false)}
                    className="text-yellow-400 hover:text-yellow-600 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Grade de vídeos */}
          <div className="max-w-6xl mx-auto mb-8">
            <VideoGrid
              viewMode={viewModeControls.viewMode}
              localStream={localStream}
              remoteStreams={remoteStreams}
              participantStates={participantStates}
              participantNames={participantNames}
              peerConnections={peerConnections}
              screenSharingParticipant={screenSharingParticipant}
              activeSpeaker={speakerInfo.activeSpeaker}
              spotlightParticipant={viewModeControls.spotlightParticipant}
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
              onParticipantClick={(participantId) => {
                if (
                  viewModeControls.viewMode === "spotlight" ||
                  participantId !== viewModeControls.spotlightParticipant
                ) {
                  viewModeControls.setSpotlight(participantId);
                }
              }}
            />

            {/* Mensagem quando não há participantes */}
            {totalParticipants === 1 && (
              <div className="text-center mt-8 p-6 bg-white rounded-xl border border-gray-200">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aguardando participantes
                </h3>
                <p className="text-gray-600 mb-4">
                  Compartilhe o código da sala para que outros possam participar
                </p>
                <Button
                  onClick={copyRoomId}
                  className="inline-flex items-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar código: {roomId}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controles de mídia e chat fixos na parte inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm border-t border-gray-200 p-4 z-50">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Floating reactions display */}
          {recentReactions.length > 0 && (
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 pointer-events-none z-40">
              <div className="flex space-x-2">
                {recentReactions.slice(-5).map((reaction) => (
                  <div
                    key={reaction.id}
                    className="animate-bounce text-4xl"
                    style={{
                      animationDelay: `${Math.random() * 0.5}s`,
                      animationDuration: '2s',
                    }}
                  >
                    {reaction.emoji}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center">
            {/* Controles de mídia com chat integrado */}
            <MediaControls
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
              isScreenSharing={isScreenSharing}
              isTemporarilyMuted={advancedControls.isTemporarilyMuted}
              onToggleAudio={onToggleAudio}
              onToggleVideo={onToggleVideo}
              onToggleScreenShare={onToggleScreenShare}
              onEndCall={onEndCall}
              onOpenAudioSettings={() => setShowAudioModal(true)}
              onOpenDeviceTest={() => setShowTestModal(true)}
              onOpenAdvancedControls={() => setShowAdvancedControls(true)}
              socket={socket}
              roomId={roomId}
              userName={userName}
              participantCount={totalParticipants}
              onOpenReactions={() => setShowReactionsModal(true)}
              onToggleHandRaise={handleToggleHandRaise}
              isHandRaised={isHandRaised}
              raisedHandsCount={raisedHands.size}
              onOpenVoting={() => setShowPollModal(true)}
              localStream={localStream}
              remoteStreams={remoteStreams}
              isScreenSharingForTools={isScreenSharing}
            />
          </div>
        </div>
      </div>

      {/* Modais */}
      <AudioDeviceModal
        isOpen={showAudioModal}
        onClose={() => setShowAudioModal(false)}
        onDeviceChange={(input, output) => {
          console.log("Dispositivos selecionados durante chamada:", {
            input,
            output,
          });
          // Aqui você pode atualizar os dispositivos durante a chamada
        }}
      />

      <DeviceTestModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
      />

      <AdvancedMediaControls
        isVisible={showAdvancedControls}
        onClose={() => setShowAdvancedControls(false)}
        microphoneVolume={advancedControls.microphoneVolume}
        speakerVolume={advancedControls.speakerVolume}
        videoQuality={advancedControls.videoQuality}
        dataSavingMode={advancedControls.dataSavingMode}
        onMicrophoneVolumeChange={advancedControls.handleMicrophoneVolumeChange}
        onSpeakerVolumeChange={advancedControls.handleSpeakerVolumeChange}
        onVideoQualityChange={advancedControls.handleVideoQualityChange}
        onDataSavingModeToggle={advancedControls.handleDataSavingModeToggle}
        connectionQuality={
          connectionStats.quality === "unknown"
            ? undefined
            : connectionStats.quality
        }
        bandwidth={connectionStats.bandwidth}
      />

      {/* Participant Manager Modal */}
      <ParticipantManagerModal
        socket={socket}
        roomId={roomId}
        isHost={isHost}
        isOpen={showParticipantModal}
        onClose={() => setShowParticipantModal(false)}
        participants={participantNames}
        participantStates={participantStates}
        localSocketId={socket?.id}
      />

      {/* Reactions Modal */}
      <SimpleReactionsModal
        isOpen={showReactionsModal}
        onClose={() => setShowReactionsModal(false)}
        socket={socket}
        roomId={roomId}
        userName={userName}
      />

      {/* Poll Modal */}
      <PollModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        socket={socket}
        roomId={roomId}
        userName={userName}
        isHost={isHost}
        participantCount={totalParticipants}
      />
    </div>
  );
};
