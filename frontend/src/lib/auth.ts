export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const ACCESS_KEY = "cb_access";
const REFRESH_KEY = "cb_refresh";
const USER_KEY = "cb_user";

const hasWindow = () => typeof window !== "undefined";

export function getAccessToken(): string | null {
  return hasWindow() ? localStorage.getItem(ACCESS_KEY) : null;
}

export function getRefreshToken(): string | null {
  return hasWindow() ? localStorage.getItem(REFRESH_KEY) : null;
}

export function getStoredUser(): AuthUser | null {
  if (!hasWindow()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  if (!hasWindow()) return;
  localStorage.setItem(ACCESS_KEY, session.accessToken);
  localStorage.setItem(REFRESH_KEY, session.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession(): void {
  if (!hasWindow()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
