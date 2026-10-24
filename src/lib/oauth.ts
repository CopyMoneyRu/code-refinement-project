import { createServerFn } from "@tanstack/react-start";
import type { Role } from "./permissions";

export type Provider = "google";

const asProvider = (_v: unknown): Provider => "google";

export const oauthProvidersFn = createServerFn({ method: "GET" }).handler(async (): Promise<Provider[]> => {
  const { providerReady } = await import("./oauth.server");
  return (["google"] as const).filter((p) => providerReady(p));
});

export const oauthStartFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ provider: asProvider((input as { provider?: unknown } | null)?.provider) }))
  .handler(async ({ data }): Promise<{ ok: true; url: string } | { ok: false; message: string }> => {
    const { providerReady, startUrl } = await import("./oauth.server");
    if (!providerReady(data.provider)) return { ok: false, message: "Этот способ входа пока не настроен." };
    return { ok: true, url: startUrl(data.provider) };
  });

export const oauthFinishFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 2000) : "");
    return { provider: asProvider(o.provider), code: s(o.code), state: s(o.state) };
  })
  .handler(async ({ data }): Promise<{ ok: true; role: Role } | { ok: false; message: string }> => {
    const { finish } = await import("./oauth.server");
    const r = await finish(data.provider, data.code, data.state);
    return r.ok ? { ok: true, role: r.user.role } : r;
  });
