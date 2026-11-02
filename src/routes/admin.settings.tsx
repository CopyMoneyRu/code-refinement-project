import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { btnGhost, btnPrimary, Field, inputCls, Notice } from "@/components/strategies/admin/fields";
import { hasGrant } from "@/lib/permissions";
import { paymentSettingsFn, runRenewalsFn, savePaymentSettingsFn, type PaymentSettings } from "@/lib/billing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings")({
  beforeLoad: ({ context }) => {
    const user = (context as { user?: Parameters<typeof hasGrant>[0] }).user;
    if (!user || !hasGrant(user, "settings.global")) throw redirect({ to: "/admin" });
  },
  loader: () => paymentSettingsFn(),
  head: () => ({ meta: [{ title: "Настройки платформы — JETRA" }] }),
  component: SettingsPage,
});

const MODES = {
  test: { label: "Тестовый режим", text: "Оплата имитируется на сервере, деньги не списываются. Доступы выдаются как после настоящей оплаты.", icon: "FlaskConical", cls: "bg-amber-50 text-amber-800" },
  robokassa: { label: "Robokassa", text: "Клиенты оплачивают через Robokassa. Доступ выдаётся только после подписанного уведомления ResultURL.", icon: "CreditCard", cls: "bg-emerald-50 text-emerald-800" },
  off: { label: "Оплата отключена", text: "Новые платные заказы не принимаются. Бесплатные тарифы и пробные периоды работают.", icon: "Ban", cls: "bg-slate-100 text-slate-700" },
} as const;

