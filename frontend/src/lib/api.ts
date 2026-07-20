import { getAccessToken, clearSession } from "./auth";

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:3000/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Wrapper de fetch: injeta o Bearer, serializa JSON e normaliza erros do backend. */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  // FormData define o próprio Content-Type (com boundary) — não sobrescrever.
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const raw = (data as { message?: string | string[] } | null)?.message;
    const message = Array.isArray(raw)
      ? raw.join(", ")
      : (raw ?? "Não foi possível concluir a requisição");

    // Sessão inválida/expirada: limpa e volta pro login (exceto se já estiver nele).
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.includes("/menu/login")
    ) {
      clearSession();
      window.location.href = "/menu/login";
    }

    throw new ApiError(message, res.status);
  }

  return data as T;
}

/**
 * Busca um arquivo protegido (ex.: foto da ficha) como Blob, com o Bearer.
 * Usado para exibir imagens que exigem autenticação.
 */
export async function apiFetchBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) {
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.includes("/menu/login")
    ) {
      clearSession();
      window.location.href = "/menu/login";
    }
    throw new ApiError("Não foi possível carregar a imagem", res.status);
  }
  return res.blob();
}

export { BASE_URL };
