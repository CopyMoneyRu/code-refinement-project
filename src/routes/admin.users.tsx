import { useMemo, useState } from "react";
import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { adminSetRoleFn, adminUsersFn } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users")({
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

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? users.filter((u) => u.email.toLowerCase().includes(s) || u.name.toLowerCase().includes(s)) : users;
  }, [users, q]);

  const toggleRole = async (id: number, role: "user" | "admin") => {
    setBusy(id);
    setError("");
    const r = await adminSetRoleFn({ data: { userId: id, role } });
    setBusy(null);
    if (!r.ok) setError(r.message);
    else router.invalidate();
  };

  return (
    <>
      <WsTitle title="Пользователи" text="Зарегистрированные пользователи, роли и подтверждение email." />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
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
            <table className="w-full min-w-[760px] text-left text-sm">
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
                          "rounded-md px-2.5 py-1 text-xs font-medium",
                          u.role === "admin" ? "bg-brand-blue/10 text-brand-blue" : "bg-brand-surface text-brand-muted",
                        )}
                      >
                        {u.role === "admin" ? "Администратор" : "Пользователь"}
                      </span>
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
                      {u.id !== me.id && (
                        <button
                          disabled={busy === u.id}
                          onClick={() => toggleRole(u.id, u.role === "admin" ? "user" : "admin")}
                          className="rounded-lg border border-brand-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-brand-surface disabled:opacity-50"
                        >
                          {u.role === "admin" ? "Снять админа" : "Сделать админом"}
                        </button>
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
    </>
  );
}
