export type User = { id: string; name: string };

const KEY = "svgelting.user";
const COOKIE = "svgelting_user";

function cookieSet(value: string) {
  // 30 Tage
  const maxAge = 60 * 60 * 24 * 30;
  document.cookie = `${COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

function cookieGet(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function cookieDel() {
  document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function saveUser(user: User): boolean {
  const raw = JSON.stringify(user);
  // 1) try localStorage
  try {
    localStorage.setItem(KEY, raw);
    return true;
  } catch {
    // 2) fallback cookie
    try {
      cookieSet(raw);
      return true;
    } catch {
      return false;
    }
  }
}

export function loadUser(): User | null {
  // 1) try localStorage
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  // 2) fallback cookie
  if (!raw) {
    try {
      raw = cookieGet();
    } catch {
      raw = null;
    }
  }

  if (!raw) return null;

  try {
    const p = JSON.parse(raw);
    if (!p?.id || !p?.name) return null;
    return { id: String(p.id), name: String(p.name) };
  } catch {
    return null;
  }
}

export function clearUser() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  try {
    cookieDel();
  } catch {}
}