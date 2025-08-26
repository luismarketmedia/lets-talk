import React, { useState, useEffect } from "react";
import {
  Video,
  Users,
  Plus,
  ArrowRight,
  AlertCircle,
  X,
  Shuffle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { DeviceCheck } from "./DeviceCheck";
import { AudioDeviceModal } from "./AudioDeviceModal";
import { DeviceTestModal } from "./DeviceTestModal";
import {
  generateMeetingCode,
  formatMeetingCode,
  validateMeetingCode,
} from "../lib/meetingCodeGenerator";
import { loadUsername, saveUsername } from "../lib/userStorage";

interface JoinRoomProps {
  onJoinRoom: (roomId: string) => void;
  onRequestJoinRoom: (roomId: string, userName: string) => void;
  isConnecting: boolean;
  error?: string | null;
  onClearError?: () => void;
}

export const JoinRoom: React.FC<JoinRoomProps> = ({
  onJoinRoom,
  onRequestJoinRoom,
  isConnecting,
  error,
  onClearError,
}) => {
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [mode, setMode] = useState<"join" | "create">("join");
  const [entryType, setEntryType] = useState<"direct" | "request">("request");
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  // Load username from localStorage on component mount
  useEffect(() => {
    const savedUsername = loadUsername();
    if (savedUsername) {
      setUserName(savedUsername);
    }
  }, []);

  // Handle username change and save to localStorage
  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUserName = e.target.value;
    setUserName(newUserName);
    saveUsername(newUserName);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoomId = roomId.trim();
    const cleanUserName = userName.trim();

    if (!cleanRoomId) return;

    if (mode === "create" || entryType === "direct") {
      // Criar sala ou entrar diretamente (host)
      onJoinRoom(cleanRoomId);
    } else {
      // Solicitar entrada (guest)
      if (!cleanUserName) {
        // Usar nome padrão se vazio
        onRequestJoinRoom(cleanRoomId, cleanUserName || "Participante");
      } else {
        onRequestJoinRoom(cleanRoomId, cleanUserName);
      }
    }
  };

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Auto-formatação durante digitação para códigos válidos
    if (value.length > 6) {
      setRoomId(formatMeetingCode(value));
    } else {
      setRoomId(value);
    }
  };

  const generateRoomId = () => {
    // Sempre usa formato Google Meet
    const newCode = generateMeetingCode("google-meet");
    setRoomId(newCode);
    setMode("create");
  };

  const isValidCode = validateMeetingCode(roomId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
              <img src="/logo.png" className="w-full h-full object-cover"  alt="Logo"/>
          </div>
          <p className="text-gray-600">
            Conecte-se facilmente com videochamadas de alta qualidade
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  Erro ao conectar
                </h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              {onClearError && (
                <button
                  onClick={onClearError}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cartão principal */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-gray-900">
              {mode === "join" ? "Entrar em uma chamada" : "Criar nova chamada"}
            </CardTitle>
            <CardDescription>
              {mode === "join"
                ? "Digite o código da sala para participar"
                : "Compartilhe este código para outros participarem"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Modo de entrada */}
            <div className="flex gap-2">
              <Button
                variant={mode === "join" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setMode("join")}
                disabled={isConnecting}
              >
                <Users className="w-4 h-4 mr-2" />
                Entrar
              </Button>
              <Button
                variant={mode === "create" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setMode("create")}
                disabled={isConnecting}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar
              </Button>
            </div>

            {/* Verificação de Dispositivos */}
            <DeviceCheck
              onOpenAudioSettings={() => setShowAudioModal(true)}
              onOpenDeviceTest={() => setShowTestModal(true)}
            />

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo de nome do usuário */}
              <div className="space-y-2">
                <label
                  htmlFor="userName"
                  className="text-sm font-medium text-gray-700"
                >
                  Seu nome
                </label>
                <Input
                  id="userName"
                  type="text"
                  placeholder="Digite seu nome"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  disabled={isConnecting}
                  maxLength={50}
                />
                <p className="text-xs text-gray-500">
                  Como outros participantes irão te ver
                </p>
              </div>

              {/* Tipo de entrada (apenas para join) */}
              {mode === "join" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Tipo de entrada
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={entryType === "request" ? "default" : "outline"}
                      className="flex-1 text-sm"
                      onClick={() => setEntryType("request")}
                      disabled={isConnecting}
                    >
                      Solicitar entrada
                    </Button>
                    <Button
                      type="button"
                      variant={entryType === "direct" ? "default" : "outline"}
                      className="flex-1 text-sm"
                      onClick={() => setEntryType("direct")}
                      disabled={isConnecting}
                    >
                      Entrar diretamente
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {entryType === "request"
                      ? "Host aprovará sua entrada"
                      : "Entrar como co-host da sala"}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="roomId"
                  className="text-sm font-medium text-gray-700"
                >
                  Código da reunião
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        id="roomId"
                        type="text"
                        placeholder={
                          mode === "join"
                            ? "Digite o código da reunião"
                            : "Gere um código (ex: abc-defg-hij)"
                        }
                        value={roomId}
                        onChange={handleRoomIdChange}
                        disabled={isConnecting}
                        className={`font-mono ${
                          roomId.length > 0 && !isValidCode
                            ? "border-yellow-300 focus:ring-yellow-500"
                            : roomId.length > 0 && isValidCode
                              ? "border-green-300 focus:ring-green-500"
                              : ""
                        }`}
                      />
                      {roomId.length > 0 && (
                        <div
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full ${
                            isValidCode ? "bg-green-500" : "bg-yellow-500"
                          }`}
                        />
                      )}
                    </div>

                    {mode === "create" && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateRoomId}
                        disabled={isConnecting}
                        className="px-3"
                        title="Gerar novo código"
                      >
                        <Shuffle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {mode === "join" && roomId.length > 0 && !isValidCode && (
                    <p className="text-xs text-yellow-600">
                      Formato incomum, mas tentaremos conectar
                    </p>
                  )}

                  {mode === "create" && !roomId && (
                    <p className="text-xs text-gray-500">
                      Clique no ícone para gerar um código de reunião{" "}
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!roomId.trim() || isConnecting}
              >
                {isConnecting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {mode === "create"
                      ? "Criando sala..."
                      : entryType === "direct"
                        ? "Entrando..."
                        : "Solicitando entrada..."}
                  </div>
                ) : (
                  <div className="flex items-center">
                    {mode === "create"
                      ? "Iniciar chamada"
                      : entryType === "direct"
                        ? "Entrar na chamada"
                        : "Solicitar entrada"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                )}
              </Button>
            </form>

            {/* Dicas */}
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>
                • Certifique-se de que sua câmera e microfone estão funcionando
              </p>
              <p>• O código da sala é sensível a maiúsculas e minúsculas</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          Powered by WebRTC • Seguro e privado
        </div>
      </div>

      {/* Modais */}
      <AudioDeviceModal
        isOpen={showAudioModal}
        onClose={() => setShowAudioModal(false)}
        onDeviceChange={(input, output) => {
          console.log("Dispositivos selecionados:", { input, output });
          // Aqui você pode salvar as preferências do usuário
        }}
      />

      <DeviceTestModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
      />
    </div>
  );
};
