import React, { useState, useEffect } from "react";
import { Hand, Smile, Plus } from "lucide-react";
import { Socket } from "socket.io-client";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface Reaction {
  id: string;
  emoji: string;
  name: string;
  participantId: string;
  participantName: string;
  timestamp: Date;
}

interface ReactionsPanelProps {
  socket: Socket | null;
  roomId: string | null;
  userName?: string;
  participantCount: number;
  className?: string;
}

const AVAILABLE_REACTIONS = [
  { emoji: "👍", name: "Curtir", key: "like" },
  { emoji: "👏", name: "Aplaudir", key: "clap" },
  { emoji: "❤️", name: "Amor", key: "love" },
  { emoji: "😂", name: "Rir", key: "laugh" },
  { emoji: "🔥", name: "Demais", key: "fire" },
  { emoji: "🎉", name: "Celebrar", key: "celebrate" },
];

export const ReactionsPanel: React.FC<ReactionsPanelProps> = ({
  socket,
  roomId,
  userName = "Você",
  participantCount,
  className,
}) => {
  const [recentReactions, setRecentReactions] = useState<Reaction[]>([]);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Map<string, { name: string; timestamp: Date }>>(new Map());
  const [isReactionsOpen, setIsReactionsOpen] = useState(false);

  // Listen for reactions and hand raises
  useEffect(() => {
    if (!socket) return;

    const handleReaction = (data: {
      emoji: string;
      name: string;
      participantId: string;
      participantName: string;
      roomId: string;
    }) => {
      const newReaction: Reaction = {
        id: `${data.participantId}-${Date.now()}`,
        emoji: data.emoji,
        name: data.name,
        participantId: data.participantId,
        participantName: data.participantName,
        timestamp: new Date(),
      };

      setRecentReactions(prev => {
        const updated = [...prev, newReaction];
        // Keep only last 20 reactions
        return updated.slice(-20);
      });

      // Remove reaction after 5 seconds
      setTimeout(() => {
        setRecentReactions(prev => prev.filter(r => r.id !== newReaction.id));
      }, 5000);
    };

    const handleHandRaise = (data: {
      participantId: string;
      participantName: string;
      isRaised: boolean;
    }) => {
      setRaisedHands(prev => {
        const updated = new Map(prev);
        if (data.isRaised) {
          updated.set(data.participantId, {
            name: data.participantName,
            timestamp: new Date(),
          });
        } else {
          updated.delete(data.participantId);
        }
        return updated;
      });

      // Update local state if it's our hand
      if (data.participantId === socket.id) {
        setIsHandRaised(data.isRaised);
      }
    };

    socket.on("reaction", handleReaction);
    socket.on("hand-raise", handleHandRaise);

    return () => {
      socket.off("reaction", handleReaction);
      socket.off("hand-raise", handleHandRaise);
    };
  }, [socket]);

  // Send reaction
  const sendReaction = (reactionKey: string) => {
    if (!socket || !roomId) return;

    const reaction = AVAILABLE_REACTIONS.find(r => r.key === reactionKey);
    if (!reaction) return;

    socket.emit("reaction", {
      roomId,
      emoji: reaction.emoji,
      name: reaction.name,
      participantName: userName,
    });

    setIsReactionsOpen(false);
  };

  // Toggle hand raise
  const toggleHandRaise = () => {
    if (!socket || !roomId) return;

    const newState = !isHandRaised;
    setIsHandRaised(newState);

    socket.emit("hand-raise", {
      roomId,
      isRaised: newState,
      participantName: userName,
    });
  };

  const raisedHandsCount = raisedHands.size;

  return (
    <div className={cn("relative", className)}>
      {/* Floating reactions display */}
      {recentReactions.length > 0 && (
        <div className="absolute bottom-16 left-0 right-0 pointer-events-none z-10">
          <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
            {recentReactions.slice(-6).map((reaction) => (
              <div
                key={reaction.id}
                className="animate-bounce-in bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border"
                style={{
                  animation: "bounceIn 0.5s ease-out, fadeOut 1s ease-in 4s forwards",
                }}
              >
                <span className="text-2xl">{reaction.emoji}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main panel */}
      <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 p-2">
        {/* Reactions dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsReactionsOpen(!isReactionsOpen)}
            className="flex items-center space-x-2 hover:bg-blue-50 text-gray-600 hover:text-blue-600"
            title="Enviar reação"
          >
            <Smile className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Reações</span>
          </Button>

          {/* Reactions menu */}
          {isReactionsOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsReactionsOpen(false)}
              />
              
              {/* Menu */}
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-20">
                <div className="grid grid-cols-3 gap-1 min-w-[180px]">
                  {AVAILABLE_REACTIONS.map((reaction) => (
                    <button
                      key={reaction.key}
                      onClick={() => sendReaction(reaction.key)}
                      className="flex flex-col items-center space-y-1 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      title={reaction.name}
                    >
                      <span className="text-xl">{reaction.emoji}</span>
                      <span className="text-xs text-gray-600">{reaction.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Hand raise button */}
        <Button
          variant={isHandRaised ? "default" : "ghost"}
          size="sm"
          onClick={toggleHandRaise}
          className={cn(
            "flex items-center space-x-2 relative",
            isHandRaised
              ? "bg-yellow-500 hover:bg-yellow-600 text-white"
              : "hover:bg-yellow-50 text-gray-600 hover:text-yellow-600"
          )}
          title={isHandRaised ? "Baixar mão" : "Levantar mão"}
        >
          <Hand className={cn("w-4 h-4", isHandRaised && "animate-bounce")} />
          <span className="hidden sm:inline text-xs">
            {isHandRaised ? "Mão levantada" : "Levantar mão"}
          </span>
          
          {/* Raised hands count indicator */}
          {raisedHandsCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {raisedHandsCount}
            </span>
          )}
        </Button>

        {/* Show raised hands list when there are any */}
        {raisedHandsCount > 0 && (
          <div className="text-xs text-gray-600 max-w-xs truncate">
            <span className="font-medium">{raisedHandsCount} mão{raisedHandsCount > 1 ? "s" : ""} levantada{raisedHandsCount > 1 ? "s" : ""}:</span>
            <span className="ml-1">
              {Array.from(raisedHands.values())
                .slice(0, 3)
                .map(hand => hand.name)
                .join(", ")}
              {raisedHandsCount > 3 && ` e mais ${raisedHandsCount - 3}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// CSS animations for reactions
export const ReactionsStyles = `
@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(100px);
  }
  50% {
    opacity: 1;
    transform: scale(1.05) translateY(-10px);
  }
  70% {
    transform: scale(0.9) translateY(0px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0px);
  }
}

@keyframes fadeOut {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.8) translateY(-20px);
  }
}

.animate-bounce-in {
  animation: bounceIn 0.5s ease-out;
}
`;
