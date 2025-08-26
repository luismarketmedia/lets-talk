import React, { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { 
  MessageCircle, 
  Send, 
  Users,
  Smile
} from "lucide-react";
import {
  Sheet,
  SheetContent,
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
  participantCount 
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

  // Reset quando entrar em nova sala
  useEffect(() => {
    if (roomId) {
      setMessages([]);
      setUnreadCount(0);
    }
  }, [roomId]);

  // Escutar mensagens do socket
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (data: ChatMessage) => {
      setMessages(prev => [...prev, {
        ...data,
        timestamp: new Date(data.timestamp)
      }]);
      
      // Incrementar contador de não lidas se chat está fechado
      if (!isOpen && data.sender !== socket.id) {
        setUnreadCount(prev => prev + 1);
      }
    };

    socket.on('chat-message', handleChatMessage);

    return () => {
      socket.off('chat-message', handleChatMessage);
    };
  }, [socket, isOpen]);

  // Limpar contador quando abrir o chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const sendMessage = () => {
    if (!socket || !roomId || !newMessage.trim()) return;

    socket.emit('chat-message', {
      roomId,
      message: newMessage.trim(),
      userName
    });

    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isOwnMessage = (senderId: string) => {
    return socket?.id === senderId;
  };

  if (!socket || !roomId) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="relative"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Chat
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
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
        </SheetHeader>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0 mt-4">
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
                <Smile className="w-8 h-8 mb-2" />
                <p className="text-sm">Nenhuma mensagem ainda</p>
                <p className="text-xs">Seja o primeiro a conversar!</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isOwn = isOwnMessage(msg.sender);
                const showUserName = index === 0 || 
                  messages[index - 1].sender !== msg.sender ||
                  (new Date(msg.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime()) > 300000; // 5 min

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col",
                      isOwn ? "items-end" : "items-start"
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
                          : "bg-gray-100 text-gray-900 rounded-bl-sm"
                      )}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <span
                        className={cn(
                          "text-xs mt-1 block",
                          isOwn ? "text-blue-100" : "text-gray-500"
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
                placeholder="Digite sua mensagem..."
                className="flex-1"
                maxLength={500}
              />
              <Button 
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Pressione Enter para enviar
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
