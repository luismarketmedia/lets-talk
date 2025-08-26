import React, { useState } from "react";
import {
  Circle,
  Square,
  Pause,
  Play,
  Camera,
  Download,
  Mic,
  Video,
  Settings,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { useRecording, RecordingMode } from "../hooks/useRecording";
import { useScreenshot } from "../hooks/useScreenshot";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface RecordingControlsProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  className?: string;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  localStream,
  remoteStreams,
  className,
}) => {
  const recording = useRecording();
  const screenshot = useScreenshot();
  const [recordingMode, setRecordingMode] = useState<RecordingMode>("video");
  const [showSettings, setShowSettings] = useState(false);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotSuccess, setScreenshotSuccess] = useState(false);

  const handleStartRecording = async () => {
    try {
      await recording.startRecording(localStream, remoteStreams, {
        mode: recordingMode,
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000,
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Erro ao iniciar gravação. Verifique as permissões de mídia.");
    }
  };

  const handleTakeScreenshot = async () => {
    setScreenshotLoading(true);
    try {
      await screenshot.takeAndDownloadScreenshot("video-grid");
      setScreenshotSuccess(true);
      setTimeout(() => setScreenshotSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to take screenshot:", error);
      alert("Erro ao capturar screenshot.");
    } finally {
      setScreenshotLoading(false);
    }
  };

  const getRecordingButtonIcon = () => {
    if (recording.isPaused) return Play;
    if (recording.isRecording) return Pause;
    return Circle;
  };

  const getRecordingButtonAction = () => {
    if (recording.isPaused) return recording.resumeRecording;
    if (recording.isRecording) return recording.pauseRecording;
    return handleStartRecording;
  };

  const RecordingIcon = getRecordingButtonIcon();

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Recording Status Display */}
      {(recording.isRecording || recording.isPaused || recording.isStopped) && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              recording.isRecording
                ? "bg-red-500 animate-pulse"
                : "bg-gray-400",
            )}
          />
          <span className="text-sm font-medium text-red-700">
            {recording.formatDuration(recording.recordingInfo.duration)}
          </span>
          <span className="text-xs text-red-600">
            {recording.formatFileSize(recording.recordingInfo.fileSize)}
          </span>
          <span className="text-xs text-red-600">
            {recording.recordingInfo.mode === "audio-only" ? "🎵" : "🎥"}
          </span>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center space-x-1">
        {/* Start/Pause/Resume Recording */}
        <Button
          variant={recording.isRecording ? "destructive" : "default"}
          size="icon"
          onClick={getRecordingButtonAction()}
          disabled={!localStream}
          className={cn(
            "w-10 h-10 rounded-full transition-all duration-200",
            recording.isRecording && "animate-pulse",
            recording.isPaused && "bg-yellow-500 hover:bg-yellow-600",
          )}
          title={
            recording.isPaused
              ? "Retomar gravação"
              : recording.isRecording
                ? "Pausar gravação"
                : `Iniciar gravação (${recordingMode === "audio-only" ? "Apenas áudio" : "Vídeo + Áudio"})`
          }
        >
          <RecordingIcon className="w-4 h-4" />
        </Button>

        {/* Stop Recording */}
        {(recording.isRecording || recording.isPaused) && (
          <Button
            variant="outline"
            size="icon"
            onClick={recording.stopRecording}
            className="w-10 h-10 rounded-full"
            title="Parar gravação"
          >
            <Square className="w-4 h-4" />
          </Button>
        )}

        {/* Download Recording */}
        {recording.isStopped && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => recording.downloadRecording()}
            className="w-10 h-10 rounded-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            title="Baixar gravação"
          >
            <Download className="w-4 h-4" />
          </Button>
        )}

        {/* Screenshot */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleTakeScreenshot}
          disabled={screenshotLoading}
          className={cn(
            "w-10 h-10 rounded-full transition-all duration-200",
            screenshotSuccess && "bg-green-50 border-green-200 text-green-700",
          )}
          title="Capturar screenshot"
        >
          {screenshotLoading ? (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          ) : screenshotSuccess ? (
            <Check className="w-4 h-4" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </Button>

        {/* Recording Settings */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full"
              title="Configurações de gravação"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Circle className="w-5 h-5 text-red-500" />
                <span>Configurações de Gravação</span>
              </DialogTitle>
              <DialogDescription>
                Configure como deseja gravar a chamada
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Recording Mode */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Modo de Gravação
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="recordingMode"
                      value="video"
                      checked={recordingMode === "video"}
                      onChange={(e) =>
                        setRecordingMode(e.target.value as RecordingMode)
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex items-center space-x-2">
                      <Video className="w-4 h-4" />
                      <span className="text-sm">Vídeo + Áudio</span>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="recordingMode"
                      value="audio-only"
                      checked={recordingMode === "audio-only"}
                      onChange={(e) =>
                        setRecordingMode(e.target.value as RecordingMode)
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex items-center space-x-2">
                      <Mic className="w-4 h-4" />
                      <span className="text-sm">Apenas Áudio</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">
                      Informações sobre gravação:
                    </p>
                    <ul className="text-xs space-y-1">
                      <li>
                        • A gravação é feita localmente no seu dispositivo
                      </li>
                      <li>• Inclui áudio de todos os participantes</li>
                      <li>
                        • Formato: WebM (compatível com navegadores modernos)
                      </li>
                      <li>
                        •{" "}
                        {recordingMode === "audio-only"
                          ? "Arquivo menor, apenas áudio"
                          : "Inclui vídeo de todos os participantes"}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button onClick={() => setShowSettings(false)} className="w-full">
                Salvar Configurações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
