import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { btnPrimary, inputCls, Notice } from "@/components/strategies/admin/fields";
import { hasGrant, STAFF_PERMISSION_GROUPS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { staffGrantFn, staffListFn, staffRevokeFn, type StaffData } from "@/lib/strategies";

export const Route = createFileRoute("/admin/staff")({
  beforeLoad: ({ context }) => {
    const user = (context as { user?: Parameters<typeof hasGrant>[0] }).user;
    if (!user || !hasGrant(user, "staff.manage")) throw redirect({ to: "/admin" });
  },
  loader: () => staffListFn(),
  head: () => ({ meta: [{ title: "Сотрудники и разрешения — JETRA" }] }),
  component: StaffPage,
});

const ACTION_TEXT: Record<string, string> = { "permission.grant": "выдал", "permission.revoke": "отозвал" };

function StaffPage() {
  const loaded = Route.useLoaderData();
  const [data, setData] = useState<StaffData | null>(loaded.ok ? loaded : null);
  const [error, setError] = useState(loaded.ok ? "" : loaded.message);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<number | null>(data?.staff.find((x) => x.role === "admin")?.id ?? null);
  const [perm, setPerm] = useState("");
  const [scope, setScope] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const permMap = useMemo(() => new Map((data?.permissions ?? []).map((p) => [p.id, p])), [data]);
  const stratMap = useMemo(() => new Map((data?.strategies ?? []).map((s) => [s.id, s.title])), [data]);

  if (!data) return <Notice kind="error">{error}</Notice>;

  const member = data.staff.find((x) => x.id === selected);
  const grants = data.grants.filter((g) => g.userId === selected);
  const def = permMap.get(perm);

  const grant = async () => {
    if (!selected || !perm) return;
    setBusy(true);
    setError("");
    setNotice("");
    const r = await staffGrantFn({ data: { userId: selected, permission: perm, strategyId: def?.perStrategy ? scope || null : null } });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setData(r);
    setNotice(`Разрешение «${def?.label}» выдано`);
    setPerm("");
    setScope(0);
  };

  const revoke = async (id: number, label: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    const r = await staffRevokeFn({ data: { id } });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setData(r);
    setNotice(`Разрешение «${label}» отозвано`);
  };

  return (
    <>
      <WsTitle title="Сотрудники и разрешения" text="Права выдаются по функциям: на всю платформу или на конкретную стратегию. Все изменения записываются в журнал." />
      {error && <Notice kind="error">{error}</Notice>}
      {notice && <Notice kind="ok">{notice}</Notice>}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <WsCard className="p-0">
          <div className="border-b border-brand-ink/[0.08] px-4 py-3 text-sm text-brand-muted">
            Сотрудники назначаются из пользователей в разделе «Пользователи» (роль «Администратор»).
          </div>
          <ul className="divide-y divide-brand-ink/[0.06]">
            {data.staff.map((m) => (
              <li key={m.id}>
                <button
                  disabled={m.role === "superadmin"}
                  onClick={() => setSelected(m.id)}
                  className={cn("flex w-full items-center gap-3 px-4 py-3 text-left text-sm", selected === m.id ? "bg-brand-blue/5" : "hover:bg-brand-light", m.role === "superadmin" && "cursor-default")}
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", m.role === "superadmin" ? "bg-brand-ink text-white" : "bg-brand-surface text-brand-blue")}>
                    <Icon name={m.role === "superadmin" ? "Crown" : "UserRound"} size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.name}</span>
                    <span className="block truncate text-xs text-brand-muted">{m.role === "superadmin" ? "Супер администратор · все права" : m.email}</span>
                  </span>
                  {m.role === "admin" && <span className="text-xs tabular-nums text-brand-muted">{data.grants.filter((g) => g.userId === m.id).length}</span>}
                </button>
              </li>
            ))}
          </ul>
        </WsCard>

        <div className="space-y-6">
          {member ? (
            <>
              <WsCard>
                <div className="font-display text-lg font-semibold">{member.name}</div>
                <div className="text-sm text-brand-muted">{member.email}</div>
                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <select className={inputCls} value={perm} onChange={(e) => { setPerm(e.target.value); setScope(0); }}>
                    <option value="">Выберите разрешение…</option>
                    {STAFF_PERMISSION_GROUPS.slice(0, 3).map((g) => (
                      <optgroup key={g.title} label={g.title}>
                        {g.items.map((id) => {
                          const p = permMap.get(id);
                          return p ? <option key={id} value={id}>{p.label}</option> : null;
                        })}
                      </optgroup>
                    ))}
                  </select>
                  <select className={inputCls} value={scope} disabled={!def?.perStrategy} onChange={(e) => setScope(Number(e.target.value))}>
                    <option value={0}>Все стратегии / вся платформа</option>
                    {def?.perStrategy && data.strategies.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                  <button disabled={!perm || busy} onClick={grant} className={btnPrimary}>
                    <Icon name="Plus" size={15} /> Выдать
                  </button>
                </div>
                <p className="mt-2 text-xs text-brand-muted">«Аварийное закрытие» и «Включение реальной торговли» доступны только супер администратору и сотрудникам не выдаются.</p>
              </WsCard>
              <WsCard className="p-0">
                {grants.length ? (
                  <ul className="divide-y divide-brand-ink/[0.06]">
                    {grants.map((g) => {
                      const p = permMap.get(g.permission);
                      return (
                        <li key={g.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                          <Icon name="KeyRound" size={16} className="shrink-0 text-brand-blue" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{p?.label ?? g.permission}</div>
                            <div className="text-xs text-brand-muted">
                              {g.strategyId ? `Стратегия: ${stratMap.get(g.strategyId) ?? `#${g.strategyId}`}` : p?.perStrategy ? "Все стратегии" : "Вся платформа"}
                              {g.grantedBy && ` · выдал ${g.grantedBy}`} · {new Date(g.createdAt).toLocaleDateString("ru-RU")}
                            </div>
                          </div>
                          <button disabled={busy} onClick={() => revoke(g.id, p?.label ?? g.permission)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                            Отозвать
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState icon="KeyRound" title="Разрешений нет" text="Выберите разрешение и область действия выше." />
                )}
              </WsCard>
            </>
          ) : (
            <WsCard>
              <EmptyState icon="Users" title="Выберите сотрудника" text="Если в списке никого нет — назначьте пользователю роль администратора в разделе «Пользователи»." />
            </WsCard>
          )}

          <WsCard>
            <div className="mb-3 font-display text-lg font-semibold">Журнал изменений прав</div>
            {data.log.length ? (
              <ul className="space-y-2 text-sm">
                {data.log.map((l, i) => {
                  const d = l.details as { user?: string; permission?: string; strategyId?: number | null };
                  return (
                    <li key={i} className="flex flex-wrap gap-x-2 text-brand-ink/85">
                      <span className="text-brand-muted">{new Date(l.at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      <span>
                        {l.actor ?? "Система"} {ACTION_TEXT[l.action] ?? l.action} «{permMap.get(d.permission ?? "")?.label ?? d.permission}» — {d.user}
                        {d.strategyId ? ` (${stratMap.get(d.strategyId) ?? `#${d.strategyId}`})` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-brand-muted">Изменений пока не было.</p>
            )}
          </WsCard>
        </div>
      </div>
    </>
  );
}
