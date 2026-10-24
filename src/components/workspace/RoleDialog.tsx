import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import type { AuthUser } from "@/lib/auth";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export default function RoleDialog({
  user,
  busy,
  onClose,
  onSave,
}: {
  user: AuthUser | null;
  busy: boolean;
  onClose: () => void;
  onSave: (role: "user" | "admin", perms: Permission[]) => void;
}) {
  const [role, setRole] = useState<"user" | "admin">("user");
  const [perms, setPerms] = useState<Permission[]>([]);

  useEffect(() => {
    if (!user) return;
    setRole(user.role === "admin" ? "admin" : "user");
    setPerms(user.permissions);
  }, [user]);

  const toggle = (p: Permission) => setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const allOn = perms.length === PERMISSIONS.length;

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="theme-light max-h-[90vh] overflow-y-auto bg-white text-brand-ink sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Роль и права</DialogTitle>
          <DialogDescription className="text-brand-muted">
            {user?.name} · {user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {([
            ["user", "Пользователь", "UserRound"],
            ["admin", "Администратор", "ShieldCheck"],
          ] as const).map(([v, l, ic]) => (
            <button
              key={v}
              type="button"
              onClick={() => setRole(v)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                role === v ? "border-brand-blue bg-brand-blue/5 text-brand-ink ring-1 ring-brand-blue" : "border-brand-ink/15 text-brand-muted hover:text-brand-ink",
              )}
            >
              <Icon name={ic} size={18} className={role === v ? "text-brand-blue" : ""} />
              {l}
            </button>
          ))}
        </div>

        {role === "admin" && (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Что может делать</span>
              <button
                type="button"
                onClick={() => setPerms(allOn ? [] : PERMISSIONS.map((p) => p.id))}
                className="text-sm font-medium text-brand-blue hover:underline"
              >
                {allOn ? "Снять все" : "Выбрать все"}
              </button>
            </div>
            <div className="mt-3 divide-y divide-brand-ink/[0.07] rounded-lg border border-brand-ink/10">
              {PERMISSIONS.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-brand-light">
                  <input
                    type="checkbox"
                    checked={perms.includes(p.id)}
                    onChange={() => toggle(p.id)}
                    className="mt-0.5 h-4 w-4 accent-[#397FC4]"
                  />
                  <span>
                    <span className="block text-sm font-medium">{p.label}</span>
                    <span className="block text-xs text-brand-muted">{p.text}</span>
                  </span>
                </label>
              ))}
            </div>
            {!perms.length && <p className="mt-2 text-xs text-amber-700">Без прав администратор увидит только пустую панель.</p>}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <button type="button" onClick={onClose} className="rounded-lg border border-brand-ink/15 px-4 py-2.5 text-sm font-medium hover:bg-brand-surface">
            Отмена
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave(role, role === "admin" ? perms : [])}
            className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0] disabled:opacity-60"
          >
            Сохранить
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
