import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, X } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, apiFetchBlob, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export type Stage = "FACE" | "HAIR" | "SCALP" | "BODY" | "OTHER";
export type Moment = "BEFORE" | "AFTER";

export interface Photo {
  id: string;
  stage: Stage;
  moment: Moment;
  caption: string | null;
  createdAt: string;
}

interface PendingPhoto {
  id: string;
  file: File;
  stage: Stage;
  moment: Moment;
  previewUrl: string;
}

const MAX_BYTES = 8 * 1024 * 1024;
const MOMENT_LABEL: Record<Moment, string> = {
  BEFORE: "Antes",
  AFTER: "Depois",
};

/** Imagem protegida: busca com o Bearer e exibe via object URL. */
function AuthImage({ photoId, alt, className }: { photoId: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    apiFetchBlob(`/evaluations/photos/${photoId}/file`)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  if (failed) {
    return (
      <div className={cn("flex items-center justify-center bg-secondary text-[0.65rem] text-muted-foreground", className)}>
        Indisponível
      </div>
    );
  }
  if (!url) return <Skeleton className={className} />;
  return <img src={url} alt={alt} className={cn("object-cover", className)} />;
}

/**
 * Gerencia as fotos da ficha. Se a ficha ainda não existe (criação), as fotos
 * ficam na fila e são enviadas com `flush(id)` logo após salvar.
 */
export function useEvaluationPhotos(evaluationId: string | null) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingPhoto[]>([]);

  const query = useQuery({
    queryKey: ["evaluation-photos", evaluationId],
    queryFn: () => apiFetch<Photo[]>(`/evaluations/${evaluationId}/photos`),
    enabled: !!evaluationId,
    retry: false,
  });

  const send = (targetId: string, file: File, stage: Stage, moment: Moment) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("stage", stage);
    fd.append("moment", moment);
    return apiFetch(`/evaluations/${targetId}/photos`, { method: "POST", body: fd });
  };

  const upload = useMutation({
    mutationFn: (v: { file: File; stage: Stage; moment: Moment }) =>
      send(evaluationId!, v.file, v.stage, v.moment),
    onSuccess: () => {
      toast.success("Foto adicionada ✦");
      void qc.invalidateQueries({ queryKey: ["evaluation-photos", evaluationId] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível enviar a foto"),
  });

  const removeServer = useMutation({
    mutationFn: (photoId: string) =>
      apiFetch(`/evaluations/photos/${photoId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Foto removida");
      void qc.invalidateQueries({ queryKey: ["evaluation-photos", evaluationId] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível remover"),
  });

  const add = (file: File | undefined, stage: Stage, moment: Moment) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Imagem muito grande (máximo 8 MB)");
      return;
    }
    if (evaluationId) {
      upload.mutate({ file, stage, moment });
      return;
    }
    // Ficha ainda não salva: guarda para enviar depois.
    setPending((p) => [
      ...p,
      {
        id: crypto.randomUUID(),
        file,
        stage,
        moment,
        previewUrl: URL.createObjectURL(file),
      },
    ]);
  };

  const removePending = (id: string) =>
    setPending((p) => {
      const target = p.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return p.filter((x) => x.id !== id);
    });

  /** Envia a fila para a ficha recém-criada. */
  const flush = async (targetId: string) => {
    for (const p of pending) {
      await send(targetId, p.file, p.stage, p.moment);
    }
    pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPending([]);
  };

  return {
    serverPhotos: query.data ?? [],
    pending,
    pendingCount: pending.length,
    add,
    removePending,
    removeServer,
    flush,
    isUploading: upload.isPending,
  };
}

export type PhotoBucket = ReturnType<typeof useEvaluationPhotos>;

/** Campo de fotos de uma etapa (ex.: rosto), com Antes e Depois. */
export function PhotoField({
  bucket,
  stage,
  label,
}: {
  bucket: PhotoBucket;
  stage: Stage;
  label: string;
}) {
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  const server = bucket.serverPhotos.filter((p) => p.stage === stage);
  const pend = bucket.pending.filter((p) => p.stage === stage);
  const hasAny = server.length + pend.length > 0;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
      <Label className="text-xs">{label}</Label>

      <input
        ref={beforeRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          bucket.add(e.target.files?.[0], stage, "BEFORE");
          e.target.value = "";
        }}
      />
      <input
        ref={afterRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          bucket.add(e.target.files?.[0], stage, "AFTER");
          e.target.value = "";
        }}
      />

      <div className="flex gap-2">
        <PhotoButton
          onClick={() => beforeRef.current?.click()}
          disabled={bucket.isUploading}
          label="Antes"
        />
        <PhotoButton
          onClick={() => afterRef.current?.click()}
          disabled={bucket.isUploading}
          label="Depois"
        />
      </div>

      {hasAny && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {server.map((p) => (
            <Thumb
              key={p.id}
              moment={p.moment}
              onRemove={() => bucket.removeServer.mutate(p.id)}
            >
              <AuthImage photoId={p.id} alt={label} className="aspect-square w-full" />
            </Thumb>
          ))}
          {pend.map((p) => (
            <Thumb
              key={p.id}
              moment={p.moment}
              pending
              onRemove={() => bucket.removePending(p.id)}
            >
              <img
                src={p.previewUrl}
                alt={label}
                className="aspect-square w-full object-cover"
              />
            </Thumb>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card text-sm text-foreground transition-colors hover:border-blood/60 hover:text-primary disabled:opacity-50"
    >
      <Camera className="h-4 w-4" /> {label}
    </button>
  );
}

function Thumb({
  moment,
  pending,
  onRemove,
  children,
}: {
  moment: Moment;
  pending?: boolean;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-border">
      {children}
      <span
        className={cn(
          "absolute left-1 top-1 rounded px-1.5 py-0.5 text-[0.6rem] font-semibold",
          moment === "AFTER"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-foreground",
        )}
      >
        {MOMENT_LABEL[moment]}
      </span>
      {pending && (
        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[0.6rem] text-white">
          ao salvar
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover foto"
        className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-destructive"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
