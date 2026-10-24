import { redirect } from "@tanstack/react-router";
import type { AuthUser } from "./auth";
import { can, type Permission } from "./permissions";

export function requirePermission(context: unknown, perm: Permission) {
  const user = (context as { user?: AuthUser }).user;
  if (!user || !can(user, perm)) throw redirect({ to: "/admin" });
}
