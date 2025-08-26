import React from "react";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "../lib/utils";

interface ConnectionIndicatorProps {
  quality: "excellent" | "good" | "fair" | "poor" | "unknown";
  rtt: number;
  bandwidth: number;
  className?: string;
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  quality,
  rtt,
  bandwidth,
  className,
}) => {
  const getQualityColor = () => {
    switch (quality) {
      case "excellent":
        return "text-green-500";
      case "good":
        return "text-green-400";
      case "fair":
        return "text-yellow-400";
      case "poor":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getQualityText = () => {
    switch (quality) {
      case "excellent":
        return "Excelente";
      case "good":
        return "Boa";
      case "fair":
        return "Regular";
      case "poor":
        return "Ruim";
      default:
        return "Verificando...";
    }
  };

  const formatBandwidth = (bw: number) => {
    if (bw > 1000) {
      return `${(bw / 1000).toFixed(1)} Mbps`;
    }
    return `${bw} kbps`;
  };

  if (quality === "unknown") {
    return (
      <div
        className={cn("flex items-center space-x-2 text-gray-400", className)}
      >
        <WifiOff className="w-4 h-4" />
        <span className="text-sm">Verificando conexão...</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center space-x-2",
        getQualityColor(),
        className,
      )}
      title={`RTT: ${rtt}ms | Bandwidth: ${formatBandwidth(bandwidth)}`}
    >
      <Wifi className="w-4 h-4" />
      <div className="text-sm">
        <span className="font-medium">{getQualityText()}</span>
        {rtt > 0 && <span className="text-gray-500 ml-1">({rtt}ms)</span>}
      </div>
    </div>
  );
};
