import React, { useRef, useEffect } from "react";
import { Mic, MicOff, User, Wifi, WifiOff } from "lucide-react";
import { cn } from "../lib/utils";
import { useAudioLevel } from "../hooks/useAudioLevel";
import { useConnectionStats } from "../hooks/useConnectionStats";

interface VideoTileProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  participantName?: string;
  className?: string;
  peerConnection?: RTCPeerConnection | null;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  isLocal = false,
  isMuted = false,
  isVideoEnabled = true,
  participantName,
  className,
  peerConnection = null,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Detect if participant is speaking
  const { audioLevel, isSpeaking } = useAudioLevel({
    stream,
    enabled: !isMuted && !!stream,
    speakingThreshold: 25,
  });

  // Get connection stats for remote participants
  const connectionStats = useConnectionStats({
    peerConnection,
    enabled: !isLocal && !!peerConnection,
  });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case "excellent":
      case "good":
        return <Wifi className="w-3 h-3 text-green-400" />;
      case "fair":
        return <Wifi className="w-3 h-3 text-yellow-400" />;
      case "poor":
        return <Wifi className="w-3 h-3 text-red-400" />;
      default:
        return <WifiOff className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div
      className={cn(
        "relative bg-gray-900 rounded-xl overflow-hidden shadow-lg transition-all duration-200",
        "border-2",
        isSpeaking
          ? "border-green-400 shadow-green-400/30 shadow-lg scale-[1.02]"
          : "border-transparent hover:border-primary-300",
        className,
      )}
    >
      {/* Vídeo */}
      {stream && isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Sempre mutar o vídeo local para evitar feedback
          className="w-full h-full object-cover"
        />
      ) : (
        /* Avatar quando vídeo está desabilitado */
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
        </div>
      )}

      {/* Overlay com informações */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <div className="flex items-center justify-between text-white">
          {/* Nome do participante */}
          <span className="text-sm font-medium truncate">
            {participantName || (isLocal ? "Você" : "Participante")}
          </span>

          {/* Indicadores de áudio e rede */}
          <div className="flex items-center space-x-2">
            {/* Network quality indicator (only for remote participants) */}
            {!isLocal && peerConnection && (
              <div
                className="flex items-center space-x-1 px-1.5 py-0.5 bg-black/40 rounded text-xs"
                title={`RTT: ${connectionStats.rtt}ms | Packet Loss: ${connectionStats.packetLoss}%${connectionStats.bitrate > 0 ? ` | ${connectionStats.bitrate}kbps` : ""}`}
              >
                {getQualityIcon(connectionStats.quality)}
                {connectionStats.rtt > 0 && (
                  <span className="text-white text-xs">
                    {connectionStats.rtt}ms
                  </span>
                )}
              </div>
            )}

            {/* Audio indicator */}
            {isMuted ? (
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <MicOff className="w-3 h-3 text-white" />
              </div>
            ) : (
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200",
                  isSpeaking
                    ? "bg-green-400 animate-pulse shadow-green-400/50 shadow-md"
                    : "bg-green-500",
                )}
              >
                <Mic className="w-3 h-3 text-white" />
              </div>
            )}

            {/* Audio level indicator (only show when speaking and not muted) */}
            {!isMuted && isSpeaking && (
              <div className="flex items-center space-x-0.5">
                <div
                  className="w-0.5 h-2 bg-green-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-0.5 h-3 bg-green-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-0.5 h-2 bg-green-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Indicador de vídeo local */}
      {isLocal && (
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 bg-primary-500 text-white text-xs rounded-full font-medium">
            Você
          </span>
        </div>
      )}
    </div>
  );
};
