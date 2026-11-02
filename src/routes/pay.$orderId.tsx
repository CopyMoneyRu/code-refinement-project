import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import PublicLayout from "@/components/site/PublicLayout";
import { requireAuth } from "@/lib/requireAuth";
import { cancelOrderFn, fmtDate, ORDER_STATUS, orderFn, rub, testPayFn } from "@/lib/billing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pay/$orderId")({
  beforeLoad: requireAuth,
  loader: ({ params }) => orderFn({ data: { id: Number(params.orderId) || 0 } }),
  head: () => ({ meta: [{ title: "Оплата заказа — JETRA" }, { name: "robots", content: "noindex" }] }),
  component: PayPage,
});

function PayPage() {
  const r = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "success" | "fail" | "cancel">("");
  const [error, setError] = useState("");

  if (!r.ok) {
    return (
      <PublicLayout>
        <div className="container-x py-20 text-center text-brand-muted">{r.message}</div>
      </PublicLayout>
    );
  }
  const o = r.order;
  const st = ORDER_STATUS[o.status];

  const pay = async (outcome: "success" | "fail") => {
    setBusy(outcome);
    setError("");
    const x = await testPayFn({ data: { id: o.id, outcome } });
    setBusy("");
    if (!x.ok) return setError(x.message);
    router.invalidate();
  };

  const cancel = async () => {
    setBusy("cancel");
    const x = await cancelOrderFn({ data: { id: o.id } });
    setBusy("");
    if (!x.ok) return setError(x.message);
    router.invalidate();
  };

  return (
    <PublicLayout>
      <section className="py-12 md:py-16">
        <div className="container-x max-w-xl">
          <div className="rounded-2xl border border-brand-ink/10 bg-white p-7 md:p-9">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-brand-muted">Заказ №{o.id}</span>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", st.cls)}>{st.label}</span>
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold text-brand-ink">{o.title}</h1>
            <dl className="mt-6 space-y-2.5 border-t border-brand-ink/10 pt-5 text-sm">
              {o.credit > 0 && (
                <div className="flex justify-between"><dt className="text-brand-muted">Зачтено с текущего тарифа</dt><dd>−{rub(o.credit)}</dd></div>
              )}
              <div className="flex justify-between text-base"><dt className="text-brand-muted">К оплате</dt><dd className="font-semibold">{rub(o.amount)}</dd></div>
              {o.autoRenew && <div className="flex justify-between"><dt className="text-brand-muted">Автопродление</dt><dd>включено</dd></div>}
              {o.paidAt && <div className="flex justify-between"><dt className="text-brand-muted">Оплачен</dt><dd>{fmtDate(o.paidAt, true)}</dd></div>}
              {o.access && <div className="flex justify-between"><dt className="text-brand-muted">Доступ</dt><dd>{fmtDate(o.access.startsAt)} — {fmtDate(o.access.endsAt)}</dd></div>}
              {o.failureReason && <div className="flex justify-between"><dt className="text-brand-muted">Причина</dt><dd className="text-red-700">{o.failureReason}</dd></div>}
            </dl>

            {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            {o.status === "pending" && o.provider === "test" && (
              <div className="mt-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-5">
                <div className="flex items-center gap-2 font-medium text-amber-900">
                  <Icon name="FlaskConical" size={18} /> Тестовая платёжная форма
                </div>
                <p className="mt-1.5 text-sm text-amber-900/80">
                  Реальная оплата пока не подключена. Кнопка ниже имитирует уведомление банка на сервере — деньги не списываются, доступ выдаётся так же, как после настоящей оплаты.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button disabled={!!busy} onClick={() => pay("success")} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-blue py-3 font-medium text-white hover:bg-[#3271B0] disabled:opacity-60">
                    <Icon name={busy === "success" ? "Loader2" : "CreditCard"} size={17} className={busy === "success" ? "animate-spin" : ""} /> Оплатить {rub(o.amount)}
                  </button>
                  <button disabled={!!busy} onClick={() => pay("fail")} className="flex items-center justify-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-4 py-3 text-sm font-medium hover:bg-brand-surface disabled:opacity-60">
                    Имитировать отказ банка
                  </button>
                </div>
              </div>
            )}

            {o.status === "paid" && (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                <div className="flex items-center gap-2 font-medium"><Icon name="CircleCheck" size={18} /> Оплата подтверждена</div>
                <p className="mt-1">Доступ открыт{o.access ? ` до ${fmtDate(o.access.endsAt)}` : ""}.{o.isTest ? " Это тестовый платёж." : ""}</p>
              </div>
            )}
            {o.status === "failed" && <p className="mt-6 text-sm text-brand-muted">Оплата не прошла. Вернитесь на страницу стратегии и оформите заказ заново.</p>}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {o.status === "paid" ? (
                <Link to="/cabinet/strategies" className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-3 font-medium text-white hover:bg-[#3271B0]">
                  Мои стратегии <Icon name="ArrowRight" size={16} />
                </Link>
              ) : (
                o.strategySlug && (
                  <Link to="/strategies/$slug" params={{ slug: o.strategySlug }} className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
                    <Icon name="ArrowLeft" size={15} /> К стратегии
                  </Link>
                )
              )}
              {o.status === "pending" && (
                <button disabled={!!busy} onClick={cancel} className="ml-auto text-sm text-brand-muted hover:text-red-600">
                  Отменить заказ
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
