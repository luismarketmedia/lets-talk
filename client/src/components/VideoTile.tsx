import React, { useRef, useEffect } from "react";
import { Mic, MicOff, User } from "lucide-react";
import { cn } from "../lib/utils";

interface VideoTileProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  participantName?: string;
  className?: string;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  isLocal = false,
  isMuted = false,
  isVideoEnabled = true,
  participantName,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={cn(
        "relative bg-gray-900 rounded-xl overflow-hidden shadow-lg",
        "border-2 border-transparent hover:border-primary-300 transition-colors",
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

          {/* Indicador de áudio */}
          <div className="flex items-center space-x-2">
            {isMuted ? (
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <MicOff className="w-3 h-3 text-white" />
              </div>
            ) : (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Mic className="w-3 h-3 text-white" />
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
