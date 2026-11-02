import "@tanstack/react-start/server-only";
import { getCookie } from "@tanstack/react-start/server";
import func2url from "../../backend/func2url.json";
import { SESSION_COOKIE } from "./auth.server";

export type StrategiesResult<T> = ({ ok: true } & T) | { ok: false; error: string; message: string };

export async function callStrategies<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<StrategiesResult<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getCookie(SESSION_COOKIE);
  if (token) headers["X-Session-Token"] = token;
  try {
    const res = await fetch((func2url as Record<string, string>).strategies, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...payload }),
    });
    return (await res.json()) as StrategiesResult<T>;
  } catch {
    return { ok: false, error: "network", message: "Сервис временно недоступен. Попробуйте позже." };
  }
}
