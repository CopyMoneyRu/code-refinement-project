import { createServerFn } from "@tanstack/react-start";
import type { Permission, Role, StaffGrant } from "./permissions";

export type { Permission, Role } from "./permissions";

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

export type ActionResult = { ok: true; emailSent?: boolean } | { ok: false; error: string; message: string };

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");
const obj = (input: unknown) => (input && typeof input === "object" ? (input as Record<string, unknown>) : {});

const fail = (r: { ok: false; error: string; message: string }): ActionResult => ({
  ok: false,
  error: r.error,
  message: r.message,
});

export const getMe = createServerFn({ method: "GET" }).handler(async (): Promise<AuthUser | null> => {
  const { currentUser } = await import("./auth.server");
  return currentUser();
});

export const registerFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = obj(input);
    return {
      name: str(o.name, 120),
      email: str(o.email, 255),
      password: str(o.password, 200),
      personalData: o.personalData === true,
      terms: o.terms === true,
      marketing: o.marketing === true,
    };
  })
  .handler(async ({ data }): Promise<ActionResult> => {
    const { callAuth, clientMeta } = await import("./auth.server");
    const r = await callAuth<{ emailSent: boolean }>("register", { ...data, ...clientMeta() });
    return r.ok ? { ok: true, emailSent: r.emailSent } : fail(r);
  });

export const loginFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = obj(input);
    return { email: str(o.email, 255), password: str(o.password, 200) };
  })
  .handler(async ({ data }): Promise<ActionResult & { role?: AuthUser["role"] }> => {
    const { callAuth, clientMeta, saveSession } = await import("./auth.server");
    const r = await callAuth<{ token: string; maxAge: number; user: AuthUser }>("login", { ...data, ...clientMeta() });
    if (!r.ok) return fail(r);
    saveSession(r.token, r.maxAge);
    return { ok: true, role: r.user.role };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async (): Promise<ActionResult> => {
  const { callAuth, clearSession } = await import("./auth.server");
  await callAuth("logout", {}, true);
  clearSession();
  return { ok: true };
});

export const resendFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ email: str(obj(input).email, 255) }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const { callAuth } = await import("./auth.server");
    const r = await callAuth<{ emailSent: boolean }>("resend", data);
    return r.ok ? { ok: true, emailSent: r.emailSent } : fail(r);
  });

export const verifyEmailFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = obj(input);
    return { email: str(o.email, 255), code: str(o.code, 12) };
  })
  .handler(async ({ data }): Promise<ActionResult & { role?: AuthUser["role"] }> => {
    const { callAuth, clientMeta, saveSession } = await import("./auth.server");
    const r = await callAuth<{ token: string; maxAge: number; user: AuthUser }>("verify", { ...data, ...clientMeta() });
    if (!r.ok) return fail(r);
    saveSession(r.token, r.maxAge);
    return { ok: true, role: r.user.role };
  });

export const forgotFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ email: str(obj(input).email, 255) }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const { callAuth } = await import("./auth.server");
    const r = await callAuth("forgot", data);
    return r.ok ? { ok: true } : fail(r);
  });

export const resetPasswordFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = obj(input);
    return { email: str(o.email, 255), code: str(o.code, 12), password: str(o.password, 200) };
  })
  .handler(async ({ data }): Promise<ActionResult> => {
    const { callAuth } = await import("./auth.server");
    const r = await callAuth("reset", data);
    return r.ok ? { ok: true } : fail(r);
  });

export const updateProfileFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ name: str(obj(input).name, 120) }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const { callAuth } = await import("./auth.server");
    const r = await callAuth("update_profile", data, true);
    return r.ok ? { ok: true } : fail(r);
  });

export const changePasswordFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = obj(input);
    return { current: str(o.current, 200), password: str(o.password, 200) };
  })
  .handler(async ({ data }): Promise<ActionResult> => {
    const { callAuth } = await import("./auth.server");
    const r = await callAuth("change_password", data, true);
    return r.ok ? { ok: true } : fail(r);
  });

export const adminUsersFn = createServerFn({ method: "GET" }).handler(async (): Promise<AuthUser[]> => {
  const { callAuth } = await import("./auth.server");
  const r = await callAuth<{ users: AuthUser[] }>("admin_users", {}, true);
  return r.ok ? r.users : [];
});

export const adminSetRoleFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = obj(input);
    const perms = Array.isArray(o.permissions) ? o.permissions.filter((x): x is string => typeof x === "string").slice(0, 20) : [];
    return { userId: Number(o.userId) || 0, role: o.role === "admin" ? "admin" : "user", permissions: perms };
  })
  .handler(async ({ data }): Promise<ActionResult> => {
    const { callAuth } = await import("./auth.server");
    const r = await callAuth("admin_set_role", data, true);
    return r.ok ? { ok: true } : fail(r);
  });

export const adminDeleteUserFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ userId: Number(obj(input).userId) || 0 }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const { callAuth } = await import("./auth.server");
    const r = await callAuth("admin_delete_user", data, true);
    return r.ok ? { ok: true } : fail(r);
  });

export const setViewAsFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ mode: obj(input).mode === "user" ? ("user" as const) : ("" as const) }))
  .handler(async ({ data }) => {
    const { setViewAs } = await import("./auth.server");
    return { ok: await setViewAs(data.mode) };
  });
