import "@tanstack/react-start/server-only";
import { getCookie } from "@tanstack/react-start/server";
import func2url from "../../backend/func2url.json";
import { SESSION_COOKIE } from "./auth.server";

export async function callAnalytics<T>(action: string, payload: Record<string, unknown> = {}): Promise<T | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getCookie(SESSION_COOKIE);
  if (token) headers["X-Session-Token"] = token;
  try {
    const res = await fetch((func2url as Record<string, string>).analytics, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...payload }),
    });
    const data = (await res.json()) as { ok: boolean } & T;
    return data.ok ? data : null;
  } catch {
    return null;
  }
}
