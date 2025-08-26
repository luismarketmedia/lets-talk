import React, { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { MessageCircle, Send, Users, Smile } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

interface ChatMessage {
  message: string;
  sender: string;
  userName: string;
  timestamp: Date;
  roomId: string;
}

interface ChatProps {
  socket: Socket | null;
  roomId: string | null;
  userName?: string;
  participantCount: number;
}

export const Chat: React.FC<ChatProps> = ({
  socket,
  roomId,
  userName = "Você",
  participantCount,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset quando entrar em nova sala e adicionar mensagem de boas-vindas
  useEffect(() => {
    if (roomId) {
      setMessages([
        {
          message:
            "Bem-vindo ao chat! Você pode conversar com outros participantes aqui.",
          sender: "system",
          userName: "Sistema",
          timestamp: new Date(),
          roomId: roomId,
        },
      ]);
      setUnreadCount(0);
    }
  }, [roomId]);

  // Escutar mensagens do socket
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (data: ChatMessage) => {
      console.log("[CHAT] Mensagem recebida:", data);
      setMessages((prev) => [
        ...prev,
        {
          ...data,
          timestamp: new Date(data.timestamp),
        },
      ]);

      // Incrementar contador de não lidas se chat está fechado
      if (!isOpen && data.sender !== socket.id) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleError = (data: { message: string }) => {
      console.error("[CHAT ERROR]", data.message);
      // Mostrar erro temporariamente
      setMessages((prev) => [
        ...prev,
        {
          message: `Erro: ${data.message}`,
          sender: "system",
          userName: "Sistema",
          timestamp: new Date(),
          roomId: roomId || "",
        },
      ]);
    };

    socket.on("chat-message", handleChatMessage);
    socket.on("error", handleError);

    return () => {
      socket.off("chat-message", handleChatMessage);
      socket.off("error", handleError);
    };
  }, [socket, isOpen, roomId]);

  // Limpar contador quando abrir o chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const sendMessage = () => {
    if (!socket || !roomId || !newMessage.trim()) {
      console.warn("[CHAT] Não é possível enviar mensagem:", {
        hasSocket: !!socket,
        hasRoomId: !!roomId,
        hasMessage: !!newMessage.trim(),
        socketConnected: socket?.connected,
      });
      return;
    }

    const messageData = {
      roomId,
      message: newMessage.trim(),
      userName,
    };

    console.log("[CHAT] Enviando mensagem:", messageData);
    socket.emit("chat-message", messageData);

    setNewMessage("");

    // Focus back to input after sending
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isOwnMessage = (senderId: string) => {
    return socket?.id === senderId;
  };

  // Show chat button even when not connected, but disable it
  const isConnected = socket && roomId && socket.connected;

  if (!socket || !roomId) {
    // Show disabled chat button
    return (
      <Button
        variant="secondary"
        size="icon"
        disabled
        className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 cursor-not-allowed transition-all duration-200"
        title="Chat indisponível"
      >
        <MessageCircle className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "w-12 h-12 rounded-full transition-all duration-200 relative",
            unreadCount > 0
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-gray-200 hover:bg-gray-300 text-gray-700",
          )}
          title={unreadCount > 0 ? `Chat (${unreadCount} mensagens não lidas)` : "Chat"}
        >
          <MessageCircle className="w-5 h-5" />
          {/* Indicador de atividade quando há participantes */}
          {participantCount > 1 && unreadCount === 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[400px] sm:w-[500px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Chat</span>
            </div>
            <div className="flex items-center space-x-1 text-sm font-normal text-gray-500">
              <Users className="w-4 h-4" />
              <span>{participantCount}</span>
            </div>
          </SheetTitle>
          <SheetDescription>
            Converse com outros participantes da videochamada
          </SheetDescription>
        </SheetHeader>

        {/* Connection Status */}
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center space-x-2 text-xs">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                socket?.connected ? "bg-green-500" : "bg-red-500",
              )}
            />
            <span className="text-gray-500">
              {socket?.connected ? "Conectado" : "Desconectado"}
            </span>
          </div>
          {roomId && (
            <span className="text-xs text-gray-500 font-mono">
              Sala: {roomId}
            </span>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0 mt-2">
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {messages.length === 0 ||
            (messages.length === 1 && messages[0].sender === "system") ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center p-4">
                <div className="bg-blue-50 rounded-full p-3 mb-3">
                  <MessageCircle className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Chat da Videochamada
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  Converse com os participantes da sala!
                </p>
                {!socket?.connected && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2">
                    <p className="text-xs text-yellow-700">
                      🔄 Conectando ao servidor...
                    </p>
                  </div>
                )}
                {socket?.connected && participantCount === 1 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
                    <p className="text-xs text-blue-700">
                      👋 Aguardando outros participantes entrarem...
                    </p>
                  </div>
                )}
                {socket?.connected && participantCount > 1 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2">
                    <p className="text-xs text-green-700">
                      ✨ {participantCount} participantes conectados. Comece a
                      conversar!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              messages.map((msg, index) => {
                const isOwn = isOwnMessage(msg.sender);
                const isSystem = msg.sender === "system";
                const showUserName =
                  !isSystem &&
                  (index === 0 ||
                    messages[index - 1].sender !== msg.sender ||
                    new Date(msg.timestamp).getTime() -
                      new Date(messages[index - 1].timestamp).getTime() >
                      300000); // 5 min

                if (isSystem) {
                  return (
                    <div key={index} className="flex justify-center">
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 max-w-[80%]",
                          msg.message.includes("Erro")
                            ? "bg-red-50 border border-red-200"
                            : "bg-blue-50 border border-blue-200",
                        )}
                      >
                        <p
                          className={cn(
                            "text-xs text-center",
                            msg.message.includes("Erro")
                              ? "text-red-700"
                              : "text-blue-700",
                          )}
                        >
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col",
                      isOwn ? "items-end" : "items-start",
                    )}
                  >
                    {showUserName && !isOwn && (
                      <span className="text-xs text-gray-500 mb-1 px-2">
                        {msg.userName}
                      </span>
                    )}
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-3 py-2 break-words",
                        isOwn
                          ? "bg-blue-500 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-900 rounded-bl-sm",
                      )}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <span
                        className={cn(
                          "text-xs mt-1 block",
                          isOwn ? "text-blue-100" : "text-gray-500",
                        )}
                      >
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t pt-4 mt-4">
            <div className="flex space-x-2">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  !socket?.connected
                    ? "Aguardando conexão..."
                    : !roomId
                      ? "Não conectado à sala..."
                      : "Digite sua mensagem..."
                }
                className="flex-1"
                maxLength={500}
                disabled={!socket?.connected || !roomId}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !socket?.connected || !roomId}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {!socket?.connected
                ? "Aguardando conexão com o servidor..."
                : !roomId
                  ? "Não conectado à sala de chat"
                  : "Pressione Enter para enviar"}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
