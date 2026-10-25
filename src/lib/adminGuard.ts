import { redirect } from "@tanstack/react-router";
import type { AuthUser } from "./auth";
import { can, type SectionPerm } from "./permissions";

export function requirePermission(context: unknown, perm: SectionPerm) {
  const user = (context as { user?: AuthUser }).user;
  if (!user || !can(user, perm)) throw redirect({ to: "/admin" });
}
