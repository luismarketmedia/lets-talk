import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  Users, 
  AlertCircle, 
  Volume2, 
  VolumeX, 
  UserX,
  Shield,
  Mic,
  MicOff,
  Video,
  VideoOff
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { cn } from "../lib/utils";

interface JoinRequest {
  socketId: string;
  userName: string;
  roomId: string;
  timestamp?: Date;
}

interface Participant {
  socketId: string;
  userName: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isHost: boolean;
}

interface ParticipantManagerModalProps {
  socket: Socket | null;
  roomId: string | null;
  isHost: boolean;
  isOpen: boolean;
  onClose: () => void;
  participants: Map<string, string>; // socketId -> userName
  participantStates: Map<string, { isAudioEnabled: boolean; isVideoEnabled: boolean }>;
  localSocketId?: string;
}

export const ParticipantManagerModal: React.FC<ParticipantManagerModalProps> = ({
  socket,
  roomId,
  isHost,
  isOpen,
  onClose,
  participants,
  participantStates,
  localSocketId,
}) => {
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());

  // Auto-open modal when there are pending requests (only for hosts)
  useEffect(() => {
    if (isHost && pendingRequests.length > 0 && !isOpen) {
      // Don't auto-open, let the parent component handle this
    }
  }, [pendingRequests.length, isHost, isOpen]);

  useEffect(() => {
    if (!socket || !isHost) return;

    const handleJoinRequest = (data: JoinRequest) => {
      setPendingRequests((prev) => {
        const exists = prev.some((req) => req.socketId === data.socketId);
        if (exists) return prev;

        return [
          ...prev,
          {
            ...data,
            timestamp: new Date(),
          },
        ];
      });
    };

    const handleJoinRequestCancelled = (data: {
      socketId: string;
      roomId: string;
    }) => {
      setPendingRequests((prev) =>
        prev.filter((req) => req.socketId !== data.socketId),
      );
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.socketId);
        return newSet;
      });
    };

    const handleUserLeft = (socketId: string) => {
      setPendingRequests((prev) =>
        prev.filter((req) => req.socketId !== socketId),
      );
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(socketId);
        return newSet;
      });
    };

    socket.on("join-request", handleJoinRequest);
    socket.on("join-request-cancelled", handleJoinRequestCancelled);
    socket.on("user-left", handleUserLeft);

    return () => {
      socket.off("join-request", handleJoinRequest);
      socket.off("join-request-cancelled", handleJoinRequestCancelled);
      socket.off("user-left", handleUserLeft);
    };
  }, [socket, isHost]);

  // Clear requests when room changes
  useEffect(() => {
    setPendingRequests([]);
    setProcessingIds(new Set());
  }, [roomId]);

  const approveRequest = (socketId: string) => {
    if (!socket || !roomId || processingIds.has(socketId)) return;

    setProcessingIds((prev) => new Set(prev).add(socketId));
    socket.emit("approve-join", { roomId, socketId });

    setTimeout(() => {
      setPendingRequests((prev) =>
        prev.filter((req) => req.socketId !== socketId),
      );
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(socketId);
        return newSet;
      });
    }, 500);
  };

  const rejectRequest = (socketId: string) => {
    if (!socket || !roomId || processingIds.has(socketId)) return;

    setProcessingIds((prev) => new Set(prev).add(socketId));
    socket.emit("reject-join", { roomId, socketId });

    setTimeout(() => {
      setPendingRequests((prev) =>
        prev.filter((req) => req.socketId !== socketId),
      );
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(socketId);
        return newSet;
      });
    }, 500);
  };

  const muteParticipant = (socketId: string) => {
    if (!socket || !roomId || !isHost || actioningIds.has(socketId)) return;

    setActioningIds((prev) => new Set(prev).add(socketId));
    socket.emit("mute-participant", { roomId, socketId });

    setTimeout(() => {
      setActioningIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(socketId);
        return newSet;
      });
    }, 1000);
  };

  const kickParticipant = (socketId: string) => {
    if (!socket || !roomId || !isHost || actioningIds.has(socketId)) return;
    
    const userName = participants.get(socketId) || "Participante";
    if (!confirm(`Remover ${userName} da chamada?`)) return;

    setActioningIds((prev) => new Set(prev).add(socketId));
    socket.emit("kick-participant", { roomId, socketId });

    setTimeout(() => {
      setActioningIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(socketId);
        return newSet;
      });
    }, 1000);
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - timestamp.getTime()) / 1000,
    );

    if (diffInSeconds < 60) return "agora";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}min atrás`;
    return `${Math.floor(diffInSeconds / 3600)}h atrás`;
  };

  // Convert participants map to array for easier rendering
  const participantsList: Participant[] = Array.from(participants.entries()).map(([socketId, userName]) => {
    const state = participantStates.get(socketId);
    return {
      socketId,
      userName,
      isAudioEnabled: state?.isAudioEnabled ?? true,
      isVideoEnabled: state?.isVideoEnabled ?? true,
      isHost: socketId === localSocketId && isHost, // Only local user can be host
    };
  });

  // Check if modal should show pending requests count in title
  const hasPendingRequests = pendingRequests.length > 0;
  const totalCount = participantsList.length + (hasPendingRequests ? pendingRequests.length : 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Gerenciar Participantes</span>
            {hasPendingRequests && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {pendingRequests.length} pendente{pendingRequests.length !== 1 ? "s" : ""}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {isHost ? "Gerencie participantes e aprove novos membros" : "Lista de participantes da chamada"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Pending Requests Section */}
          {isHost && hasPendingRequests && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <UserPlus className="w-4 h-4" />
                <span>Pedidos de Entrada ({pendingRequests.length})</span>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pendingRequests.map((request) => {
                  const isProcessing = processingIds.has(request.socketId);

                  return (
                    <Card key={request.socketId} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {request.userName}
                            </p>
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>
                                {request.timestamp
                                  ? formatTimeAgo(request.timestamp)
                                  : "agora"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectRequest(request.socketId)}
                            disabled={isProcessing}
                            className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveRequest(request.socketId)}
                            disabled={isProcessing}
                            className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                        </div>
                      </div>

                      {isProcessing && (
                        <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                          <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                          <span>Processando...</span>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current Participants Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <Users className="w-4 h-4" />
              <span>Participantes Conectados ({participantsList.length})</span>
            </div>

            <div className="space-y-2">
              {participantsList.map((participant) => {
                const isActioning = actioningIds.has(participant.socketId);
                const isCurrentUser = participant.socketId === localSocketId;

                return (
                  <Card key={participant.socketId} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          participant.isHost 
                            ? "bg-purple-100" 
                            : isCurrentUser 
                              ? "bg-blue-100" 
                              : "bg-gray-100"
                        )}>
                          {participant.isHost ? (
                            <Shield className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Users className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {participant.userName}
                              {isCurrentUser && " (Você)"}
                              {participant.isHost && " (Host)"}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              {participant.isAudioEnabled ? (
                                <Mic className="w-3 h-3 text-green-600" />
                              ) : (
                                <MicOff className="w-3 h-3 text-red-500" />
                              )}
                              <span>
                                {participant.isAudioEnabled ? "Áudio ativo" : "Sem áudio"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {participant.isVideoEnabled ? (
                                <Video className="w-3 h-3 text-green-600" />
                              ) : (
                                <VideoOff className="w-3 h-3 text-red-500" />
                              )}
                              <span>
                                {participant.isVideoEnabled ? "Vídeo ativo" : "Sem vídeo"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Host actions */}
                      {isHost && !isCurrentUser && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => muteParticipant(participant.socketId)}
                            disabled={isActioning}
                            className="h-8 px-3 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                            title="Silenciar participante"
                          >
                            {participant.isAudioEnabled ? (
                              <VolumeX className="w-4 h-4" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => kickParticipant(participant.socketId)}
                            disabled={isActioning}
                            className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Remover participante"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {isActioning && (
                      <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                        <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                        <span>Processando ação...</span>
                      </div>
                    )}
                  </Card>
                );
              })}

              {participantsList.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum participante conectado</p>
                </div>
              )}
            </div>
          </div>

          {/* Host info */}
          {isHost && (
            <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800">Privilégios de Host</p>
                  <p className="text-blue-700">
                    Como host, você pode aprovar/rejeitar pedidos de entrada, silenciar e remover participantes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <Button onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook to automatically manage the modal state
export const useParticipantManager = (
  socket: Socket | null,
  roomId: string | null,
  isHost: boolean
) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!socket || !isHost) return;

    const handleJoinRequest = () => {
      setPendingCount(prev => prev + 1);
      // Auto-open modal when first request arrives
      if (!isOpen) {
        setIsOpen(true);
      }
    };

    const handleJoinProcessed = () => {
      setPendingCount(prev => Math.max(0, prev - 1));
    };

    socket.on("join-request", handleJoinRequest);
    socket.on("join-request-cancelled", handleJoinProcessed);
    socket.on("approve-join", handleJoinProcessed);
    socket.on("reject-join", handleJoinProcessed);

    return () => {
      socket.off("join-request", handleJoinRequest);
      socket.off("join-request-cancelled", handleJoinProcessed);
      socket.off("approve-join", handleJoinProcessed);
      socket.off("reject-join", handleJoinProcessed);
    };
  }, [socket, isHost, isOpen]);

  // Reset when room changes
  useEffect(() => {
    setPendingCount(0);
    setIsOpen(false);
  }, [roomId]);

  return {
    isOpen,
    setIsOpen,
    pendingCount,
  };
};
