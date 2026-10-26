import "@tanstack/react-start/server-only";
import { getCookie } from "@tanstack/react-start/server";
import func2url from "../../backend/func2url.json";
import { SESSION_COOKIE, VIEW_COOKIE } from "./auth.server";

export type LearnResult<T> = ({ ok: true } & T) | { ok: false; error: string; message: string };

export const hasSession = () => !!getCookie(SESSION_COOKIE);

export async function callLearning<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<LearnResult<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getCookie(SESSION_COOKIE);
  if (token) headers["X-Session-Token"] = token;
  if (getCookie(VIEW_COOKIE) === "user") headers["X-View-As"] = "user";
  try {
    const res = await fetch((func2url as Record<string, string>).learning, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...payload }),
    });
    return (await res.json()) as LearnResult<T>;
  } catch {
    return { ok: false, error: "network", message: "Сервис временно недоступен. Попробуйте позже." };
  }
}
