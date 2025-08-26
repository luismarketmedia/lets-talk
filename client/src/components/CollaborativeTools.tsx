import React, { useState } from "react";
import { Socket } from "socket.io-client";
import {
  Circle,
  Camera,
  Pen,
  Edit,
  Mic,
  Settings,
  Download,
  Square,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { RecordingControls } from "./RecordingControls";
import { Whiteboard } from "./Whiteboard";
import { ScreenAnnotations } from "./ScreenAnnotations";
import { useAudioOnlyShare } from "../hooks/useAudioOnlyShare";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface CollaborativeToolsProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  socket: Socket | null;
  roomId: string | null;
  userName?: string;
  isScreenSharing: boolean;
  className?: string;
}

export const CollaborativeTools: React.FC<CollaborativeToolsProps> = ({
  localStream,
  remoteStreams,
  socket,
  roomId,
  userName,
  isScreenSharing,
  className,
}) => {
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const audioShare = useAudioOnlyShare();

  const handleToggleAudioShare = async () => {
    try {
      await audioShare.toggleAudioShare({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
      });
    } catch (error) {
      console.error("Failed to toggle audio sharing:", error);
      alert("Erro ao compartilhar áudio. Verifique as permissões.");
    }
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Recording Modal */}
      <Dialog open={showRecordingModal} onOpenChange={setShowRecordingModal}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full transition-all duration-200 hover:bg-gray-100 text-gray-600"
            title="Gravação e Screenshots"
          >
            <Circle className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Circle className="w-5 h-5 text-red-500" />
              <span>Gravação e Screenshots</span>
            </DialogTitle>
            <DialogDescription>
              Grave a chamada ou capture screenshots
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <RecordingControls
              localStream={localStream}
              remoteStreams={remoteStreams}
            />

            {/* Audio-only sharing */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
                <Mic className="w-5 h-5" />
                <span>Compartilhamento de Áudio</span>
              </h3>

              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Compartilhe apenas o áudio do seu dispositivo sem vídeo
                </p>

                <div className="flex items-center space-x-4">
                  <Button
                    variant={
                      audioShare.isAudioSharing ? "destructive" : "default"
                    }
                    onClick={handleToggleAudioShare}
                    className="flex items-center space-x-2"
                  >
                    <Mic className="w-4 h-4" />
                    <span>
                      {audioShare.isAudioSharing
                        ? "Parar Áudio"
                        : "Compartilhar Áudio"}
                    </span>
                  </Button>

                  {audioShare.isAudioSharing && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Compartilhando áudio</span>
                    </div>
                  )}
                </div>

                {audioShare.error && (
                  <p className="text-sm text-red-600">{audioShare.error}</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Whiteboard */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowWhiteboard(true)}
        className="w-12 h-12 rounded-full transition-all duration-200 hover:bg-gray-100 text-gray-600"
        title="Quadro Branco Colaborativo"
      >
        <Edit className="w-5 h-5" />
      </Button>

      <Whiteboard
        isOpen={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
        socket={socket}
        roomId={roomId}
        userName={userName}
      />

      {/* Screen Annotations */}
      {isScreenSharing && (
        <Button
          variant={showAnnotations ? "default" : "ghost"}
          size="icon"
          onClick={() => setShowAnnotations(!showAnnotations)}
          className={cn(
            "w-12 h-12 rounded-full transition-all duration-200",
            showAnnotations
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "hover:bg-gray-100 text-gray-600",
          )}
          title="Anotações na Tela"
        >
          <Pen className="w-5 h-5" />
        </Button>
      )}

      <ScreenAnnotations
        isVisible={showAnnotations}
        onToggle={() => setShowAnnotations(!showAnnotations)}
        socket={socket}
        roomId={roomId}
        userName={userName}
        isScreenSharing={isScreenSharing}
      />
    </div>
  );
};
