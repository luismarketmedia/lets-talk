import React, { useRef, useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import {
  Pen,
  Eraser,
  Square,
  Circle,
  ArrowRight,
  Type,
  Palette,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Minus,
  Move3D,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type DrawingTool =
  | "pen"
  | "eraser"
  | "rectangle"
  | "circle"
  | "arrow"
  | "text"
  | "move";

interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
}

interface DrawingStroke {
  id: string;
  tool: DrawingTool;
  points: DrawingPoint[];
  color: string;
  width: number;
  timestamp: number;
  userId: string;
  userName: string;
}

interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  userId: string;
  userName: string;
  timestamp: number;
}

interface WhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
  socket: Socket | null;
  roomId: string | null;
  userName?: string;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({
  isOpen,
  onClose,
  socket,
  roomId,
  userName = "Usuário",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingTool>("pen");
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentWidth, setCurrentWidth] = useState(3);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(
    null,
  );
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState("");
  const [fontSize, setFontSize] = useState(16);

  const colors = [
    "#000000",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#FFA500",
    "#800080",
    "#FFC0CB",
    "#A52A2A",
    "#808080",
    "#FFFFFF",
  ];

  const widths = [1, 3, 5, 8, 12, 20];

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set default styles
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.imageSmoothingEnabled = true;

    redrawCanvas();
  }, [isOpen, strokes, textElements]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleWhiteboardStroke = (data: DrawingStroke) => {
      setStrokes((prev) => [...prev, data]);
    };

    const handleWhiteboardText = (data: TextElement) => {
      setTextElements((prev) => [...prev, data]);
    };

    const handleWhiteboardClear = () => {
      setStrokes([]);
      setTextElements([]);
    };

    const handleWhiteboardUndo = (data: {
      userId: string;
      timestamp: number;
    }) => {
      setStrokes((prev) =>
        prev.filter(
          (stroke) =>
            !(
              stroke.userId === data.userId &&
              stroke.timestamp === data.timestamp
            ),
        ),
      );
      setTextElements((prev) =>
        prev.filter(
          (text) =>
            !(text.userId === data.userId && text.timestamp === data.timestamp),
        ),
      );
    };

    socket.on("whiteboard-stroke", handleWhiteboardStroke);
    socket.on("whiteboard-text", handleWhiteboardText);
    socket.on("whiteboard-clear", handleWhiteboardClear);
    socket.on("whiteboard-undo", handleWhiteboardUndo);

    return () => {
      socket.off("whiteboard-stroke", handleWhiteboardStroke);
      socket.off("whiteboard-text", handleWhiteboardText);
      socket.off("whiteboard-clear", handleWhiteboardClear);
      socket.off("whiteboard-undo", handleWhiteboardUndo);
    };
  }, [socket]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.globalCompositeOperation =
        stroke.tool === "eraser" ? "destination-out" : "source-over";

      if (stroke.tool === "rectangle") {
        const startPoint = stroke.points[0];
        const endPoint = stroke.points[stroke.points.length - 1];
        const width = endPoint.x - startPoint.x;
        const height = endPoint.y - startPoint.y;
        ctx.strokeRect(startPoint.x, startPoint.y, width, height);
      } else if (stroke.tool === "circle") {
        const startPoint = stroke.points[0];
        const endPoint = stroke.points[stroke.points.length - 1];
        const radius = Math.sqrt(
          Math.pow(endPoint.x - startPoint.x, 2) +
            Math.pow(endPoint.y - startPoint.y, 2),
        );
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (stroke.tool === "arrow") {
        const startPoint = stroke.points[0];
        const endPoint = stroke.points[stroke.points.length - 1];
        drawArrow(ctx, startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      } else {
        // Free drawing (pen/eraser)
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    });

    // Draw text elements
    textElements.forEach((textEl) => {
      ctx.font = `${textEl.fontSize}px Arial`;
      ctx.fillStyle = textEl.color;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillText(textEl.text, textEl.x, textEl.y);
    });
  }, [strokes, textElements]);

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw arrow head
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6),
    );
    ctx.stroke();
  };

  const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === "text") {
      const pos = getMousePosition(e);
      setTextInputPosition(pos);
      setShowTextInput(true);
      return;
    }

    setIsDrawing(true);
    const pos = getMousePosition(e);

    const newStroke: DrawingStroke = {
      id: `${Date.now()}-${Math.random()}`,
      tool: currentTool,
      points: [pos],
      color: currentColor,
      width: currentWidth,
      timestamp: Date.now(),
      userId: socket?.id || "local",
      userName,
    };

    setCurrentStroke(newStroke);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke) return;

    const pos = getMousePosition(e);
    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, pos],
    };

    setCurrentStroke(updatedStroke);

    // Draw current stroke on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    redrawCanvas();

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentWidth;
    ctx.globalCompositeOperation =
      currentTool === "eraser" ? "destination-out" : "source-over";

    if (currentTool === "pen" || currentTool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(updatedStroke.points[0].x, updatedStroke.points[0].y);
      for (let i = 1; i < updatedStroke.points.length; i++) {
        ctx.lineTo(updatedStroke.points[i].x, updatedStroke.points[i].y);
      }
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentStroke) return;

    setIsDrawing(false);
    setStrokes((prev) => [...prev, currentStroke]);

    // Send to other users
    if (socket && roomId) {
      socket.emit("whiteboard-stroke", {
        roomId,
        stroke: currentStroke,
      });
    }

    setCurrentStroke(null);
  };

  const handleTextSubmit = () => {
    if (!textInputValue.trim()) {
      setShowTextInput(false);
      setTextInputValue("");
      return;
    }

    const textElement: TextElement = {
      id: `${Date.now()}-${Math.random()}`,
      x: textInputPosition.x,
      y: textInputPosition.y + fontSize,
      text: textInputValue,
      color: currentColor,
      fontSize,
      userId: socket?.id || "local",
      userName,
      timestamp: Date.now(),
    };

    setTextElements((prev) => [...prev, textElement]);

    // Send to other users
    if (socket && roomId) {
      socket.emit("whiteboard-text", {
        roomId,
        textElement,
      });
    }

    setShowTextInput(false);
    setTextInputValue("");
  };

  const clearWhiteboard = () => {
    setStrokes([]);
    setTextElements([]);

    if (socket && roomId) {
      socket.emit("whiteboard-clear", { roomId });
    }
  };

  const undoLast = () => {
    const userStrokes = strokes.filter(
      (s) => s.userId === (socket?.id || "local"),
    );
    const userTexts = textElements.filter(
      (t) => t.userId === (socket?.id || "local"),
    );

    const lastStroke = userStrokes[userStrokes.length - 1];
    const lastText = userTexts[userTexts.length - 1];

    let itemToUndo: { type: "stroke" | "text"; timestamp: number } | null =
      null;

    if (lastStroke && lastText) {
      itemToUndo =
        lastStroke.timestamp > lastText.timestamp
          ? { type: "stroke", timestamp: lastStroke.timestamp }
          : { type: "text", timestamp: lastText.timestamp };
    } else if (lastStroke) {
      itemToUndo = { type: "stroke", timestamp: lastStroke.timestamp };
    } else if (lastText) {
      itemToUndo = { type: "text", timestamp: lastText.timestamp };
    }

    if (itemToUndo) {
      if (itemToUndo.type === "stroke") {
        setStrokes((prev) =>
          prev.filter((s) => s.timestamp !== itemToUndo!.timestamp),
        );
      } else {
        setTextElements((prev) =>
          prev.filter((t) => t.timestamp !== itemToUndo!.timestamp),
        );
      }

      if (socket && roomId) {
        socket.emit("whiteboard-undo", {
          roomId,
          userId: socket.id,
          timestamp: itemToUndo.timestamp,
        });
      }
    }
  };

  const downloadWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `whiteboard-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center space-x-2">
            <Pen className="w-5 h-5" />
            <span>Quadro Branco Colaborativo</span>
          </DialogTitle>
          <DialogDescription>
            Desenhe, anote e colabore em tempo real com outros participantes
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[70vh]">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              {/* Tools */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                {[
                  { tool: "pen" as DrawingTool, icon: Pen, title: "Caneta" },
                  {
                    tool: "eraser" as DrawingTool,
                    icon: Eraser,
                    title: "Borracha",
                  },
                  {
                    tool: "rectangle" as DrawingTool,
                    icon: Square,
                    title: "Retângulo",
                  },
                  {
                    tool: "circle" as DrawingTool,
                    icon: Circle,
                    title: "Círculo",
                  },
                  {
                    tool: "arrow" as DrawingTool,
                    icon: ArrowRight,
                    title: "Seta",
                  },
                  { tool: "text" as DrawingTool, icon: Type, title: "Texto" },
                ].map(({ tool, icon: Icon, title }) => (
                  <Button
                    key={tool}
                    variant={currentTool === tool ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCurrentTool(tool)}
                    title={title}
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                ))}
              </div>

              {/* Colors */}
              <div className="flex items-center space-x-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCurrentColor(color)}
                    className={cn(
                      "w-6 h-6 rounded border-2 transition-all",
                      currentColor === color
                        ? "border-gray-600 scale-110"
                        : "border-gray-300",
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              {/* Width */}
              <div className="flex items-center space-x-1">
                {widths.map((width) => (
                  <button
                    key={width}
                    onClick={() => setCurrentWidth(width)}
                    className={cn(
                      "w-8 h-8 rounded border-2 flex items-center justify-center transition-all",
                      currentWidth === width
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300",
                    )}
                    title={`Espessura: ${width}px`}
                  >
                    <div
                      className="rounded-full bg-current"
                      style={{
                        width: `${Math.min(width, 6)}px`,
                        height: `${Math.min(width, 6)}px`,
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undoLast}
                title="Desfazer"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadWhiteboard}
                title="Baixar"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={clearWhiteboard}
                title="Limpar tudo"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => setIsDrawing(false)}
            />

            {/* Text Input */}
            {showTextInput && (
              <div
                className="absolute z-10"
                style={{
                  left: textInputPosition.x,
                  top: textInputPosition.y,
                }}
              >
                <input
                  type="text"
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleTextSubmit();
                    } else if (e.key === "Escape") {
                      setShowTextInput(false);
                      setTextInputValue("");
                    }
                  }}
                  onBlur={handleTextSubmit}
                  autoFocus
                  className="border rounded px-2 py-1 text-sm"
                  style={{
                    color: currentColor,
                    fontSize: `${fontSize}px`,
                  }}
                  placeholder="Digite o texto..."
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
