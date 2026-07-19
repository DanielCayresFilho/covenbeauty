export type Theme = "dark" | "light";

const KEY = "cb_theme";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem(KEY) === "light" ? "light" : "dark";
}

export function applyTheme(t: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", t === "light");
}

export function setTheme(t: Theme): void {
  if (typeof window !== "undefined") localStorage.setItem(KEY, t);
  applyTheme(t);
}
