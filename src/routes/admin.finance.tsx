import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { inputCls, Notice } from "@/components/strategies/admin/fields";
import { requirePermission } from "@/lib/adminGuard";
import { financeFn, fmtDate, ORDER_STATUS, PURPOSE_LABEL, rub, type FinanceData, type FinanceFilter } from "@/lib/billing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/finance")({
  beforeLoad: ({ context }) => requirePermission(context, "purchases"),
  head: () => ({ meta: [{ title: "Бухгалтерия — JETRA" }] }),
  component: FinancePage,
});

function Stat({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: string }) {
  return (
    <WsCard className="p-5">
      <div className="flex items-center gap-2 text-sm text-brand-muted"><Icon name={icon} size={16} className="text-brand-blue" /> {label}</div>
      <div className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-brand-muted">{hint}</div>}
    </WsCard>
  );
}

function FinancePage() {
  const [f, setF] = useState<FinanceFilter>({ includeTest: true });
  const [data, setData] = useState<FinanceData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"orders" | "refunds">("orders");

  useEffect(() => {
    setLoading(true);
    const h = setTimeout(() => {
      financeFn({ data: f }).then((r) => {
        setLoading(false);
        if (!r.ok) return setError(r.message);
        setError("");
        setData(r);
      });
    }, 250);
    return () => clearTimeout(h);
  }, [f]);

  const set = (patch: Partial<FinanceFilter>) => setF((x) => ({ ...x, ...patch }));
  const s = data?.summary;
  const total = s ? s.strategy.net + s.course.net : 0;

  return (
    <>
      <WsTitle
        title="Бухгалтерия"
        text="Заказы и поступления University и Strategies, подписки и возвраты. Торговая прибыль клиентов не входит в выручку JETRA."
        action={
          <Link to="/admin/settings" className="inline-flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-4 py-2.5 text-sm font-medium hover:bg-brand-surface">
            <Icon name="Settings" size={15} /> Платёжные настройки
          </Link>
        }
      />
      {error && <Notice kind="error">{error}</Notice>}

      <WsCard className="mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_150px_150px_160px_160px]">
          <input className={inputCls} placeholder="Поиск: email, имя, название, № заказа" value={f.q ?? ""} onChange={(e) => set({ q: e.target.value })} />
          <input className={inputCls} type="date" value={f.from ?? ""} onChange={(e) => set({ from: e.target.value })} aria-label="С даты" />
          <input className={inputCls} type="date" value={f.to ?? ""} onChange={(e) => set({ to: e.target.value })} aria-label="По дату" />
          <select className={inputCls} value={f.product ?? ""} onChange={(e) => set({ product: e.target.value })}>
            <option value="">Все продукты</option>
            <option value="strategy">Стратегии</option>
            <option value="course">Обучения</option>
          </select>
          <select className={inputCls} value={f.status ?? ""} onChange={(e) => set({ status: e.target.value })}>
            <option value="">Все статусы</option>
            {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#397FC4]" checked={!!f.includeTest} onChange={(e) => set({ includeTest: e.target.checked })} />
          Учитывать тестовые платежи
        </label>
      </WsCard>

      {s && data && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon="Wallet" label="Чистая выручка" value={rub(total)} hint={`Поступления минус возвраты${f.includeTest ? ", включая тестовые" : ""}`} />
          <Stat icon="LineChart" label="Стратегии" value={rub(s.strategy.net)} hint={`${s.strategy.count} оплат · возвраты ${rub(s.strategy.refunded)}`} />
          <Stat icon="GraduationCap" label="Обучения" value={rub(s.course.net)} hint={`${s.course.count} оплат · возвраты ${rub(s.course.refunded)}`} />
          <Stat
            icon="Repeat"
            label="Активные подписки"
            value={String(data.subscriptions.paid)}
            hint={`пробных ${data.subscriptions.trial} · выданных ${data.subscriptions.granted} · автопродление ${data.subscriptions.autoRenew} · истекают за 7 дней ${data.subscriptions.expiringWeek}`}
          />
        </div>
      )}

      <div className="mb-3 flex gap-1 border-b border-brand-ink/10">
        {([["orders", "Заказы"], ["refunds", "Возвраты"]] as const).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm font-medium", tab === id ? "border-brand-blue text-brand-ink" : "border-transparent text-brand-muted")}>
            {l}
          </button>
        ))}
        {loading && <Icon name="Loader2" size={16} className="ml-2 mt-3 animate-spin text-brand-muted" />}
      </div>

      {tab === "orders" ? (
        <WsCard className="overflow-x-auto p-0">
          {data?.orders.length ? (
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-brand-muted">
                <tr>{["Дата", "Клиент", "Заказ", "Сумма", "Статус", ""].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/[0.06]">
                {data.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-brand-light/60">
                    <td className="whitespace-nowrap px-5 py-3 text-brand-muted">{fmtDate(o.createdAt, true)}</td>
                    <td className="px-5 py-3"><div className="font-medium">{o.user?.name}</div><div className="text-xs text-brand-muted">{o.user?.email}</div></td>
                    <td className="px-5 py-3">
                      <div>{o.title}</div>
                      <div className="text-xs text-brand-muted">
                        №{o.id} · {o.productType === "strategy" ? "Стратегия" : "Обучение"} · {PURPOSE_LABEL[o.purpose]} · {o.provider === "test" ? "тест" : o.provider}
                        {o.isTest && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-800">ТЕСТ</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      {rub(o.amount)}
                      {o.refundedAmount > 0 && <div className="text-xs text-violet-700">−{rub(o.refundedAmount)}</div>}
                    </td>
                    <td className="px-5 py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", ORDER_STATUS[o.status].cls)}>{ORDER_STATUS[o.status].label}</span></td>
                    <td className="px-5 py-3 text-right">
                      <Link to="/admin/finance/$orderId" params={{ orderId: String(o.id) }} className="text-sm font-medium text-brand-blue hover:underline">Открыть</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState icon="Receipt" title={loading ? "Загружаем…" : "Заказов нет"} text="Измените фильтры или дождитесь первых оплат." />
          )}
        </WsCard>
      ) : (
        <WsCard className="overflow-x-auto p-0">
          {data?.refunds.length ? (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-brand-muted">
                <tr>{["Дата", "Заказ", "Сумма", "Причина", "Доступ"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/[0.06]">
                {data.refunds.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-brand-muted">{fmtDate(r.createdAt, true)}</td>
                    <td className="px-5 py-3"><Link to="/admin/finance/$orderId" params={{ orderId: String(r.orderId) }} className="hover:text-brand-blue">№{r.orderId} · {r.title}</Link><div className="text-xs text-brand-muted">{r.email}</div></td>
                    <td className="whitespace-nowrap px-5 py-3">{rub(r.amount)}</td>
                    <td className="px-5 py-3">{r.reason}<div className="text-xs text-brand-muted">{r.by}</div></td>
                    <td className="px-5 py-3">{r.accessAction === "revoke" ? "Отозван" : "Сохранён"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState icon="Undo2" title="Возвратов нет" text="Возвраты оформляются из карточки оплаченного заказа." />
          )}
        </WsCard>
      )}
    </>
  );
}
