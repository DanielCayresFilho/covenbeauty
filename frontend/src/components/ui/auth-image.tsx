import { useEffect, useState } from "react";
import { apiFetchBlob } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** Imagem protegida por Bearer: busca via fetch e exibe por object URL. */
export function AuthImage({
  path,
  alt,
  className,
  fallback,
}: {
  path: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setFailed(false);
    setUrl(null);
    apiFetchBlob(path)
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
  }, [path]);

  if (failed) {
    return (
      <>
        {fallback ?? (
          <div className={cn("flex items-center justify-center bg-secondary text-[0.6rem] text-muted-foreground", className)}>
            —
          </div>
        )}
      </>
    );
  }
  if (!url) return <Skeleton className={className} />;
  return <img src={url} alt={alt} className={cn("object-cover", className)} />;
}
