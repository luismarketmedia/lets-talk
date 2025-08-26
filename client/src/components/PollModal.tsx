import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { BarChart3, Clock, Users, Check, X, Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { cn } from "../lib/utils";

interface PollOption {
  id: string;
  text: string;
  votes: string[]; // Array of participant IDs who voted for this option
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  expiresAt?: Date;
  allowMultipleVotes: boolean;
  isActive: boolean;
}

interface PollModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket: Socket | null;
  roomId: string | null;
  userName?: string;
  isHost: boolean;
  participantCount: number;
}

export const PollModal: React.FC<PollModalProps> = ({
  isOpen,
  onClose,
  socket,
  roomId,
  userName = "Você",
  isHost,
  participantCount,
}) => {
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState<string[]>(["", ""]);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [duration, setDuration] = useState(60); // seconds
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());

  // Listen for poll events
  useEffect(() => {
    if (!socket) return;

    const handlePollStarted = (poll: Omit<Poll, 'createdAt' | 'expiresAt'> & { 
      createdAt: string; 
      expiresAt?: string;
    }) => {
      const pollWithDates: Poll = {
        ...poll,
        createdAt: new Date(poll.createdAt),
        expiresAt: poll.expiresAt ? new Date(poll.expiresAt) : undefined,
      };
      setCurrentPoll(pollWithDates);
      setUserVotes(new Set());
      setIsCreating(false);
    };

    const handlePollVote = (data: {
      pollId: string;
      optionId: string;
      participantId: string;
      participantName: string;
    }) => {
      setCurrentPoll(prev => {
        if (!prev || prev.id !== data.pollId) return prev;

        const updatedOptions = prev.options.map(option => {
          if (option.id === data.optionId) {
            // Add vote if not already voted by this participant
            const votes = option.votes.includes(data.participantId)
              ? option.votes
              : [...option.votes, data.participantId];
            return { ...option, votes };
          } else if (!prev.allowMultipleVotes) {
            // Remove vote from other options if single vote only
            return {
              ...option,
              votes: option.votes.filter(v => v !== data.participantId),
            };
          }
          return option;
        });

        return { ...prev, options: updatedOptions };
      });

      // Update user votes
      if (data.participantId === socket.id) {
        setUserVotes(prev => {
          const updated = new Set(prev);
          if (currentPoll?.allowMultipleVotes) {
            updated.add(data.optionId);
          } else {
            updated.clear();
            updated.add(data.optionId);
          }
          return updated;
        });
      }
    };

    const handlePollEnded = (data: { pollId: string }) => {
      setCurrentPoll(prev => {
        if (!prev || prev.id !== data.pollId) return prev;
        return { ...prev, isActive: false };
      });
    };

    socket.on("poll-started", handlePollStarted);
    socket.on("poll-vote", handlePollVote);
    socket.on("poll-ended", handlePollEnded);

    return () => {
      socket.off("poll-started", handlePollStarted);
      socket.off("poll-vote", handlePollVote);
      socket.off("poll-ended", handlePollEnded);
    };
  }, [socket, currentPoll]);

  // Auto-close expired polls
  useEffect(() => {
    if (!currentPoll?.expiresAt || !currentPoll.isActive) return;

    const timeToExpire = currentPoll.expiresAt.getTime() - Date.now();
    if (timeToExpire <= 0) {
      setCurrentPoll(prev => prev ? { ...prev, isActive: false } : null);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentPoll(prev => prev ? { ...prev, isActive: false } : null);
    }, timeToExpire);

    return () => clearTimeout(timer);
  }, [currentPoll]);

  const startCreatingPoll = () => {
    setIsCreating(true);
    setNewPollQuestion("");
    setNewPollOptions(["", ""]);
    setAllowMultipleVotes(false);
    setDuration(60);
  };

  const addOption = () => {
    if (newPollOptions.length < 6) {
      setNewPollOptions([...newPollOptions, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (newPollOptions.length > 2) {
      setNewPollOptions(newPollOptions.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...newPollOptions];
    updated[index] = value;
    setNewPollOptions(updated);
  };

  const createPoll = () => {
    if (!socket || !roomId || !newPollQuestion.trim()) return;

    const validOptions = newPollOptions.filter(opt => opt.trim());
    if (validOptions.length < 2) return;

    const pollData = {
      roomId,
      question: newPollQuestion.trim(),
      options: validOptions.map(opt => opt.trim()),
      allowMultipleVotes,
      duration: duration > 0 ? duration : undefined,
      createdByName: userName,
    };

    socket.emit("create-poll", pollData);
  };

  const vote = (optionId: string) => {
    if (!socket || !roomId || !currentPoll?.isActive) return;

    // Check if already voted for this option
    if (userVotes.has(optionId)) return;

    socket.emit("poll-vote", {
      roomId,
      pollId: currentPoll.id,
      optionId,
      participantName: userName,
    });
  };

  const endPoll = () => {
    if (!socket || !roomId || !currentPoll) return;

    socket.emit("end-poll", {
      roomId,
      pollId: currentPoll.id,
    });
  };

  const getTotalVotes = () => {
    if (!currentPoll) return 0;
    return currentPoll.options.reduce((total, option) => total + option.votes.length, 0);
  };

  const getTimeRemaining = () => {
    if (!currentPoll?.expiresAt) return null;
    const remaining = Math.max(0, currentPoll.expiresAt.getTime() - Date.now());
    return Math.ceil(remaining / 1000);
  };

  const timeRemaining = getTimeRemaining();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Votações</span>
          </DialogTitle>
          <DialogDescription>
            {isHost ? "Crie votações rápidas para engajar os participantes" : "Participe das votações ativas"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Current Poll */}
          {currentPoll && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{currentPoll.question}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span>Por {currentPoll.createdByName}</span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{getTotalVotes()} votos</span>
                    </span>
                    {timeRemaining !== null && currentPoll.isActive && (
                      <span className="flex items-center space-x-1 text-orange-600">
                        <Clock className="w-4 h-4" />
                        <span>{timeRemaining}s restantes</span>
                      </span>
                    )}
                    {!currentPoll.isActive && (
                      <span className="text-red-600 font-medium">Encerrada</span>
                    )}
                  </div>
                </div>
                
                {isHost && currentPoll.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={endPoll}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Encerrar
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {currentPoll.options.map((option) => {
                  const voteCount = option.votes.length;
                  const percentage = getTotalVotes() > 0 ? (voteCount / getTotalVotes()) * 100 : 0;
                  const hasVoted = userVotes.has(option.id);

                  return (
                    <div key={option.id} className="space-y-2">
                      <button
                        onClick={() => vote(option.id)}
                        disabled={!currentPoll.isActive || hasVoted}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-all",
                          currentPoll.isActive && !hasVoted
                            ? "hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
                            : "cursor-default",
                          hasVoted && "bg-blue-50 border-blue-300",
                          !currentPoll.isActive && "bg-gray-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option.text}</span>
                          <div className="flex items-center space-x-2">
                            {hasVoted && <Check className="w-4 h-4 text-blue-600" />}
                            <span className="text-sm text-gray-600">
                              {voteCount} voto{voteCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-2 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-1">
                          {percentage.toFixed(1)}%
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create Poll */}
          {isHost && (
            <div className="space-y-4">
              {!isCreating && !currentPoll && (
                <div className="text-center py-8">
                  <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Nenhuma votação ativa</p>
                  <Button onClick={startCreatingPoll}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Votação
                  </Button>
                </div>
              )}

              {!isCreating && currentPoll && (
                <div className="text-center py-4 border-t">
                  <Button onClick={startCreatingPoll} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Votação
                  </Button>
                </div>
              )}

              {isCreating && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-semibold">Criar Nova Votação</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pergunta
                    </label>
                    <Input
                      value={newPollQuestion}
                      onChange={(e) => setNewPollQuestion(e.target.value)}
                      placeholder="Digite sua pergunta..."
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opções
                    </label>
                    <div className="space-y-2">
                      {newPollOptions.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            placeholder={`Opção ${index + 1}`}
                            maxLength={100}
                          />
                          {newPollOptions.length > 2 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeOption(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {newPollOptions.length < 6 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addOption}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar Opção
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={allowMultipleVotes}
                        onChange={(e) => setAllowMultipleVotes(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Permitir múltiplas escolhas</span>
                    </label>

                    <div className="flex items-center space-x-2">
                      <label className="text-sm">Duração:</label>
                      <Input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                        min={0}
                        max={600}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">segundos (0 = ilimitado)</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={createPoll}
                      disabled={!newPollQuestion.trim() || newPollOptions.filter(opt => opt.trim()).length < 2}
                    >
                      Iniciar Votação
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreating(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Non-host view when no poll */}
          {!isHost && !currentPoll && (
            <div className="text-center py-8">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma votação ativa</p>
              <p className="text-sm text-gray-500">Aguarde o host criar uma votação</p>
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
