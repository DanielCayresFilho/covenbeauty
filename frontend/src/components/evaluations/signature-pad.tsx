import { useEffect, useRef } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignaturePad({
  value,
  onChange,
}: {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const initial = useRef(value);

  // Dimensiona o canvas (respeitando DPI) e redesenha a assinatura existente.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const ratio = window.devicePixelRatio || 1;
      const w = Math.floor(rect.width * ratio);
      if (canvas.width === w) return; // já dimensionado
      canvas.width = w;
      canvas.height = Math.floor(rect.height * ratio);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#efe6d2";
      if (initial.current) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = initial.current;
      }
    };

    const ro = new ResizeObserver(setup);
    ro.observe(canvas);
    setup();
    return () => ro.disconnect();
  }, []);

  const point = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: React.PointerEvent) => {
    drawing.current = true;
    last.current = point(e);
    canvasRef.current!.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current!.toDataURL("image/png"));
  };

  const clear = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    initial.current = undefined;
    onChange(undefined);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        style={{ touchAction: "none" }}
        className="h-40 w-full rounded-md border border-border bg-secondary/20"
      />
      <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={clear}>
        <Eraser className="h-3.5 w-3.5" /> Limpar assinatura
      </Button>
    </div>
  );
}
