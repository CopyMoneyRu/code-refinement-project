import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { checkoutFn, fmtDate, rub, SOURCE_LABEL, type Offer, type OfferTariff } from "@/lib/billing";

type Intent = "buy" | "trial" | "upgrade";

export default function StrategyJoin({ offer }: { offer: Offer | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState<Intent | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    if (offer && selected === null && offer.tariffs.length) setSelected(offer.tariffs[0].id);
  }, [offer, selected]);

  if (!offer) return <p className="mt-6 text-sm text-brand-muted">Не удалось загрузить условия подключения. Обновите страницу.</p>;

  const a = offer.access;
  const tariff = offer.tariffs.find((t) => t.id === selected) ?? null;

  const go = async (intent: Intent) => {
    if (!tariff) return;
    setError("");
    setDone("");
    if (!terms) return setError("Подтвердите согласие с условиями участия");
    setBusy(intent);
    const r = await checkoutFn({ data: { strategyId: offer.strategyId, tariffId: tariff.id, intent, autoRenew: auto, acceptTerms: terms } });
    if (!r.ok) {
      setBusy(null);
      return setError(r.message);
    }
    if (r.result === "granted") {
      setBusy(null);
      setDone(`Доступ открыт до ${fmtDate(r.endsAt ?? null)}`);
      router.invalidate();
      return;
    }
    if (r.redirect?.startsWith("/")) router.navigate({ to: r.redirect });
    else if (r.redirect) window.location.href = r.redirect;
  };

  const priceOf = (t: OfferTariff) => (t.kind === "free" ? "Бесплатно" : rub(t.price));

  return (
    <div className="mt-6">
      {a.active ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-emerald-800">
            <Icon name="CircleCheck" size={17} /> Доступ активен
          </div>
          <div className="mt-1 text-emerald-900/80">
            {SOURCE_LABEL[a.source ?? ""] ?? "Доступ"}
            {a.tariffName && ` · ${a.tariffName}`} · до {fmtDate(a.endsAt)}
          </div>
          {a.queued.length > 0 && <div className="mt-1 text-xs text-emerald-900/70">Оплачено продление: начнётся {fmtDate(a.queued[0].startsAt)}</div>}
          <Link to="/cabinet/strategies" className="mt-3 inline-flex items-center gap-1.5 font-medium text-emerald-800 hover:underline">
            Перейти в «Мои стратегии» <Icon name="ArrowRight" size={14} />
          </Link>
        </div>
      ) : a.lastEndedAt ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Доступ закончился {fmtDate(a.lastEndedAt)}. Продлите, чтобы снова копировать новые сделки.
        </div>
      ) : null}

      {offer.status === "paused" ? (
        <div className="mt-4 rounded-xl bg-brand-surface p-4 text-sm text-brand-muted">Набор в стратегию временно приостановлен. Новые подключения недоступны.</div>
      ) : !offer.tariffs.length ? (
        <div className="mt-4 rounded-xl bg-brand-surface p-4 text-sm text-brand-muted">Тарифы для подключения скоро появятся.</div>
      ) : (
        <>
          <div className="mt-5 text-sm font-medium text-brand-ink">{a.active ? "Продлить или сменить тариф" : "Выберите тариф"}</div>
          <div className="mt-2 space-y-2">
            {offer.tariffs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                className={cn(
                  "w-full rounded-xl border p-3.5 text-left transition-colors",
                  selected === t.id ? "border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue" : "border-brand-ink/12 hover:border-brand-blue/40",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-brand-ink">{t.name}</span>
                  <span className="shrink-0 font-semibold text-brand-ink">{priceOf(t)}</span>
                </div>
                <div className="mt-0.5 text-xs text-brand-muted">
                  {t.kind === "subscription" ? "Подписка" : t.kind === "one_time" ? "Разовая оплата" : "Бесплатный доступ"} на {t.periodLabel}
                  {t.trialAvailable && ` · пробный период ${t.trialDays} дн.`}
                </div>
                {t.description && <div className="mt-1 text-xs leading-relaxed text-brand-muted">{t.description}</div>}
                {t.upgrade && (
                  <div className="mt-1.5 text-xs text-brand-blue">
                    Переход с доплатой: {rub(t.upgrade.toPay)} (зачтено {rub(t.upgrade.credit)})
                  </div>
                )}
              </button>
            ))}
          </div>

          {tariff && (
            <div className="mt-4 space-y-2.5 text-sm">
              {tariff.kind === "subscription" && tariff.autoRenew && offer.payments.recurring && (
                <label className="flex items-start gap-2.5">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#397FC4]" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
                  <span className="text-brand-muted">Продлевать автоматически: списывать {rub(tariff.price)} каждые {tariff.periodLabel}. Отключить можно в любой момент в кабинете.</span>
                </label>
              )}
              <label className="flex items-start gap-2.5">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#397FC4]" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
                <span className="text-brand-muted">
                  Принимаю условия участия, <Link to="/terms" target="_blank" className="text-brand-blue hover:underline">оферту</Link> и понимаю риски потери капитала
                </span>
              </label>
            </div>
          )}

          {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {done && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{done}</div>}

          {tariff && (
            <div className="mt-4 space-y-2">
              {tariff.upgrade ? (
                <button disabled={!!busy} onClick={() => go("upgrade")} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue py-3.5 font-medium text-white hover:bg-[#3271B0] disabled:opacity-60">
                  <Icon name={busy === "upgrade" ? "Loader2" : "ArrowUpCircle"} size={17} className={busy === "upgrade" ? "animate-spin" : ""} /> Перейти за {rub(tariff.upgrade.toPay)}
                </button>
              ) : null}
              {tariff.trialAvailable && (
                <button disabled={!!busy} onClick={() => go("trial")} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                  <Icon name={busy === "trial" ? "Loader2" : "Sparkles"} size={17} className={busy === "trial" ? "animate-spin" : ""} /> Попробовать бесплатно {tariff.trialDays} дн.
                </button>
              )}
              <button
                disabled={!!busy || offer.payments.mode === "off" && tariff.kind !== "free"}
                onClick={() => go("buy")}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg py-3.5 font-medium disabled:opacity-60",
                  tariff.upgrade || tariff.trialAvailable ? "border border-brand-ink/15 bg-white text-brand-ink hover:bg-brand-surface" : "bg-brand-blue text-white hover:bg-[#3271B0]",
                )}
              >
                <Icon name={busy === "buy" ? "Loader2" : tariff.kind === "free" ? "Check" : "CreditCard"} size={17} className={busy === "buy" ? "animate-spin" : ""} />
                {tariff.kind === "free" ? "Подключить бесплатно" : `${a.active || a.everHad ? "Продлить" : "Оплатить"} ${rub(tariff.price)}`}
              </button>
            </div>
          )}
          {offer.payments.test && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
              <Icon name="FlaskConical" size={14} className="mt-0.5 shrink-0" /> Тестовый режим оплаты: деньги не списываются.
            </p>
          )}
          {offer.payments.mode === "off" && <p className="mt-3 text-xs text-brand-muted">Приём оплат временно отключён.</p>}
        </>
      )}
    </div>
  );
}
