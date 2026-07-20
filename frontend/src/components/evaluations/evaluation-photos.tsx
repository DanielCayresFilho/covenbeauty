import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, ImagePlus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiFetch, apiFetchBlob, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

type Stage = "FACE" | "HAIR" | "SCALP" | "BODY" | "OTHER";
type Moment = "BEFORE" | "AFTER";

export interface Photo {
  id: string;
  stage: Stage;
  moment: Moment;
  caption: string | null;
  mimeType: string;
  createdAt: string;
}

const STAGES: { value: Stage; label: string }[] = [
  { value: "FACE", label: "Rosto" },
  { value: "HAIR", label: "Cabelo" },
  { value: "SCALP", label: "Couro cabeludo" },
  { value: "BODY", label: "Corporal" },
  { value: "OTHER", label: "Outra" },
];
const STAGE_LABEL: Record<Stage, string> = {
  FACE: "Rosto",
  HAIR: "Cabelo",
  SCALP: "Couro cabeludo",
  BODY: "Corporal",
  OTHER: "Outras",
};
const MOMENT_LABEL: Record<Moment, string> = {
  BEFORE: "Antes",
  AFTER: "Depois",
};

const MAX_BYTES = 8 * 1024 * 1024;

/** Imagem protegida: busca com o token e exibe via object URL. */
function AuthImage({
  photoId,
  alt,
  className,
}: {
  photoId: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    apiFetchBlob(`/evaluations/photos/${photoId}/file`)
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => setFailed(true));
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  if (failed) {
    return (
      <div className={cn("flex items-center justify-center bg-secondary text-xs text-muted-foreground", className)}>
        Indisponível
      </div>
    );
  }
  if (!url) return <Skeleton className={className} />;
  return <img src={url} alt={alt} className={cn("object-cover", className)} />;
}

export function EvaluationPhotos({ evaluationId }: { evaluationId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("FACE");
  const [moment, setMoment] = useState<Moment>("BEFORE");
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<Photo | null>(null);

  const query = useQuery({
    queryKey: ["evaluation-photos", evaluationId],
    queryFn: () => apiFetch<Photo[]>(`/evaluations/${evaluationId}/photos`),
    retry: false,
  });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("stage", stage);
      fd.append("moment", moment);
      if (caption.trim()) fd.append("caption", caption.trim());
      return apiFetch(`/evaluations/${evaluationId}/photos`, {
        method: "POST",
        body: fd,
      });
    },
    onSuccess: () => {
      toast.success("Foto adicionada ✦");
      setCaption("");
      void qc.invalidateQueries({ queryKey: ["evaluation-photos", evaluationId] });
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiError ? e.message : "Não foi possível enviar a foto",
      ),
  });

  const remove = useMutation({
    mutationFn: (photoId: string) =>
      apiFetch(`/evaluations/photos/${photoId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Foto removida");
      setPreview(null);
      void qc.invalidateQueries({ queryKey: ["evaluation-photos", evaluationId] });
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiError ? e.message : "Não foi possível remover a foto",
      ),
  });

  const pick = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Imagem muito grande (máximo 8 MB)");
      return;
    }
    upload.mutate(file);
  };

  const photos = query.data ?? [];
  const grouped = STAGES.map((s) => ({
    stage: s.value,
    label: STAGE_LABEL[s.value],
    items: photos.filter((p) => p.stage === s.value),
  })).filter((g) => g.items.length > 0);

  return (
    <Card className="space-y-4 border-border bg-card/60 p-4">
      <div>
        <h3 className="font-serif text-xl text-parchment">Fotos da ficha</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Registre o antes e o depois por etapa. As fotos ficam guardadas no
          histórico do cliente.
        </p>
      </div>

      {/* Formulário de envio */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Etapa</Label>
          <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Momento</Label>
          <Select value={moment} onValueChange={(v) => setMoment(v as Moment)}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BEFORE">Antes</SelectItem>
              <SelectItem value="AFTER">Depois</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Legenda (opcional)</Label>
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="ex.: lateral direita, luz natural"
            className="h-11"
          />
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = ""; // permite reenviar o mesmo arquivo
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-11 flex-1 gap-2"
          disabled={upload.isPending}
          onClick={() => fileRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          {upload.isPending ? "Enviando..." : "Tirar / escolher foto"}
        </Button>
      </div>

      {/* Galeria por etapa */}
      {query.isLoading ? (
        <Skeleton className="h-28 rounded-lg" />
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-6 text-center">
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma foto ainda. Adicione a primeira acima.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={g.stage}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {g.label}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {g.items.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreview(p)}
                    className="group relative overflow-hidden rounded-lg border border-border"
                  >
                    <AuthImage
                      photoId={p.id}
                      alt={p.caption ?? g.label}
                      className="aspect-square w-full"
                    />
                    <span
                      className={cn(
                        "absolute left-1 top-1 rounded px-1.5 py-0.5 text-[0.65rem] font-semibold",
                        p.moment === "AFTER"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground",
                      )}
                    >
                      {MOMENT_LABEL[p.moment]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visualização ampliada */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-h-full w-full max-w-2xl space-y-3 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-parchment">
              <p className="text-sm">
                {STAGE_LABEL[preview.stage]} · {MOMENT_LABEL[preview.moment]}
                {preview.caption ? ` — ${preview.caption}` : ""}
              </p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded p-1.5 hover:bg-white/10"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AuthImage
              photoId={preview.id}
              alt={preview.caption ?? "Foto da ficha"}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Remover foto
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover esta foto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ela sai do histórico do cliente. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => remove.mutate(preview.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </Card>
  );
}
