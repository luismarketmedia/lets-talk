import React from "react";
import { Grid3X3, Focus, Users, Volume2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

export type ViewMode = "gallery" | "speaker" | "spotlight";

interface ViewModeSelectorProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  participantCount: number;
  activeSpeaker?: string | null;
  className?: string;
}

export const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  currentMode,
  onModeChange,
  participantCount,
  activeSpeaker,
  className,
}) => {
  const modes = [
    {
      id: "gallery" as ViewMode,
      name: "Grade",
      icon: Grid3X3,
      description: "Visualizar todos os participantes igualmente",
      disabled: false,
    },
    {
      id: "speaker" as ViewMode,
      name: "Palestrante",
      icon: Volume2,
      description: "Destacar quem está falando",
      disabled: participantCount < 2,
    },
    {
      id: "spotlight" as ViewMode,
      name: "Foco",
      icon: Focus,
      description: "Focar em um participante específico",
      disabled: participantCount < 2,
    },
  ];

  return (
    <div className={cn("flex items-center space-x-1 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 p-1", className)}>
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;
        const isDisabled = mode.disabled;

        return (
          <Button
            key={mode.id}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => !isDisabled && onModeChange(mode.id)}
            disabled={isDisabled}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 text-xs font-medium transition-all duration-200",
              isActive
                ? "bg-blue-500 text-white shadow-md"
                : isDisabled
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
            )}
            title={isDisabled ? `${mode.description} (mínimo 2 participantes)` : mode.description}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{mode.name}</span>
            {mode.id === "speaker" && activeSpeaker && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </Button>
        );
      })}
    </div>
  );
};

// Hook para gerenciar o estado do modo de visualização
export const useViewMode = (initialMode: ViewMode = "gallery") => {
  const [viewMode, setViewMode] = React.useState<ViewMode>(initialMode);
  const [spotlightParticipant, setSpotlightParticipant] = React.useState<string | null>(null);

  const changeViewMode = React.useCallback((mode: ViewMode) => {
    setViewMode(mode);
    
    // Reset spotlight when changing away from spotlight mode
    if (mode !== "spotlight") {
      setSpotlightParticipant(null);
    }
  }, []);

  const setSpotlight = React.useCallback((participantId: string | null) => {
    setSpotlightParticipant(participantId);
    if (participantId) {
      setViewMode("spotlight");
    }
  }, []);

  return {
    viewMode,
    spotlightParticipant,
    changeViewMode,
    setSpotlight,
  };
};
