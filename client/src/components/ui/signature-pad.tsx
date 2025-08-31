import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check, PenTool } from "lucide-react";

interface SignaturePadProps {
  onSignatureChange: (signature: string) => void;
  width?: number;
  height?: number;
  existingSignature?: string;
}

export default function SignaturePad({ 
  onSignatureChange, 
  width = 600, 
  height = 200,
  existingSignature = ""
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Get the actual displayed size of the canvas
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Set canvas internal size to match display size for crisp rendering
    canvas.width = displayWidth * window.devicePixelRatio;
    canvas.height = displayHeight * window.devicePixelRatio;

    // Scale the context to match device pixel ratio
    context.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Configure drawing context for smoother lines
    context.strokeStyle = "#000";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.globalCompositeOperation = "source-over";
    
    // Enable antialiasing and smoothing for better line quality
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    // Clear canvas with white background
    context.fillStyle = "#fff";
    context.fillRect(0, 0, displayWidth, displayHeight);

    // Load existing signature if provided
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, displayWidth, displayHeight);
        setHasSignature(true);
      };
      img.src = existingSignature;
    }
  }, [width, height, existingSignature]);

  const getEventPos = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in event && event.touches.length > 0) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else if ('clientX' in event) {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    } else {
      x = 0;
      y = 0;
    }

    return { x, y };
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const { x, y } = getEventPos(event);
    lastPointRef.current = { x, y };

    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const { x, y } = getEventPos(event);
    
    // Draw smooth line from last point to current point
    if (lastPointRef.current) {
      const lastX = lastPointRef.current.x;
      const lastY = lastPointRef.current.y;
      
      // Calculate distance to determine if we need interpolation
      const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
      
      if (distance > 2) {
        // For longer distances, interpolate points for smoother lines
        const steps = Math.ceil(distance / 2);
        for (let i = 1; i <= steps; i++) {
          const ratio = i / steps;
          const interpX = lastX + (x - lastX) * ratio;
          const interpY = lastY + (y - lastY) * ratio;
          
          context.beginPath();
          context.moveTo(lastX + (interpX - lastX) * (i - 1) / steps, lastY + (interpY - lastY) * (i - 1) / steps);
          context.lineTo(interpX, interpY);
          context.stroke();
        }
      } else {
        // For short distances, draw directly
        context.beginPath();
        context.moveTo(lastX, lastY);
        context.lineTo(x, y);
        context.stroke();
      }
    }
    
    lastPointRef.current = { x, y };
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
    captureSignature();
  };

  const captureSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL("image/png");
    onSignatureChange(dataURL);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Get the actual canvas dimensions
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Clear the entire canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill with white background
    context.fillStyle = "#fff";
    context.fillRect(0, 0, displayWidth, displayHeight);
    
    setHasSignature(false);
    onSignatureChange("");
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-gray-50 relative">
        <canvas
          ref={canvasRef}
          className={`w-full border border-gray-200 rounded cursor-crosshair touch-none select-none ${
            hasSignature ? 'bg-white' : ''
          }`}
          style={{ 
            height: `${height}px`, 
            minHeight: '200px',
            touchAction: 'none',
            userSelect: 'none'
          }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onPointerCancel={stopDrawing}
          data-testid="signature-canvas"
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 pointer-events-none">
            <PenTool className="mb-2 h-8 w-8" />
            <p className="text-sm">Sign here</p>
            <p className="text-xs text-gray-400">Use mouse or touch to draw your signature</p>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={clearSignature}
          disabled={!hasSignature}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-1.5 text-sm scale-70"
          data-testid="button-clear-signature"
        >
          <Eraser className="mr-1.5 h-4 w-4" />
          Clear Signature
        </Button>
      </div>
    </div>
  );
}
