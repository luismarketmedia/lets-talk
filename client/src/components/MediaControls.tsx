import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Phone,
  MonitorX,
  Settings,
  Sliders,
  Smile,
  Hand,
  BarChart3,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { useScreenShareSupport } from "../hooks/useScreenShareSupport";
import { Chat } from "./Chat";
import { CollaborativeTools } from "./CollaborativeTools";
import { Socket } from "socket.io-client";

interface MediaControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isTemporarilyMuted?: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  onOpenAudioSettings?: () => void;
  onOpenDeviceTest?: () => void;
  onOpenAdvancedControls?: () => void;
  // Chat props
  socket?: Socket | null;
  roomId?: string | null;
  userName?: string;
  participantCount?: number;
  // Reactions, hand raise, and voting props
  onOpenReactions?: () => void;
  onToggleHandRaise?: () => void;
  isHandRaised?: boolean;
  raisedHandsCount?: number;
  onOpenVoting?: () => void;
  // Collaborative tools props
  localStream?: MediaStream | null;
  remoteStreams?: Map<string, MediaStream>;
  isScreenSharingForTools?: boolean;
}

export const MediaControls: React.FC<MediaControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isTemporarilyMuted = false,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  onOpenAudioSettings,
  onOpenDeviceTest,
  onOpenAdvancedControls,
  socket,
  roomId,
  userName,
  participantCount = 1,
  onOpenReactions,
  onToggleHandRaise,
  isHandRaised = false,
  raisedHandsCount = 0,
  onOpenVoting,
  localStream,
  remoteStreams = new Map(),
  isScreenSharingForTools = false,
}) => {
  const screenShareSupport = useScreenShareSupport();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isSettingsOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isSettingsOpen]);
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 p-4">
      <div className="flex items-center space-x-3">
        {/* Controle de Áudio */}
        <div className="relative">
          <Button
            variant={
              isAudioEnabled && !isTemporarilyMuted ? "default" : "destructive"
            }
            size="icon"
            onClick={onToggleAudio}
            className={cn(
              "w-12 h-12 rounded-full transition-all duration-200",
              isAudioEnabled && !isTemporarilyMuted
                ? "bg-primary-500 hover:bg-primary-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white",
              isTemporarilyMuted && "ring-2 ring-yellow-400 ring-offset-2",
            )}
            title={
              isTemporarilyMuted
                ? "Microfone temporariamente silenciado (Solte ESPAÇO)"
                : isAudioEnabled
                  ? "Desativar microfone"
                  : "Ativar microfone"
            }
          >
            {isAudioEnabled && !isTemporarilyMuted ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </Button>
          {isTemporarilyMuted && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
          )}
        </div>

        {/* Controle de Vídeo */}
        <Button
          variant={isVideoEnabled ? "default" : "destructive"}
          size="icon"
          onClick={onToggleVideo}
          className={cn(
            "w-12 h-12 rounded-full transition-all duration-200",
            isVideoEnabled
              ? "bg-primary-500 hover:bg-primary-600 text-white"
              : "bg-red-500 hover:bg-red-600 text-white",
          )}
          title={isVideoEnabled ? "Desativar câmera" : "Ativar câmera"}
        >
          {isVideoEnabled ? (
            <Video className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
        </Button>

        {/* Compartilhar Tela */}
        <Button
          variant={isScreenSharing ? "default" : "secondary"}
          size="icon"
          onClick={
            screenShareSupport.canAttempt ? onToggleScreenShare : undefined
          }
          disabled={!screenShareSupport.canAttempt}
          className={cn(
            "w-12 h-12 rounded-full transition-all duration-200",
            isScreenSharing
              ? "bg-primary-500 hover:bg-primary-600 text-white"
              : screenShareSupport.canAttempt
                ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
          )}
          title={
            !screenShareSupport.canAttempt
              ? `Compartilhamento indisponível: ${screenShareSupport.reason}`
              : isScreenSharing
                ? "Parar compartilhamento de tela"
                : "Compartilhar tela"
          }
        >
          {!screenShareSupport.canAttempt ? (
            <MonitorX className="w-5 h-5" />
          ) : (
            <Monitor className="w-5 h-5" />
          )}
        </Button>

        {/* Reações */}
        {onOpenReactions && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenReactions}
            className="w-12 h-12 rounded-full transition-all duration-200 hover:bg-gray-100 text-gray-600"
            title="Reações"
          >
            <Smile className="w-5 h-5" />
          </Button>
        )}

        {/* Levantar Mão */}
        {onToggleHandRaise && (
          <div className="relative">
            <Button
              variant={isHandRaised ? "default" : "ghost"}
              size="icon"
              onClick={onToggleHandRaise}
              className={cn(
                "w-12 h-12 rounded-full transition-all duration-200",
                isHandRaised
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                  : "hover:bg-gray-100 text-gray-600"
              )}
              title={isHandRaised ? "Baixar mão" : "Levantar mão"}
            >
              <Hand className={cn("w-5 h-5", isHandRaised && "animate-bounce")} />
            </Button>
            {raisedHandsCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {raisedHandsCount > 9 ? "9+" : raisedHandsCount}
              </span>
            )}
          </div>
        )}

        {/* Votações */}
        {onOpenVoting && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenVoting}
            className="w-12 h-12 rounded-full transition-all duration-200 hover:bg-gray-100 text-gray-600"
            title="Votações"
          >
            <BarChart3 className="w-5 h-5" />
          </Button>
        )}

        {/* Ferramentas Colaborativas */}
        {socket && roomId && (
          <CollaborativeTools
            localStream={localStream}
            remoteStreams={remoteStreams}
            socket={socket}
            roomId={roomId}
            userName={userName}
            isScreenSharing={isScreenSharing}
          />
        )}

        {/* Chat */}
        {socket && roomId && (
          <Chat
            socket={socket}
            roomId={roomId}
            userName={userName}
            participantCount={participantCount}
          />
        )}

        {/* Configurações */}
        {(onOpenAudioSettings || onOpenDeviceTest) && (
          <div className="relative" ref={settingsRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={cn(
                "w-12 h-12 rounded-full transition-all duration-200",
                isSettingsOpen
                  ? "bg-gray-200 text-gray-800"
                  : "hover:bg-gray-100 text-gray-600",
              )}
              title="Configurações de áudio e dispositivos"
              aria-expanded={isSettingsOpen}
              aria-haspopup="menu"
              aria-label="Menu de configurações"
            >
              <Settings className="w-5 h-5" />
            </Button>

            {/* Dropdown */}
            {isSettingsOpen && (
              <div
                className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
                role="menu"
                aria-label="Opções de configuração"
              >
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[250px]">
                  {onOpenAdvancedControls && (
                    <button
                      onClick={() => {
                        onOpenAdvancedControls();
                        setIsSettingsOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors focus:bg-gray-50 focus:outline-none"
                      role="menuitem"
                      tabIndex={0}
                    >
                      <div className="flex items-center space-x-2">
                        <Sliders className="w-4 h-4" />
                        <span>Controles Avançados</span>
                      </div>
                    </button>
                  )}
                  {onOpenAudioSettings && (
                    <button
                      onClick={() => {
                        onOpenAudioSettings();
                        setIsSettingsOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors focus:bg-gray-50 focus:outline-none"
                      role="menuitem"
                      tabIndex={0}
                    >
                      🎤 Configurar Áudio
                    </button>
                  )}
                  {onOpenDeviceTest && (
                    <button
                      onClick={() => {
                        onOpenDeviceTest();
                        setIsSettingsOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors focus:bg-gray-50 focus:outline-none"
                      role="menuitem"
                      tabIndex={0}
                    >
                      �� Testar Dispositivos
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divisor */}
        <div className="w-px h-8 bg-gray-300 mx-2" />

        {/* Encerrar Chamada */}
        <Button
          variant="destructive"
          size="icon"
          onClick={onEndCall}
          className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200"
          title="Encerrar chamada"
        >
          <Phone className="w-5 h-5 rotate-[135deg]" />
        </Button>
      </div>
    </div>
  );
};
