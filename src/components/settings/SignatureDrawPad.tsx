"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Loader2, Save } from "lucide-react";

interface SignatureDrawPadProps {
  onSave: (file: File) => Promise<boolean>;
  disabled?: boolean;
}

export function SignatureDrawPad({ onSave, disabled = false }: SignatureDrawPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) return;
    const point = getPoint(event);
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = getPoint(event);
    context.lineWidth = 6;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasDrawing(true);
  };

  const stopDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawing) return;
    setIsSaving(true);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    const success = blob
      ? await onSave(new File([blob], `signature_${Date.now()}.png`, { type: "image/png" }))
      : false;
    setIsSaving(false);
    if (success) clear();
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div>
        <p className="text-sm font-medium">วาดลายเซ็นในช่องด้านล่าง</p>
        <p className="text-xs text-muted-foreground">ใช้นิ้วบนมือถือ หรือใช้เมาส์บนคอมพิวเตอร์</p>
      </div>
      <canvas
        ref={canvasRef}
        width={900}
        height={300}
        className="h-36 w-full touch-none rounded-md border-2 border-dashed bg-white"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        aria-label="พื้นที่วาดลายเซ็น"
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} disabled={!hasDrawing || isSaving || disabled}>
          <Eraser className="mr-2 h-4 w-4" />ล้างแล้ววาดใหม่
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={!hasDrawing || isSaving || disabled}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          บันทึกลายเซ็น
        </Button>
      </div>
    </div>
  );
}
