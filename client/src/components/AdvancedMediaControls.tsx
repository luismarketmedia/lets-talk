import React, { useState, useRef, useEffect } from "react";
import {
  Volume2,
  VolumeX,
  Mic2,
  Speaker,
  Settings,
  Wifi,
  Monitor,
  Zap,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface AdvancedMediaControlsProps {
  isVisible: boolean;
  onClose: () => void;
  microphoneVolume: number;
  speakerVolume: number;
  videoQuality: "360p" | "720p" | "1080p";
  dataSavingMode: boolean;
  onMicrophoneVolumeChange: (volume: number) => void;
  onSpeakerVolumeChange: (volume: number) => void;
  onVideoQualityChange: (quality: "360p" | "720p" | "1080p") => void;
  onDataSavingModeToggle: () => void;
  connectionQuality?: "excellent" | "good" | "fair" | "poor";
  bandwidth?: number;
}

export const AdvancedMediaControls: React.FC<AdvancedMediaControlsProps> = ({
  isVisible,
  onClose,
  microphoneVolume,
  speakerVolume,
  videoQuality,
  dataSavingMode,
  onMicrophoneVolumeChange,
  onSpeakerVolumeChange,
  onVideoQualityChange,
  onDataSavingModeToggle,
  connectionQuality = "good",
  bandwidth = 0,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const getQualityIcon = () => {
    switch (connectionQuality) {
      case "excellent":
        return <Wifi className="w-4 h-4 text-green-500" />;
      case "good":
        return <Wifi className="w-4 h-4 text-green-400" />;
      case "fair":
        return <Wifi className="w-4 h-4 text-yellow-400" />;
      case "poor":
        return <Wifi className="w-4 h-4 text-red-400" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={panelRef}
        className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Controles Avançados</span>
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume Controls */}
        <div className="space-y-6">
          {/* Microphone Volume */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mic2 className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Volume do Microfone
                </span>
              </div>
              <span className="text-sm text-gray-500">{microphoneVolume}%</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={microphoneVolume}
                onChange={(e) =>
                  onMicrophoneVolumeChange(Number(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #0fa3e0 0%, #0fa3e0 ${microphoneVolume}%, #e5e7eb ${microphoneVolume}%, #e5e7eb 100%)`,
                }}
              />
            </div>
          </div>

          {/* Speaker Volume */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Speaker className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Volume dos Alto-falantes
                </span>
              </div>
              <span className="text-sm text-gray-500">{speakerVolume}%</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={speakerVolume}
                onChange={(e) => onSpeakerVolumeChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #0fa3e0 0%, #0fa3e0 ${speakerVolume}%, #e5e7eb ${speakerVolume}%, #e5e7eb 100%)`,
                }}
              />
            </div>
          </div>

          {/* Video Quality */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Qualidade do Vídeo
              </span>
            </div>
            <div className="flex space-x-2">
              {(["360p", "720p", "1080p"] as const).map((quality) => (
                <button
                  key={quality}
                  onClick={() => onVideoQualityChange(quality)}
                  className={cn(
                    "flex-1 px-3 py-2 text-sm rounded-lg border transition-colors",
                    videoQuality === quality
                      ? "bg-primary-500 text-white border-primary-500"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
                  )}
                >
                  {quality}
                </button>
              ))}
            </div>
          </div>

          {/* Data Saving Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-gray-600" />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Economia de Dados
                </span>
                <p className="text-xs text-gray-500">
                  Reduz qualidade para economizar banda
                </p>
              </div>
            </div>
            <button
              onClick={onDataSavingModeToggle}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                dataSavingMode ? "bg-primary-500" : "bg-gray-200",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  dataSavingMode ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>

          {/* Connection Info */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getQualityIcon()}
                <span className="text-sm font-medium text-gray-700">
                  Conexão
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700 capitalize">
                  {connectionQuality === "excellent"
                    ? "Excelente"
                    : connectionQuality === "good"
                      ? "Boa"
                      : connectionQuality === "fair"
                        ? "Regular"
                        : "Ruim"}
                </div>
                {bandwidth > 0 && (
                  <div className="text-xs text-gray-500">
                    {bandwidth > 1000
                      ? `${(bandwidth / 1000).toFixed(1)} Mbps`
                      : `${bandwidth} kbps`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
