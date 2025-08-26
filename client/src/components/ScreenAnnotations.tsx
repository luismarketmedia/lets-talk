import React, { useRef, useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import {
  Pen,
  Eraser,
  Square,
  Circle,
  ArrowRight,
  Type,
  MousePointer,
  X,
  Palette,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

type AnnotationTool = "pen" | "eraser" | "rectangle" | "circle" | "arrow" | "text" | "pointer";

interface AnnotationStroke {
  id: string;
  tool: AnnotationTool;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  timestamp: number;
  userId: string;
  userName: string;
}

interface PointerEvent {
  id: string;
  x: number;
  y: number;
  userId: string;
  userName: string;
  timestamp: number;
}

interface ScreenAnnotationsProps {
  isVisible: boolean;
  onToggle: () => void;
  socket: Socket | null;
  roomId: string | null;
  userName?: string;
  isScreenSharing: boolean;
}

export const ScreenAnnotations: React.FC<ScreenAnnotationsProps> = ({
  isVisible,
  onToggle,
  socket,
  roomId,
  userName = "Usuário",
  isScreenSharing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<AnnotationTool>("pen");
  const [currentColor, setCurrentColor] = useState("#FF0000");
  const [currentWidth, setCurrentWidth] = useState(3);
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<AnnotationStroke | null>(null);
  const [pointers, setPointers] = useState<Map<string, PointerEvent>>(new Map());
  const [showToolbar, setShowToolbar] = useState(false);

  const colors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#FFFFFF"];
  const widths = [2, 4, 6, 8, 12];

  // Initialize canvas overlay
  useEffect(() => {
    if (!isVisible) return;

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const updateCanvasSize = () => {
      const rect = overlay.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      redrawCanvas();
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [isVisible]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleAnnotationStroke = (data: AnnotationStroke) => {
      setStrokes(prev => [...prev, data]);
    };

    const handleAnnotationPointer = (data: PointerEvent) => {
      setPointers(prev => new Map(prev.set(data.userId, data)));
      
      // Remove pointer after 2 seconds
      setTimeout(() => {
        setPointers(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.userId);
          return newMap;
        });
      }, 2000);
    };

    const handleAnnotationClear = () => {
      setStrokes([]);
      setPointers(new Map());
    };

    socket.on("screen-annotation", handleAnnotationStroke);
    socket.on("screen-pointer", handleAnnotationPointer);
    socket.on("screen-annotation-clear", handleAnnotationClear);

    return () => {
      socket.off("screen-annotation", handleAnnotationStroke);
      socket.off("screen-pointer", handleAnnotationPointer);
      socket.off("screen-annotation-clear", handleAnnotationClear);
    };
  }, [socket]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";

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
          Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
        );
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (stroke.tool === "arrow") {
        const startPoint = stroke.points[0];
        const endPoint = stroke.points[stroke.points.length - 1];
        drawArrow(ctx, startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      } else {
        // Free drawing
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    });
  }, [strokes]);

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const getMousePosition = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePosition(e);

    if (currentTool === "pointer") {
      // Send pointer event
      if (socket && roomId) {
        const pointerEvent: PointerEvent = {
          id: `${Date.now()}-${Math.random()}`,
          x: pos.x,
          y: pos.y,
          userId: socket.id || "local",
          userName,
          timestamp: Date.now(),
        };

        socket.emit("screen-pointer", {
          roomId,
          pointer: pointerEvent,
        });
      }
      return;
    }

    setIsDrawing(true);

    const newStroke: AnnotationStroke = {
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

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePosition(e);

    if (currentTool === "pointer") {
      // Send continuous pointer updates
      if (socket && roomId) {
        const pointerEvent: PointerEvent = {
          id: `${Date.now()}-${Math.random()}`,
          x: pos.x,
          y: pos.y,
          userId: socket.id || "local",
          userName,
          timestamp: Date.now(),
        };

        socket.emit("screen-pointer", {
          roomId,
          pointer: pointerEvent,
        });
      }
      return;
    }

    if (!isDrawing || !currentStroke) return;

    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, pos],
    };

    setCurrentStroke(updatedStroke);
    
    // Update canvas with current stroke
    redrawCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = currentTool === "eraser" ? "destination-out" : "source-over";

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
    setStrokes(prev => [...prev, currentStroke]);

    // Send to other users
    if (socket && roomId) {
      socket.emit("screen-annotation", {
        roomId,
        stroke: currentStroke,
      });
    }

    setCurrentStroke(null);
  };

  const clearAnnotations = () => {
    setStrokes([]);
    setPointers(new Map());

    if (socket && roomId) {
      socket.emit("screen-annotation-clear", { roomId });
    }
  };

  const undoLast = () => {
    const userStrokes = strokes.filter(s => s.userId === (socket?.id || "local"));
    const lastStroke = userStrokes[userStrokes.length - 1];

    if (lastStroke) {
      setStrokes(prev => prev.filter(s => s.id !== lastStroke.id));
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Annotation Overlay */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 pointer-events-auto"
        style={{ cursor: currentTool === "pointer" ? "crosshair" : "crosshair" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDrawing(false)}
        />

        {/* Pointers from other users */}
        {Array.from(pointers.entries()).map(([userId, pointer]) => (
          <div
            key={userId}
            className="absolute pointer-events-none z-10"
            style={{
              left: pointer.x - 8,
              top: pointer.y - 8,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="relative">
              <MousePointer className="w-6 h-6 text-red-500 drop-shadow-lg animate-bounce" />
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black/75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {pointer.userName}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Toolbar */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-2">
          <div className="flex items-center space-x-2">
            {/* Toggle Toolbar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowToolbar(!showToolbar)}
              className="w-8 h-8 p-0"
            >
              {showToolbar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>

            {showToolbar && (
              <>
                {/* Tools */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded p-1">
                  {[
                    { tool: "pen" as AnnotationTool, icon: Pen, title: "Caneta" },
                    { tool: "eraser" as AnnotationTool, icon: Eraser, title: "Borracha" },
                    { tool: "rectangle" as AnnotationTool, icon: Square, title: "Retângulo" },
                    { tool: "circle" as AnnotationTool, icon: Circle, title: "Círculo" },
                    { tool: "arrow" as AnnotationTool, icon: ArrowRight, title: "Seta" },
                    { tool: "pointer" as AnnotationTool, icon: MousePointer, title: "Ponteiro Laser" },
                  ].map(({ tool, icon: Icon, title }) => (
                    <Button
                      key={tool}
                      variant={currentTool === tool ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentTool(tool)}
                      title={title}
                      className="w-8 h-8 p-0"
                    >
                      <Icon className="w-3 h-3" />
                    </Button>
                  ))}
                </div>

                {/* Colors */}
                <div className="flex items-center space-x-1">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setCurrentColor(color)}
                      className={cn(
                        "w-5 h-5 rounded border-2 transition-all",
                        currentColor === color ? "border-gray-600 scale-110" : "border-gray-300"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>

                {/* Width */}
                <div className="flex items-center space-x-1">
                  {widths.map(width => (
                    <button
                      key={width}
                      onClick={() => setCurrentWidth(width)}
                      className={cn(
                        "w-6 h-6 rounded border flex items-center justify-center transition-all",
                        currentWidth === width ? "border-blue-500 bg-blue-50" : "border-gray-300"
                      )}
                      title={`Espessura: ${width}px`}
                    >
                      <div
                        className="rounded-full bg-current"
                        style={{ width: `${Math.min(width, 4)}px`, height: `${Math.min(width, 4)}px` }}
                      />
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1 border-l pl-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={undoLast}
                    title="Desfazer"
                    className="w-8 h-8 p-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAnnotations}
                    title="Limpar anotações"
                    className="w-8 h-8 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </>
            )}

            {/* Close */}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggle}
              title="Fechar anotações"
              className="w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
