import React from "react";
import { Socket } from "socket.io-client";
import { Smile } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface SimpleReactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket: Socket | null;
  roomId: string | null;
  userName?: string;
}

const AVAILABLE_REACTIONS = [
  { emoji: "👍", name: "Curtir", key: "like" },
  { emoji: "👏", name: "Aplaudir", key: "clap" },
  { emoji: "❤️", name: "Amor", key: "love" },
  { emoji: "😂", name: "Rir", key: "laugh" },
  { emoji: "🔥", name: "Demais", key: "fire" },
  { emoji: "🎉", name: "Celebrar", key: "celebrate" },
];

export const SimpleReactionsModal: React.FC<SimpleReactionsModalProps> = ({
  isOpen,
  onClose,
  socket,
  roomId,
  userName,
}) => {
  const sendReaction = (reactionKey: string) => {
    if (!socket || !roomId) return;

    const reaction = AVAILABLE_REACTIONS.find((r) => r.key === reactionKey);
    if (!reaction) return;

    socket.emit("reaction", {
      roomId,
      emoji: reaction.emoji,
      name: reaction.name,
      participantName: userName,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Smile className="w-5 h-5" />
            <span>Reações</span>
          </DialogTitle>
          <DialogDescription>
            Envie uma reação para outros participantes
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 p-4">
          {AVAILABLE_REACTIONS.map((reaction) => (
            <button
              key={reaction.key}
              onClick={() => sendReaction(reaction.key)}
              className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 hover:border-gray-300"
              title={reaction.name}
            >
              <span className="text-3xl">{reaction.emoji}</span>
              <span className="text-sm text-gray-600">{reaction.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
