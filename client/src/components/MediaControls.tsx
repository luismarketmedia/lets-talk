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
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { useScreenShareSupport } from "../hooks/useScreenShareSupport";

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
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          {/* Controle de Áudio */}
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="icon"
            onClick={onToggleAudio}
            className={cn(
              "w-12 h-12 rounded-full transition-all duration-200",
              isAudioEnabled
                ? "bg-primary-500 hover:bg-primary-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white",
            )}
            title={isAudioEnabled ? "Desativar microfone" : "Ativar microfone"}
          >
            {isAudioEnabled ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </Button>

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
                        🧪 Testar Dispositivos
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
    </div>
  );
};
