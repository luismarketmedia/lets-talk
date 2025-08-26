import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { 
  UserPlus, 
  Check, 
  X, 
  Clock,
  Users,
  AlertCircle
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";

interface JoinRequest {
  socketId: string;
  userName: string;
  roomId: string;
  timestamp?: Date;
}

interface JoinApprovalProps {
  socket: Socket | null;
  roomId: string | null;
  isHost: boolean;
  className?: string;
}

export const JoinApproval: React.FC<JoinApprovalProps> = ({ 
  socket, 
  roomId, 
  isHost,
  className 
}) => {
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket || !isHost) return;

    const handleJoinRequest = (data: JoinRequest) => {
      setPendingRequests(prev => {
        // Evitar duplicatas
        const exists = prev.some(req => req.socketId === data.socketId);
        if (exists) return prev;
        
        return [...prev, {
          ...data,
          timestamp: new Date()
        }];
      });
    };

    const handleJoinRequestCancelled = (data: { socketId: string; roomId: string }) => {
      setPendingRequests(prev => 
        prev.filter(req => req.socketId !== data.socketId)
      );
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.socketId);
        return newSet;
      });
    };

    const handleUserLeft = (socketId: string) => {
      setPendingRequests(prev => 
        prev.filter(req => req.socketId !== socketId)
      );
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(socketId);
        return newSet;
      });
    };

    socket.on('join-request', handleJoinRequest);
    socket.on('join-request-cancelled', handleJoinRequestCancelled);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('join-request', handleJoinRequest);
      socket.off('join-request-cancelled', handleJoinRequestCancelled);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, isHost]);

  // Limpar pedidos quando mudar de sala
  useEffect(() => {
    setPendingRequests([]);
    setProcessingIds(new Set());
  }, [roomId]);

  const approveRequest = (socketId: string) => {
    if (!socket || !roomId || processingIds.has(socketId)) return;

    setProcessingIds(prev => new Set(prev).add(socketId));
    
    socket.emit('approve-join', { roomId, socketId });
    
    // Remover da lista após aprovação
    setTimeout(() => {
      setPendingRequests(prev => 
        prev.filter(req => req.socketId !== socketId)
      );
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(socketId);
        return newSet;
      });
    }, 500);
  };

  const rejectRequest = (socketId: string) => {
    if (!socket || !roomId || processingIds.has(socketId)) return;

    setProcessingIds(prev => new Set(prev).add(socketId));
    
    socket.emit('reject-join', { roomId, socketId });
    
    // Remover da lista após rejeição
    setTimeout(() => {
      setPendingRequests(prev => 
        prev.filter(req => req.socketId !== socketId)
      );
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(socketId);
        return newSet;
      });
    }, 500);
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'agora';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}min atrás`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h atrás`;
    }
  };

  if (!socket || !roomId || !isHost || pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
        <UserPlus className="w-4 h-4" />
        <span>Pedidos de Entrada ({pendingRequests.length})</span>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {pendingRequests.map((request) => {
          const isProcessing = processingIds.has(request.socketId);
          
          return (
            <Card key={request.socketId} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {request.userName}
                    </p>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>
                        {request.timestamp ? formatTimeAgo(request.timestamp) : 'agora'}
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
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => approveRequest(request.socketId)}
                    disabled={isProcessing}
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Check className="w-4 h-4" />
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
      
      <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-800">Host da Sala</p>
            <p className="text-yellow-700">
              Como criador desta sala, você pode aprovar ou rejeitar pedidos de entrada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
