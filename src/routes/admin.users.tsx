import { useMemo, useState } from "react";
import { requirePermission } from "@/lib/adminGuard";
import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminDeleteUserFn, adminSetRoleFn, adminUsersFn, type AuthUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import RoleDialog from "@/components/workspace/RoleDialog";
import { PERMISSIONS, ROLE_LABEL, type Permission } from "@/lib/permissions";

export const Route = createFileRoute("/admin/users")({
  beforeLoad: ({ context }) => requirePermission(context, "users"),
  loader: () => adminUsersFn(),
  component: UsersAdmin,
});

const adminApi = getRouteApi("/admin");

function UsersAdmin() {
  const users = Route.useLoaderData();
  const { user: me } = adminApi.useRouteContext();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [toDelete, setToDelete] = useState<AuthUser | null>(null);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const isSuper = me.role === "superadmin";

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? users.filter((u) => u.email.toLowerCase().includes(s) || u.name.toLowerCase().includes(s)) : users;
  }, [users, q]);

  const saveRole = async (role: "user" | "admin", permissions: Permission[]) => {
    if (!editing) return;
    const target = editing;
    setBusy(target.id);
    setError("");
    setNotice("");
    const r = await adminSetRoleFn({ data: { userId: target.id, role, permissions } });
    setBusy(null);
    if (!r.ok) return setError(r.message);
    setEditing(null);
    setNotice(`Роль пользователя ${target.email} обновлена`);
    router.invalidate();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setBusy(target.id);
    setError("");
    setNotice("");
    const r = await adminDeleteUserFn({ data: { userId: target.id } });
    setBusy(null);
    setToDelete(null);
    if (!r.ok) setError(r.message);
    else {
      setNotice(`Пользователь ${target.email} перемещён в архив`);
      router.invalidate();
    }
  };

  return (
    <>
      <WsTitle title="Пользователи" text={isSuper ? "Пользователи, роли и права администраторов. Новые пользователи регистрируются с ролью «Пользователь»." : "Зарегистрированные пользователи и подтверждение email."} />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      <WsCard className="p-0">
        <div className="flex flex-col gap-3 border-b border-brand-ink/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative flex-1">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по имени или email"
              className="h-10 w-full rounded-lg border border-brand-ink/15 pl-9 pr-3 text-sm focus:border-brand-blue focus:outline-none sm:max-w-xs"
            />
          </label>
          <span className="text-sm text-brand-muted">Всего: {users.length}</span>
        </div>
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-brand-ink/[0.08] bg-brand-light/60 text-brand-muted">
                <tr>
                  {["Пользователь", "Email", "Роль", "Email подтверждён", "Регистрация", ""].map((c) => (
                    <th key={c} className="px-5 py-3.5 font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/[0.06]">
                {list.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3.5 font-medium">{u.name}</td>
                    <td className="px-5 py-3.5 text-brand-muted">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium",
                          u.role === "superadmin"
                            ? "bg-brand-ink text-white"
                            : u.role === "admin"
                              ? "bg-brand-blue/10 text-brand-blue"
                              : "bg-brand-surface text-brand-muted",
                        )}
                      >
                        {ROLE_LABEL[u.role]}
                      </span>
                      {u.role === "admin" && (
                        <div className="mt-1.5 max-w-[220px] text-xs leading-snug text-brand-muted">
                          {u.permissions.length
                            ? PERMISSIONS.filter((p) => u.permissions.includes(p.id)).map((p) => p.label).join(", ")
                            : "Права не выбраны"}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.emailVerified ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700"><Icon name="CircleCheck" size={15} /> Да</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-brand-muted"><Icon name="Clock" size={15} /> Ожидает</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-brand-muted">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("ru-RU") : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {u.id !== me.id && u.role !== "superadmin" && (isSuper || u.role === "user") && (
                        <div className="inline-flex items-center gap-2">
                          {isSuper && (
                            <button
                              disabled={busy === u.id}
                              onClick={() => setEditing(u)}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-brand-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-brand-surface disabled:opacity-50"
                            >
                              <Icon name="ShieldCheck" size={14} /> Роль и права
                            </button>
                          )}
                          <button
                            disabled={busy === u.id}
                            onClick={() => setToDelete(u)}
                            aria-label={`Удалить ${u.email}`}
                            title="Удалить пользователя"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Icon name="Trash2" size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="Users"
            title={users.length ? "Никого не найдено" : "Пользователей пока нет"}
            text={users.length ? "Измените условия поиска." : "Пользователи появятся здесь после регистрации на сайте."}
          />
        )}
      </WsCard>

      <RoleDialog user={editing} busy={busy !== null} onClose={() => setEditing(null)} onSave={saveRole} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="theme-light bg-white text-brand-ink">
          <AlertDialogHeader>
            <AlertDialogTitle>Переместить пользователя в архив?</AlertDialogTitle>
            <AlertDialogDescription className="text-brand-muted">
              Аккаунт <span className="font-medium text-brand-ink">{toDelete?.name}</span> ({toDelete?.email}) будет перемещён в архив и сразу разлогинен на всех устройствах.
              Восстановить или удалить навсегда можно в разделе «Архив».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={busy !== null}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              В архив
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
