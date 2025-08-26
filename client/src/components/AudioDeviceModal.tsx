import React, { useState, useEffect } from "react";
import {
  X,
  Mic,
  Volume2,
  Play,
  Square,
  TestTube,
  Settings,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface AudioDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceChange?: (inputDevice: string, outputDevice: string) => void;
  currentInputDevice?: string;
  currentOutputDevice?: string;
}

export const AudioDeviceModal: React.FC<AudioDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceChange,
  currentInputDevice = "",
  currentOutputDevice = "",
}) => {
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [selectedInput, setSelectedInput] = useState(currentInputDevice);
  const [selectedOutput, setSelectedOutput] = useState(currentOutputDevice);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingInput, setIsTestingInput] = useState(false);
  const [isTestingOutput, setIsTestingOutput] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    try {
      setIsLoading(true);

      // Solicitar permissões primeiro
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Obter lista de dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputs = devices
        .filter((device) => device.kind === "audioinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microfone ${device.deviceId.slice(-4)}`,
          kind: device.kind,
        }));

      const audioOutputs = devices
        .filter((device) => device.kind === "audiooutput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Alto-falante ${device.deviceId.slice(-4)}`,
          kind: device.kind,
        }));

      setInputDevices(audioInputs);
      setOutputDevices(audioOutputs);

      // Definir padrões se não especificados
      if (!selectedInput && audioInputs.length > 0) {
        setSelectedInput(audioInputs[0].deviceId);
      }
      if (!selectedOutput && audioOutputs.length > 0) {
        setSelectedOutput(audioOutputs[0].deviceId);
      }
    } catch (error) {
      console.error("Erro ao carregar dispositivos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const testInputDevice = async (deviceId: string) => {
    try {
      setIsTestingInput(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      microphone.connect(analyser);
      analyser.fftSize = 256;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        setInputLevel(average);

        if (isTestingInput) {
          requestAnimationFrame(updateLevel);
        }
      };

      updateLevel();

      // Parar teste após 5 segundos
      setTimeout(() => {
        setIsTestingInput(false);
        setInputLevel(0);
        stream.getTracks().forEach((track) => track.stop());
        audioContext.close();
      }, 5000);
    } catch (error) {
      console.error("Erro ao testar dispositivo de entrada:", error);
      setIsTestingInput(false);
    }
  };

  const testOutputDevice = async (deviceId: string) => {
    try {
      setIsTestingOutput(true);

      // Criar um tom de teste
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // Lá 440Hz
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

      oscillator.start();

      // Parar após 2 segundos
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
        setIsTestingOutput(false);
      }, 2000);
    } catch (error) {
      console.error("Erro ao testar dispositivo de saída:", error);
      setIsTestingOutput(false);
    }
  };

  const handleSave = () => {
    onDeviceChange?.(selectedInput, selectedOutput);
    onClose();
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
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Dispositivos de Áudio
              </h2>
              <p className="text-sm text-gray-600">
                Configure microfone e alto-falantes
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
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-3" />
              <span className="text-gray-600">Carregando dispositivos...</span>
            </div>
          ) : (
            <>
              {/* Dispositivos de Entrada (Microfone) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-gray-600" />
                  <h3 className="font-medium text-gray-900">Microfone</h3>
                </div>

                <div className="space-y-2">
                  {inputDevices.map((device) => (
                    <div
                      key={device.deviceId}
                      className={cn(
                        "p-3 rounded-lg border transition-all cursor-pointer",
                        selectedInput === device.deviceId
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300",
                      )}
                      onClick={() => setSelectedInput(device.deviceId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {device.label}
                          </p>
                          <p className="text-xs text-gray-500">
                            ID: {device.deviceId.slice(-8)}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Indicador de nível */}
                          {selectedInput === device.deviceId && (
                            <div className="flex items-center space-x-1">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-100"
                                  style={{
                                    width: `${Math.min(inputLevel * 2, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              testInputDevice(device.deviceId);
                            }}
                            disabled={isTestingInput}
                            className="px-2"
                          >
                            {isTestingInput &&
                            selectedInput === device.deviceId ? (
                              <Square className="w-3 h-3" />
                            ) : (
                              <TestTube className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dispositivos de Saída (Alto-falantes) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-gray-600" />
                  <h3 className="font-medium text-gray-900">Alto-falantes</h3>
                </div>

                <div className="space-y-2">
                  {outputDevices.map((device) => (
                    <div
                      key={device.deviceId}
                      className={cn(
                        "p-3 rounded-lg border transition-all cursor-pointer",
                        selectedOutput === device.deviceId
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300",
                      )}
                      onClick={() => setSelectedOutput(device.deviceId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {device.label}
                          </p>
                          <p className="text-xs text-gray-500">
                            ID: {device.deviceId.slice(-8)}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            testOutputDevice(device.deviceId);
                          }}
                          disabled={isTestingOutput}
                          className="px-2"
                        >
                          {isTestingOutput &&
                          selectedOutput === device.deviceId ? (
                            <Square className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instruções */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Como testar:
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>
                    • <strong>Microfone</strong>: Fale para ver o nível de áudio
                  </li>
                  <li>
                    • <strong>Alto-falantes</strong>: Toque um som de teste
                  </li>
                  <li>• Selecione os dispositivos desejados e salve</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  );
};
