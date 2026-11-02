import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { EmptyState, WsCard } from "@/components/workspace/WorkspaceLayout";
import { cn } from "@/lib/utils";
import { accessGrantFn, accessRevokeFn, adminAccessFn, fmtDate, SOURCE_LABEL, type AccessRow } from "@/lib/billing";
import { btnPrimary, Field, inputCls, Notice } from "./fields";

const stateOf = (a: AccessRow) => {
  if (a.revokedAt) return { label: "Отозван", cls: "bg-red-50 text-red-700" };
  const now = Date.now();
  if (new Date(a.endsAt).getTime() <= now) return { label: "Истёк", cls: "bg-slate-100 text-slate-600" };
  if (new Date(a.startsAt).getTime() > now) return { label: "Запланирован", cls: "bg-brand-blue/10 text-brand-blue" };
  return { label: "Активен", cls: "bg-emerald-50 text-emerald-700" };
};

export default function AccessManager({ strategyId }: { strategyId: number }) {
  const [items, setItems] = useState<AccessRow[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", days: 30, note: "", afterCurrent: true });
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    adminAccessFn({ data: { strategyId } }).then((r) => (r.ok ? setItems(r.items) : setError(r.message)));
  }, [strategyId]);
  useEffect(load, [load]);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const r = await accessGrantFn({ data: { strategyId, ...form } });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setNotice(`Доступ выдан: ${r.userName}, до ${fmtDate(r.endsAt)}`);
    setForm({ ...form, email: "", note: "" });
    load();
  };

  const revoke = async (a: AccessRow) => {
    const reason = window.prompt(`Причина отзыва доступа для ${a.user.email}:`);
    if (!reason?.trim()) return;
    setBusy(true);
    const r = await accessRevokeFn({ data: { id: a.id, reason } });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setNotice("Доступ отозван");
    load();
  };

  const list = (items ?? []).filter((a) => !q || a.user.email.toLowerCase().includes(q.toLowerCase()) || a.user.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      {error && <Notice kind="error">{error}</Notice>}
      {notice && <Notice kind="ok">{notice}</Notice>}
      <WsCard>
        <div className="font-display text-lg font-semibold">Выдать бесплатный доступ</div>
        <p className="mt-1 text-sm text-brand-muted">Индивидуальный доступ на определённый срок. Пользователь должен быть зарегистрирован.</p>
        <form onSubmit={grant} className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_1fr_auto] sm:items-end">
          <Field label="Email пользователя"><input className={inputCls} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Дней"><input className={inputCls} type="number" min={1} max={1095} value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) || 1 })} /></Field>
          <Field label="Комментарий"><input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Например, партнёрский доступ" /></Field>
          <button disabled={busy} className={btnPrimary}><Icon name="Gift" size={15} /> Выдать</button>
        </form>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#397FC4]" checked={form.afterCurrent} onChange={(e) => setForm({ ...form, afterCurrent: e.target.checked })} />
          Если доступ уже есть — добавить срок после его окончания
        </label>
      </WsCard>

      <WsCard className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-ink/[0.08] p-4">
          <div className="font-display text-lg font-semibold">Доступы и подписки</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по email или имени" className="h-10 w-full rounded-lg border border-brand-ink/15 px-3 text-sm focus:border-brand-blue focus:outline-none sm:w-64" />
        </div>
        {items === null ? (
          <p className="p-6 text-brand-muted">Загружаем…</p>
        ) : list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-brand-muted">
                <tr>{["Пользователь", "Основание", "Период", "Статус", ""].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/[0.06]">
                {list.map((a) => {
                  const st = stateOf(a);
                  return (
                    <tr key={a.id}>
                      <td className="px-5 py-3"><div className="font-medium">{a.user.name}</div><div className="text-xs text-brand-muted">{a.user.email}</div></td>
                      <td className="px-5 py-3">
                        <div>{SOURCE_LABEL[a.source] ?? a.source}{a.tariff && ` · ${a.tariff}`}</div>
                        <div className="text-xs text-brand-muted">{a.orderId ? `Заказ №${a.orderId}` : a.grantedBy ? `Выдал ${a.grantedBy}` : a.note}</div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">{fmtDate(a.startsAt)} — {fmtDate(a.endsAt)}</td>
                      <td className="px-5 py-3">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", st.cls)}>{st.label}</span>
                        {a.revokeReason && <div className="mt-1 max-w-[200px] text-xs text-brand-muted">{a.revokeReason}</div>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {!a.revokedAt && new Date(a.endsAt).getTime() > Date.now() && (
                          <button disabled={busy} onClick={() => revoke(a)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">Отозвать</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="KeyRound" title="Доступов пока нет" text="Здесь появятся оплаченные подписки, пробные периоды и выданные доступы." />
        )}
      </WsCard>
    </div>
  );
}
