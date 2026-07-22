import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Printer, Stamp, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, apiFetchBlob, ApiError } from "@/lib/api";

const MAX_BYTES = 8 * 1024 * 1024;

/** Lê o blob como data URL (funciona entre janelas para impressão). */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** Abre uma janela só com a imagem e dispara a impressão. */
function printDataUrl(dataUrl: string) {
  const w = window.open("", "_blank");
  if (!w) {
    toast.error("Permita pop-ups para imprimir o decalque");
    return;
  }
  w.document.write(
    `<!doctype html><html><head><title>Decalque</title><meta name="viewport" content="width=device-width, initial-scale=1"/>` +
      `<style>@page{margin:8mm}html,body{margin:0;padding:0}img{display:block;width:100%;height:auto}</style>` +
      `</head><body><img src="${dataUrl}" onload="window.focus();window.print();"/></body></html>`,
  );
  w.document.close();
}

/**
 * Decalque (stencil) de uma tatuagem. Mostra a imagem com opção de imprimir;
 * se `canEdit`, permite enviar/trocar/remover.
 */
export function Decalque({
  appointmentId,
  decalqueFilename,
  canEdit,
  onChanged,
}: {
  appointmentId: string;
  decalqueFilename?: string | null;
  canEdit?: boolean;
  onChanged?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const has = !!decalqueFilename;

  useEffect(() => {
    if (!has) {
      setUrl(null);
      setBlob(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    apiFetchBlob(`/appointments/${appointmentId}/decalque/file`)
      .then((b) => {
        if (cancelled) return;
        setBlob(b);
        objectUrl = URL.createObjectURL(b);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && toast.error("Não foi possível carregar o decalque"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // decalqueFilename muda ao trocar a imagem → refaz o fetch.
  }, [appointmentId, decalqueFilename, has]);

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiFetch(`/appointments/${appointmentId}/decalque`, {
        method: "POST",
        body: fd,
      });
    },
    onSuccess: () => {
      toast.success("Decalque salvo ✦");
      onChanged?.();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Falha ao enviar o decalque"),
  });

  const remove = useMutation({
    mutationFn: () =>
      apiFetch(`/appointments/${appointmentId}/decalque`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Decalque removido");
      onChanged?.();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Falha ao remover"),
  });

  const pick = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Imagem muito grande (máximo 8 MB)");
      return;
    }
    upload.mutate(file);
  };

  const doPrint = async () => {
    if (!blob) return;
    printDataUrl(await blobToDataUrl(blob));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Stamp className="h-4 w-4 text-blood" />
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Decalque
        </p>
      </div>

      {canEdit && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      )}

      {loading ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : has && url ? (
        <div className="space-y-2">
          <img
            src={url}
            alt="Decalque da tatuagem"
            className="max-h-72 w-full rounded-lg border border-border bg-white object-contain"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-10 flex-1 gap-2" onClick={doPrint}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            {canEdit && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 gap-2"
                  disabled={upload.isPending}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" /> Trocar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-destructive hover:text-destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                  aria-label="Remover decalque"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      ) : canEdit ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full gap-2"
          disabled={upload.isPending}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {upload.isPending ? "Enviando..." : "Enviar decalque"}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Sem decalque enviado.</p>
      )}
    </div>
  );
}
