import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Camera,
  Mic,
  Monitor,
  PlayCircle,
  StopCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

type TestStatus = "idle" | "testing" | "success" | "error";

interface DeviceTest {
  camera: TestStatus;
  microphone: TestStatus;
  speakers: TestStatus;
  screenShare: TestStatus;
}

interface DeviceTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceTestModal: React.FC<DeviceTestModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [testStatus, setTestStatus] = useState<DeviceTest>({
    camera: "idle",
    microphone: "idle",
    speakers: "idle",
    screenShare: "idle",
  });

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(
    null,
  );
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState({
    camera: "",
    microphone: "",
    speakers: "",
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (isOpen) {
      loadDeviceInfo();
    } else {
      stopAllTests();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopAllTests();
    };
  }, []);

  const loadDeviceInfo = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const camera = devices.find((d) => d.kind === "videoinput");
      const microphone = devices.find((d) => d.kind === "audioinput");
      const speakers = devices.find((d) => d.kind === "audiooutput");

      setDeviceInfo({
        camera: camera?.label || "Câmera padrão",
        microphone: microphone?.label || "Microfone padrão",
        speakers: speakers?.label || "Alto-falantes padrão",
      });
    } catch (error) {
      console.error("Erro ao carregar informações dos dispositivos:", error);
    }
  };

  const stopAllTests = () => {
    // Parar streams
    cameraStream?.getTracks().forEach((track) => track.stop());
    microphoneStream?.getTracks().forEach((track) => track.stop());
    screenStream?.getTracks().forEach((track) => track.stop());

    // Parar análise de áudio
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    audioContextRef.current?.close();

    // Resetar estados
    setCameraStream(null);
    setMicrophoneStream(null);
    setScreenStream(null);
    setAudioLevel(0);
    setTestStatus({
      camera: "idle",
      microphone: "idle",
      speakers: "idle",
      screenShare: "idle",
    });
  };

  const testCamera = async () => {
    try {
      setTestStatus((prev) => ({ ...prev, camera: "testing" }));

      if (cameraStream) {
        // Parar teste
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
        setTestStatus((prev) => ({ ...prev, camera: "idle" }));
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setTestStatus((prev) => ({ ...prev, camera: "success" }));
    } catch (error) {
      console.error("Erro no teste da câmera:", error);
      setTestStatus((prev) => ({ ...prev, camera: "error" }));
    }
  };

  const testMicrophone = async () => {
    try {
      setTestStatus((prev) => ({ ...prev, microphone: "testing" }));

      if (microphoneStream) {
        // Parar teste
        microphoneStream.getTracks().forEach((track) => track.stop());
        setMicrophoneStream(null);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        audioContextRef.current?.close();
        setAudioLevel(0);
        setTestStatus((prev) => ({ ...prev, microphone: "idle" }));
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophoneStream(stream);

      // Configurar análise de áudio
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      microphone.connect(analyser);
      analyser.fftSize = 256;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const updateLevel = () => {
        if (analyser && microphoneStream) {
          analyser.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          setAudioLevel(average);
          animationRef.current = requestAnimationFrame(updateLevel);
        }
      };

      updateLevel();
      setTestStatus((prev) => ({ ...prev, microphone: "success" }));
    } catch (error) {
      console.error("Erro no teste do microfone:", error);
      setTestStatus((prev) => ({ ...prev, microphone: "error" }));
    }
  };

  const testSpeakers = async () => {
    try {
      setTestStatus((prev) => ({ ...prev, speakers: "testing" }));

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

      oscillator.start();

      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
        setTestStatus((prev) => ({ ...prev, speakers: "success" }));
      }, 2000);
    } catch (error) {
      console.error("Erro no teste dos alto-falantes:", error);
      setTestStatus((prev) => ({ ...prev, speakers: "error" }));
    }
  };

  const testScreenShare = async () => {
    try {
      setTestStatus((prev) => ({ ...prev, screenShare: "testing" }));

      if (screenStream) {
        // Parar teste
        screenStream.getTracks().forEach((track) => track.stop());
        setScreenStream(null);
        setTestStatus((prev) => ({ ...prev, screenShare: "idle" }));
        return;
      }

      // Check if getDisplayMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error("Screen sharing não é suportado neste navegador");
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      setScreenStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setTestStatus((prev) => ({ ...prev, screenShare: "success" }));

      // Parar quando usuário parar o compartilhamento
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        setTestStatus((prev) => ({ ...prev, screenShare: "idle" }));
      };
    } catch (error: any) {
      console.error("Erro no teste de compartilhamento:", error);

      // Handle specific permission errors
      if (error.name === "NotAllowedError") {
        console.warn("Screen sharing blocked by permissions policy - this is normal in iframe environments");
      }

      setTestStatus((prev) => ({ ...prev, screenShare: "error" }));
    }
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case "testing":
        return (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: TestStatus) => {
    switch (status) {
      case "testing":
        return "Testando...";
      case "success":
        return "Funcionando";
      case "error":
        return "Erro";
      default:
        return "Não testado";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <PlayCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Teste de Dispositivos
              </h2>
              <p className="text-sm text-gray-600">
                Verifique o funcionamento de câmera, microfone e áudio
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Preview de Vídeo */}
          <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!cameraStream && !screenStream && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Camera className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">Inicie um teste para ver o preview</p>
                </div>
              </div>
            )}
          </div>

          {/* Testes */}
          <div className="grid gap-4">
            {/* Teste de Câmera */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Camera className="w-5 h-5 text-gray-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Câmera</h3>
                    <p className="text-sm text-gray-500">{deviceInfo.camera}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusIcon(testStatus.camera)}
                  <span className="text-sm text-gray-600">
                    {getStatusText(testStatus.camera)}
                  </span>
                  <Button
                    variant={cameraStream ? "destructive" : "outline"}
                    size="sm"
                    onClick={testCamera}
                    disabled={testStatus.camera === "testing"}
                  >
                    {cameraStream ? (
                      <>
                        <StopCircle className="w-4 h-4 mr-2" />
                        Parar
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Testar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Teste de Microfone */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Mic className="w-5 h-5 text-gray-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Microfone</h3>
                    <p className="text-sm text-gray-500">
                      {deviceInfo.microphone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusIcon(testStatus.microphone)}
                  <span className="text-sm text-gray-600">
                    {getStatusText(testStatus.microphone)}
                  </span>
                  <Button
                    variant={microphoneStream ? "destructive" : "outline"}
                    size="sm"
                    onClick={testMicrophone}
                    disabled={testStatus.microphone === "testing"}
                  >
                    {microphoneStream ? (
                      <>
                        <StopCircle className="w-4 h-4 mr-2" />
                        Parar
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Testar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Indicador de nível de áudio */}
              {microphoneStream && (
                <div className="mt-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-500">Nível:</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-100"
                        style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12">
                      {Math.round(audioLevel)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Fale para ver o nível de áudio
                  </p>
                </div>
              )}
            </div>

            {/* Teste de Alto-falantes */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.792L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.792A1 1 0 019.383 3.076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="font-medium text-gray-900">Alto-falantes</h3>
                    <p className="text-sm text-gray-500">
                      {deviceInfo.speakers}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusIcon(testStatus.speakers)}
                  <span className="text-sm text-gray-600">
                    {getStatusText(testStatus.speakers)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testSpeakers}
                    disabled={testStatus.speakers === "testing"}
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Tocar Som
                  </Button>
                </div>
              </div>
              {testStatus.speakers === "testing" && (
                <p className="text-xs text-blue-600 mt-2">
                  🎵 Reproduzindo tom de teste (2 segundos)
                </p>
              )}
            </div>

            {/* Teste de Compartilhamento de Tela */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Monitor className="w-5 h-5 text-gray-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Compartilhamento de Tela
                    </h3>
                    <p className="text-sm text-gray-500">
                      Captura de tela do sistema
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusIcon(testStatus.screenShare)}
                  <span className="text-sm text-gray-600">
                    {getStatusText(testStatus.screenShare)}
                  </span>
                  <Button
                    variant={screenStream ? "destructive" : "outline"}
                    size="sm"
                    onClick={testScreenShare}
                    disabled={testStatus.screenShare === "testing"}
                  >
                    {screenStream ? (
                      <>
                        <StopCircle className="w-4 h-4 mr-2" />
                        Parar
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Testar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Dicas */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              💡 Dicas de Teste:
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>
                • <strong>Câmera</strong>: Verifique se sua imagem aparece no
                preview
              </li>
              <li>
                • <strong>Microfone</strong>: Fale e observe o medidor de nível
              </li>
              <li>
                • <strong>Alto-falantes</strong>: Você deve ouvir um tom quando
                testar
              </li>
              <li>
                • <strong>Tela</strong>: Escolha uma janela/tela para
                compartilhar
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Certifique-se de que todos os dispositivos estão funcionando
          </div>
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
};