function SettingsPage() {
  const loaded = Route.useLoaderData();
  const [data, setData] = useState<PaymentSettings | null>(loaded.ok ? loaded : null);
  const [form, setForm] = useState(() => (loaded.ok ? { mode: loaded.settings.mode, robokassaTest: loaded.settings.robokassaTest !== false, robokassa: { ...loaded.settings.robokassa } } : null));
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(loaded.ok ? "" : loaded.message);
  const [ok, setOk] = useState("");

  if (!data || !form) return <Notice kind="error">{error}</Notice>;
  const rk = form.robokassa;
  const setRk = (p: Partial<typeof rk>) => setForm({ ...form, robokassa: { ...rk, ...p } });
  const missing = form.robokassaTest ? data.robokassa.missingTest : data.robokassa.missingLive;

  const save = async () => {
    setBusy(true);
    setError("");
    setOk("");
    const r = await savePaymentSettingsFn({ data: { ...form, confirm } });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setData(r);
    setConfirm("");
    setOk("Настройки сохранены");
  };

  const renewals = async () => {
    setBusy(true);
    const r = await runRenewalsFn();
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setOk(`Проверка продлений: напоминаний ${r.stats.reminders}, списаний ${r.stats.charges}, окончаний ${r.stats.expired}`);
  };

  const current = MODES[data.settings.mode];

  return (
    <>
      <WsTitle title="Настройки платформы" text="Платёжные провайдеры, режим приёма оплат и продления подписок." />
      {error && <Notice kind="error">{error}</Notice>}
      {ok && <Notice kind="ok">{ok}</Notice>}

      <WsCard className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium", current.cls)}>
            <Icon name={current.icon} size={15} /> Сейчас: {current.label}
            {data.settings.mode === "robokassa" && data.settings.robokassaTest !== false && " (тестовые платежи Robokassa)"}
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {(Object.keys(MODES) as (keyof typeof MODES)[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setForm({ ...form, mode: m })}
              className={cn("rounded-xl border p-4 text-left", form.mode === m ? "border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue" : "border-brand-ink/12 hover:border-brand-blue/40")}
            >
              <div className="flex items-center gap-2 font-medium"><Icon name={MODES[m].icon} size={16} className="text-brand-blue" /> {MODES[m].label}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-brand-muted">{MODES[m].text}</p>
            </button>
          ))}
        </div>
      </WsCard>

      <WsCard className="mb-5 space-y-5">
        <div>
          <div className="font-display text-lg font-semibold">Robokassa</div>
          <p className="mt-1 text-sm text-brand-muted">Адаптер готов. Подключите его после переноса сайта на финальный домен и получения реквизитов магазина.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Идентификатор магазина (MerchantLogin)"><input className={inputCls} value={rk.login} onChange={(e) => setRk({ login: e.target.value })} /></Field>
          <Field label="Алгоритм подписи" hint="Как в настройках магазина">
            <select className={inputCls} value={rk.hashAlg} onChange={(e) => setRk({ hashAlg: e.target.value })}>
              {["md5", "sha1", "sha256", "sha384", "sha512"].map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#397FC4]" checked={form.robokassaTest} onChange={(e) => setForm({ ...form, robokassaTest: e.target.checked })} /> Тестовые платежи Robokassa (IsTest)</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#397FC4]" checked={rk.recurring} onChange={(e) => setRk({ recurring: e.target.checked })} /> Рекуррентные платежи подключены в Robokassa</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#397FC4]" checked={rk.fiscal} onChange={(e) => setRk({ fiscal: e.target.checked })} /> Передавать чек (54-ФЗ)</label>
        </div>
        {rk.fiscal && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Система налогообложения">
              <select className={inputCls} value={rk.sno} onChange={(e) => setRk({ sno: e.target.value })}>
                <option value="usn_income">УСН «доходы»</option>
                <option value="usn_income_outcome">УСН «доходы минус расходы»</option>
                <option value="osn">ОСН</option>
                <option value="patent">Патент</option>
                <option value="esn">ЕСХН</option>
              </select>
            </Field>
            <Field label="Ставка НДС">
              <select className={inputCls} value={rk.tax} onChange={(e) => setRk({ tax: e.target.value })}>
                {["none", "vat0", "vat5", "vat7", "vat10", "vat20", "vat22"].map((v) => <option key={v} value={v}>{v === "none" ? "Без НДС" : v.replace("vat", "НДС ") + "%"}</option>)}
              </select>
            </Field>
          </div>
        )}
        <div className="rounded-lg bg-brand-light p-4 text-sm">
          <div className="font-medium">Что указать в личном кабинете Robokassa</div>
          <ul className="mt-2 space-y-1 text-brand-muted">
            <li>Result URL (метод POST): адрес функции стратегий с параметром <code className="rounded bg-white px-1">?action=robokassa_result</code></li>
            <li>Success URL и Fail URL: <code className="rounded bg-white px-1">{data.robokassa.successUrl.replace("?status=success", "")}</code></li>
            <li>Пароли №1 и №2 — добавляются как секреты проекта: ROBOKASSA_PASSWORD1/2 и ROBOKASSA_TEST_PASSWORD1/2</li>
          </ul>
          {missing.length > 0 ? (
            <p className="mt-3 flex items-start gap-2 text-amber-800"><Icon name="TriangleAlert" size={15} className="mt-0.5 shrink-0" /> Не хватает: {missing.join(", ")}</p>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-emerald-700"><Icon name="CircleCheck" size={15} /> Всё необходимое для {form.robokassaTest ? "тестовых" : "реальных"} платежей заполнено</p>
          )}
        </div>
      </WsCard>

      {form.mode === "robokassa" && data.settings.mode !== "robokassa" && (
        <WsCard className="mb-5 border-red-200 bg-red-50/40">
          <div className="flex items-center gap-2 font-medium text-red-800"><Icon name="ShieldAlert" size={17} /> Включение приёма платежей</div>
          {data.canEnableLive ? (
            <>
              <p className="mt-1 text-sm text-red-900/80">Только супер администратор. Введите <b>ВКЛЮЧИТЬ ОПЛАТУ</b>, чтобы подтвердить.</p>
              <input className={cn(inputCls, "mt-3 max-w-xs")} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </>
          ) : (
            <p className="mt-1 text-sm text-red-900/80">Включить Robokassa может только супер администратор.</p>
          )}
        </WsCard>
      )}

      <div className="flex flex-wrap gap-3">
        <button disabled={busy} onClick={save} className={btnPrimary}><Icon name={busy ? "Loader2" : "Save"} size={15} className={busy ? "animate-spin" : ""} /> Сохранить</button>
        <button disabled={busy} onClick={renewals} className={btnGhost}><Icon name="RefreshCw" size={15} /> Проверить продления сейчас</button>
      </div>
      <p className="mt-3 max-w-2xl text-xs text-brand-muted">
        Напоминания об окончании и автопродления обрабатываются раз в сутки. Сейчас запуск ручной; на этапе торгового сервера он будет выполняться автоматически по расписанию.
      </p>
    </>
  );
}
