import "@tanstack/react-start/server-only";
import { deleteCookie, getCookie, getRequestHeader, getRequestIP, setCookie } from "@tanstack/react-start/server";
import func2url from "../../backend/func2url.json";
import type { Permission, Role, StaffGrant } from "./permissions";

export const SESSION_COOKIE = "__Host-jetra_session";
export const VIEW_COOKIE = "__Host-jetra_view";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  permissions: Permission[];
  emailVerified: boolean;
  hasPassword: boolean;
  createdAt: string | null;
  grants?: StaffGrant[];
  viewAs?: "user";
};

export type AuthResult<T = Record<string, unknown>> =
  | ({ ok: true } & T)
  | { ok: false; error: string; message: string };

export async function callAuth<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
  withSession = false,
): Promise<AuthResult<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withSession) {
    const token = getCookie(SESSION_COOKIE);
    if (token) headers["X-Session-Token"] = token;
  }
  try {
    const res = await fetch((func2url as Record<string, string>).auth, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...payload }),
    });
    return (await res.json()) as AuthResult<T>;
  } catch {
    return { ok: false, error: "network", message: "Сервис временно недоступен. Попробуйте позже." };
  }
}

export function clientMeta() {
  return {
    ip: getRequestIP({ xForwardedFor: true }) ?? "",
    userAgent: getRequestHeader("user-agent") ?? "",
  };
}

export function saveSession(token: string, maxAge: number) {
  setCookie(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge });
}

export function clearSession() {
  deleteCookie(SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
}

export async function currentUser(): Promise<AuthUser | null> {
  if (!getCookie(SESSION_COOKIE)) return null;
  const r = await callAuth<{ user: AuthUser | null }>("me", {}, true);
  if (!r.ok) return null;
  if (!r.user) clearSession();
  if (r.user && r.user.role === "superadmin" && getCookie(VIEW_COOKIE) === "user") {
    return { ...r.user, role: "user", permissions: [], grants: [], viewAs: "user" };
  }
  return r.user;
}

export async function setViewAs(mode: "user" | "") {
  if (!getCookie(SESSION_COOKIE)) return false;
  const r = await callAuth<{ user: AuthUser | null }>("me", {}, true);
  if (!r.ok || !r.user || r.user.role !== "superadmin") return false;
  if (mode) setCookie(VIEW_COOKIE, mode, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  else deleteCookie(VIEW_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  return true;
}
