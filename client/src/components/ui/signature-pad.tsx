import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check, PenTool } from "lucide-react";

interface SignaturePadProps {
  onSignatureChange: (signature: string) => void;
  width?: number;
  height?: number;
}

export default function SignaturePad({ 
  onSignatureChange, 
  width = 600, 
  height = 200 
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

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

    // Configure drawing context
    context.strokeStyle = "#000";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";

    // Clear canvas with white background
    context.fillStyle = "#fff";
    context.fillRect(0, 0, displayWidth, displayHeight);
  }, [width, height]);

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in event) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }

    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in event) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }

    context.lineTo(x, y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
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

    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    setHasSignature(false);
    onSignatureChange("");
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-gray-50 relative">
        <canvas
          ref={canvasRef}
          className={`w-full border border-gray-200 rounded cursor-crosshair touch-none ${
            hasSignature ? 'bg-white' : ''
          }`}
          style={{ height: `${height}px`, minHeight: '200px' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          data-testid="signature-canvas"
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 pointer-events-none">
            <PenTool className="mb-2 h-8 w-8" />
            <p className="text-sm">Sign above</p>
            <p className="text-xs text-gray-400">Use mouse or touch to draw your signature</p>
          </div>
        )}
      </div>
      
      <div className="flex space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={clearSignature}
          className="flex-1"
          data-testid="button-clear-signature"
        >
          <Eraser className="mr-2 h-4 w-4" />
          Clear
        </Button>
        <Button
          type="button"
          onClick={captureSignature}
          disabled={!hasSignature}
          className="flex-1"
          data-testid="button-confirm-signature"
        >
          <Check className="mr-2 h-4 w-4" />
          Confirm
        </Button>
      </div>
    </div>
  );
}
