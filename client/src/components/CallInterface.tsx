import React, { useState } from "react";
import { Users, Copy, Check } from "lucide-react";
import { Socket } from "socket.io-client";
import { VideoTile } from "./VideoTile";
import { MediaControls } from "./MediaControls";
import { AudioDeviceModal } from "./AudioDeviceModal";
import { DeviceTestModal } from "./DeviceTestModal";
import { Chat } from "./Chat";
import { JoinApproval } from "./JoinApproval";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

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
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
}) => {
  const [copied, setCopied] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const remoteStreamArray = Array.from(remoteStreams.entries());
  const totalParticipants = 1 + remoteStreamArray.length; // Local + remotes

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Erro ao copiar código da sala:", error);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
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

            {/* Código da sala */}
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-600">Sala:</span>
                <span className="text-sm font-mono font-medium text-gray-900">
                  {roomId}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyRoomId}
                className="flex items-center space-x-2"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {copied ? "Copiado!" : "Copiar código"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Grade de vídeos */}
      <div className="max-w-6xl mx-auto mb-20">
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
          {remoteStreamArray.map(([userId, stream], index) => (
            <VideoTile
              key={userId}
              stream={stream}
              isLocal={false}
              participantName={`Participante ${index + 1}`}
              className={getVideoHeight()}
            />
          ))}
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

      {/* Controles de mídia */}
      <MediaControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        onToggleAudio={onToggleAudio}
        onToggleVideo={onToggleVideo}
        onToggleScreenShare={onToggleScreenShare}
        onEndCall={onEndCall}
        onOpenAudioSettings={() => setShowAudioModal(true)}
        onOpenDeviceTest={() => setShowTestModal(true)}
      />

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
    </div>
  );
};
