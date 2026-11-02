import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { WsCard } from "@/components/workspace/WorkspaceLayout";
import { areaCls, btnPrimary, Field, inputCls, Notice } from "@/components/strategies/admin/fields";
import { requirePermission } from "@/lib/adminGuard";
import { financeOrderFn, fmtDate, ORDER_STATUS, PURPOSE_LABEL, refundFn, rub } from "@/lib/billing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/finance/$orderId")({
  beforeLoad: ({ context }) => requirePermission(context, "purchases"),
  loader: ({ params }) => financeOrderFn({ data: { id: Number(params.orderId) || 0 } }),
  head: () => ({ meta: [{ title: "Заказ — бухгалтерия JETRA" }] }),
  component: OrderPage,
});

const PAY_STATUS: Record<string, string> = { succeeded: "Успешно", failed: "Отказ", rejected: "Отклонён системой" };

function OrderPage() {
  const r = Route.useLoaderData();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [revoke, setRevoke] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  if (!r.ok) return <Notice kind="error">{r.message}</Notice>;
  const o = r.order;
  const left = o.amount - o.refundedAmount;
  const canRefund = (o.status === "paid" || o.status === "partially_refunded") && left > 0;

  const refund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm) return setConfirm(true);
    setBusy(true);
    setError("");
    const x = await refundFn({ data: { orderId: o.id, amount: amount || String(left), reason, revokeAccess: revoke, confirm: `refund-${o.id}` } });
    setBusy(false);
    setConfirm(false);
    if (!x.ok) return setError(x.message);
    setOk("Возврат оформлен");
    setAmount("");
    setReason("");
    router.invalidate();
  };

  return (
    <>
      <Link to="/admin/finance" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
        <Icon name="ArrowLeft" size={16} /> Бухгалтерия
      </Link>
      <div className="mb-6 mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[26px] font-bold">Заказ №{o.id}</h1>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", ORDER_STATUS[o.status].cls)}>{ORDER_STATUS[o.status].label}</span>
        {o.isTest && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">Тестовый</span>}
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {ok && <Notice kind="ok">{ok}</Notice>}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <WsCard>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ["Клиент", `${o.user?.name} · ${o.user?.email}`],
                ["Продукт", o.title],
                ["Назначение", PURPOSE_LABEL[o.purpose]],
                ["Тариф (на момент заказа)", `${o.snapshot.tariff ?? "—"}${o.snapshot.periodValue ? ` · ${o.snapshot.periodValue} ${o.snapshot.periodUnit === "day" ? "дн." : "мес."}` : ""}`],
                ["Сумма", rub(o.amount)],
                ["Зачтено при переходе", o.credit ? rub(o.credit) : "—"],
                ["Возвращено", o.refundedAmount ? rub(o.refundedAmount) : "—"],
                ["Платёжная система", o.provider],
                ["Создан", fmtDate(o.createdAt, true)],
                ["Оплачен", fmtDate(o.paidAt, true)],
                ["Автопродление", o.autoRenew ? "с согласия клиента" : "нет"],
                ["Доступ", r.access ? `${fmtDate(r.access.starts_at)} — ${fmtDate(r.access.ends_at)}${r.access.revoked_at ? " (отозван)" : ""}` : "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-brand-muted">{k}</dt>
                  <dd className="mt-0.5 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </WsCard>
          <WsCard className="p-0">
            <div className="border-b border-brand-ink/[0.08] px-5 py-3 font-display font-semibold">Уведомления платёжной системы</div>
            {r.payments.length ? (
              <ul className="divide-y divide-brand-ink/[0.06] text-sm">
                {r.payments.map((p) => (
                  <li key={p.id} className="px-5 py-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{PAY_STATUS[p.status] ?? p.status} · {rub(p.amount)}</span>
                      <span className="text-brand-muted">{fmtDate(p.created_at, true)}</span>
                    </div>
                    <div className="text-xs text-brand-muted">{p.provider} · {p.external_id}{p.is_test && " · тест"}{p.note && ` · ${p.note}`}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-brand-muted">Уведомлений не было. Пока платёжная система не подтвердит оплату на сервере, доступ не выдаётся.</p>
            )}
          </WsCard>
        </div>

        <div className="space-y-5">
          {canRefund && (
            <WsCard>
              <div className="font-display text-lg font-semibold">Возврат</div>
              <p className="mt-1 text-xs text-brand-muted">
                Здесь фиксируется возврат в учёте. {o.provider === "robokassa" ? "Сами деньги возвращаются в личном кабинете Robokassa." : ""}
              </p>
              <form onSubmit={refund} className="mt-4 space-y-3">
                <Field label="Сумма, ₽" hint={`доступно ${rub(left)}`}>
                  <input className={inputCls} inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setConfirm(false); }} placeholder={String(left)} />
                </Field>
                <Field label="Причина"><textarea className={areaCls} rows={2} required value={reason} onChange={(e) => { setReason(e.target.value); setConfirm(false); }} /></Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-[#397FC4]" checked={revoke} onChange={(e) => { setRevoke(e.target.checked); setConfirm(false); }} />
                  Отозвать доступ по этому заказу
                </label>
                <button disabled={busy || !reason.trim()} className={cn(btnPrimary, confirm && "bg-red-600 hover:bg-red-700")}>
                  <Icon name={busy ? "Loader2" : "Undo2"} size={15} className={busy ? "animate-spin" : ""} />
                  {confirm ? `Подтвердить возврат ${rub(Number((amount || String(left)).replace(",", ".")))}` : "Оформить возврат"}
                </button>
              </form>
            </WsCard>
          )}
          {r.refunds.length > 0 && (
            <WsCard>
              <div className="mb-2 font-display font-semibold">История возвратов</div>
              <ul className="space-y-2 text-sm">
                {r.refunds.map((x) => (
                  <li key={x.id}>
                    <span className="font-medium">{rub(x.amount)}</span> · {fmtDate(x.created_at, true)}
                    <div className="text-xs text-brand-muted">{x.reason} · доступ {x.access_action === "revoke" ? "отозван" : "сохранён"}</div>
                  </li>
                ))}
              </ul>
            </WsCard>
          )}
        </div>
      </div>
    </>
  );
}
