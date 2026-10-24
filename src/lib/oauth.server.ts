import "@tanstack/react-start/server-only";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { callAuth, clientMeta, saveSession, type AuthUser } from "./auth.server";

export type Provider = "google";

const STATE_COOKIE = "__Host-jetra_oauth";

const CONFIG = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    id: () => process.env.GOOGLE_CLIENT_ID,
    secret: () => process.env.GOOGLE_CLIENT_SECRET,
  },
} as const;

export function isProvider(v: string): v is Provider {
  return v === "google";
}

export const CALLBACK_PATH = (p: Provider) => `/oauth/${p}`;

function googleRedirectUri(): string | null {
  const raw = (process.env.GOOGLE_REDIRECT_URI ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const okProto = u.protocol === "https:" || u.hostname === "localhost";
    if (!okProto || u.pathname !== CALLBACK_PATH("google") || u.search || u.hash) {
      console.error(`[oauth] GOOGLE_REDIRECT_URI должен иметь вид https://домен${CALLBACK_PATH("google")}`);
      return null;
    }
    return `${u.origin}${u.pathname}`;
  } catch {
    console.error("[oauth] GOOGLE_REDIRECT_URI не является корректным адресом");
    return null;
  }
}

export function providerReady(p: Provider) {
  return Boolean(CONFIG[p].id() && CONFIG[p].secret() && process.env.OAUTH_BRIDGE_SECRET && googleRedirectUri());
}

export function callbackUrl(_p: Provider) {
  return googleRedirectUri() ?? "";
}

function randomState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function startUrl(p: Provider): string {
  const state = randomState();
  setCookie(STATE_COOKIE, `${p}:${state}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  const cfg = CONFIG[p];
  const params = new URLSearchParams({
    client_id: cfg.id() ?? "",
    redirect_uri: callbackUrl(p),
    response_type: "code",
    scope: cfg.scope,
    state,
  });
  params.set("prompt", "select_account");
  return `${cfg.authUrl}?${params}`;
}

type Profile = { id: string; email: string; name: string };

async function fetchProfile(accessToken: string): Promise<Profile | null> {
  const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) return null;
  const j = (await r.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  if (!j.sub || !j.email || j.email_verified === false) return null;
  return { id: j.sub, email: j.email, name: j.name ?? "" };
}

export async function finish(p: Provider, code: string, state: string): Promise<{ ok: true; user: AuthUser } | { ok: false; message: string }> {
  const saved = getCookie(STATE_COOKIE);
  deleteCookie(STATE_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  if (!saved || saved !== `${p}:${state}` || !code) {
    return { ok: false, message: "Сеанс входа устарел. Попробуйте ещё раз." };
  }
  const cfg = CONFIG[p];
  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: cfg.id() ?? "",
      client_secret: cfg.secret() ?? "",
      redirect_uri: callbackUrl(p),
    }),
  });
  if (!tokenRes.ok) {
    console.error(`[oauth] Google token error ${tokenRes.status}: ${(await tokenRes.text()).slice(0, 300)}`);
    return { ok: false, message: "Не удалось подтвердить вход. Попробуйте ещё раз." };
  }
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return { ok: false, message: "Не удалось подтвердить вход. Попробуйте ещё раз." };

  const profile = await fetchProfile(access_token);
  if (!profile) return { ok: false, message: "Сервис не передал подтверждённый email. Разрешите доступ к почте и попробуйте снова." };

  const r = await callAuth<{ token: string; maxAge: number; user: AuthUser }>("oauth_login", {
    bridgeSecret: process.env.OAUTH_BRIDGE_SECRET,
    provider: p,
    providerUserId: profile.id,
    email: profile.email,
    name: profile.name,
    ...clientMeta(),
  });
  if (!r.ok) return { ok: false, message: r.message };
  saveSession(r.token, r.maxAge);
  return { ok: true, user: r.user };
}