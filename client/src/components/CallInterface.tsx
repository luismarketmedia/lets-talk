import React, { useState, useEffect } from "react";
import { Users, Copy, Check, AlertTriangle } from "lucide-react";
import { Socket } from "socket.io-client";
import { VideoTile } from "./VideoTile";
import { MediaControls } from "./MediaControls";
import { AudioDeviceModal } from "./AudioDeviceModal";
import { DeviceTestModal } from "./DeviceTestModal";
import { AdvancedMediaControls } from "./AdvancedMediaControls";
import { Chat } from "./Chat";
import { JoinApproval } from "./JoinApproval";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { useAdvancedMediaControls } from "../hooks/useAdvancedMediaControls";
import { useConnectionMonitor } from "../hooks/useConnectionMonitor";

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

  // Determinar layout da grade
  const getGridClass = () => {
    if (totalParticipants === 1) return "grid-cols-1";
    if (totalParticipants === 2) return "grid-cols-1 lg:grid-cols-2";
    if (totalParticipants <= 4) return "grid-cols-2";
    if (totalParticipants <= 6) return "grid-cols-2 lg:grid-cols-3";
    return "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  };

  const getVideoHeight = () => {
    if (totalParticipants === 1) return "h-[400px] lg:h-[500px]";
    if (totalParticipants === 2) return "h-[300px] lg:h-[400px]";
    if (totalParticipants <= 4) return "h-[200px] lg:h-[300px]";
    return "h-[150px] lg:h-[200px]";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Scrollable main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-28">
          {/* Header */}
          <div className="max-w-6xl mx-auto mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">
                      Chamada em andamento
                    </h1>
                    <p className="text-sm text-gray-600">
                      {totalParticipants} participante
                      {totalParticipants !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Controles e código da sala */}
                <div className="flex items-center space-x-2">
                  {/* Chat */}
                  <Chat
                    socket={socket}
                    roomId={roomId}
                    userName={userName}
                    participantCount={totalParticipants}
                  />

                  <div className="hidden sm:flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-600">Sala:</span>
                    <span
                      className="text-sm font-mono font-medium text-gray-900 select-all cursor-text px-1 py-0.5 rounded bg-white border border-gray-200"
                      title="Clique para selecionar e copiar com Ctrl+C"
                    >
                      {roomId}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyRoomId}
                    className={`flex items-center space-x-2 ${
                      copied && copyMethod === "manual"
                        ? "border-yellow-400 bg-yellow-50"
                        : ""
                    }`}
                  >
                    {copied ? (
                      copyMethod === "manual" ? (
                        <Copy className="w-4 h-4 text-yellow-600" />
                      ) : (
                        <Check className="w-4 h-4 text-green-600" />
                      )
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {copied
                        ? copyMethod === "manual"
                          ? "Use Ctrl+C"
                          : "Copiado!"
                        : "Copiar código"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Aviso sobre restrições de clipboard */}
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

          {/* Sistema de aprovação de entrada */}
          {isHost && (
            <div className="max-w-6xl mx-auto mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <JoinApproval socket={socket} roomId={roomId} isHost={isHost} />
              </div>
            </div>
          )}

          {/* Grade de vídeos */}
          <div className="max-w-6xl mx-auto mb-8">
            <div className={cn("grid gap-4", getGridClass())}>
              {/* Vídeo local */}
              <VideoTile
                stream={localStream}
                isLocal={true}
                isMuted={!isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                participantName="Você"
                className={getVideoHeight()}
              />

              {/* Vídeos remotos */}
              {remoteStreamArray.map(([userId, stream], index) => {
                const participantState = participantStates.get(userId);
                return (
                  <VideoTile
                    key={userId}
                    stream={stream}
                    isLocal={false}
                    isMuted={
                      participantState
                        ? !participantState.isAudioEnabled
                        : false
                    }
                    isVideoEnabled={
                      participantState ? participantState.isVideoEnabled : true
                    }
                    participantName={`Participante ${index + 1}`}
                    className={getVideoHeight()}
                    peerConnection={peerConnections.get(userId) || null}
                  />
                );
              })}
            </div>

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

      {/* Controles de mídia fixos na parte inferior */}
      <div className="fixed bottom-0 left-0 right-0 border-gray-200 p-4 z-50">
        <div className="max-w-6xl mx-auto">
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
          />
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
        connectionQuality="good"
        bandwidth={1500}
      />
    </div>
  );
};
