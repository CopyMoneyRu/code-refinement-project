import { redirect } from "@tanstack/react-router";
import { getMe } from "./auth";

export const safeRedirect = (v: unknown): string | undefined =>
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/login") && !v.startsWith("/register") ? v.slice(0, 500) : undefined;

export const authSearch = (s: Record<string, unknown>): { redirect?: string } => {
  const r = safeRedirect(s.redirect);
  return r ? { redirect: r } : {};
};

export const afterAuthPath = (role: string | undefined, target?: string) =>
  safeRedirect(target) ?? (role && role !== "user" ? "/admin" : "/cabinet");

const REDIRECT_KEY = "auth_redirect";

export const rememberRedirect = (target?: string) => {
  if (target) sessionStorage.setItem(REDIRECT_KEY, target);
  else sessionStorage.removeItem(REDIRECT_KEY);
};

export const takeRememberedRedirect = () => {
  const v = sessionStorage.getItem(REDIRECT_KEY) ?? undefined;
  sessionStorage.removeItem(REDIRECT_KEY);
  return safeRedirect(v);
};

export async function requireAuth({ location }: { location: { href: string } }) {
  const user = await getMe();
  if (!user) throw redirect({ to: "/register", search: { redirect: location.href } });
  return { user };
}
