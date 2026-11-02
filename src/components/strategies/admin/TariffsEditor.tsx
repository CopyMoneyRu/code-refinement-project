import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { EmptyState, WsCard } from "@/components/workspace/WorkspaceLayout";
import { cn } from "@/lib/utils";
import { adminTariffsFn, rub, tariffArchiveFn, tariffSaveFn, type Tariff, type TariffInput } from "@/lib/billing";
import { areaCls, btnGhost, btnPrimary, Field, inputCls, Notice, Segmented } from "./fields";

const KIND_LABEL = { free: "Бесплатный", one_time: "Разовая оплата", subscription: "Подписка" } as const;

const empty = (strategyId: number): TariffInput => ({
  strategyId,
  name: "",
  description: "",
  kind: "subscription",
  price: "",
  periodValue: 1,
  periodUnit: "month",
  trialDays: 0,
  autoRenew: true,
  isActive: true,
  position: 0,
});

export default function TariffsEditor({ strategyId }: { strategyId: number }) {
  const [list, setList] = useState<Tariff[] | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [form, setForm] = useState<TariffInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminTariffsFn({ data: { strategyId } }).then((r) => {
      if (!r.ok) return setError(r.message);
      setList(r.tariffs);
      setCanEdit(r.canEdit);
    });
  }, [strategyId]);

  const set = <K extends keyof TariffInput>(k: K, v: TariffInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError("");
    const r = await tariffSaveFn({ data: form });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setList(r.tariffs);
    setForm(null);
  };

  const archive = async (t: Tariff) => {
    if (!window.confirm(`Убрать тариф «${t.name}»? Уже выданные по нему доступы сохранятся.`)) return;
    setBusy(true);
    const r = await tariffArchiveFn({ data: { strategyId, id: t.id } });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setList(r.tariffs);
  };

  if (!list) return <WsCard>{error ? <Notice kind="error">{error}</Notice> : <p className="text-brand-muted">Загружаем тарифы…</p>}</WsCard>;

  return (
    <div className="space-y-5">
      {error && <Notice kind="error">{error}</Notice>}
      <WsCard className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-ink/[0.08] px-5 py-4">
          <div>
            <div className="font-display text-lg font-semibold">Тарифы</div>
            <p className="text-sm text-brand-muted">Подписка начинается сразу после подтверждённой оплаты. Бессрочных тарифов нет.</p>
          </div>
          {canEdit && !form && (
            <button onClick={() => setForm(empty(strategyId))} className={btnPrimary}>
              <Icon name="Plus" size={15} /> Добавить тариф
            </button>
          )}
        </div>
        {list.length ? (
          <ul className="divide-y divide-brand-ink/[0.06]">
            {list.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    <span className="rounded bg-brand-surface px-1.5 py-0.5 text-[11px] text-brand-muted">{KIND_LABEL[t.kind]}</span>
                    {!t.isActive && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">Скрыт</span>}
                    {t.trialDays > 0 && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">Пробный {t.trialDays} дн.</span>}
                    {t.autoRenew && <span className="rounded bg-brand-blue/10 px-1.5 py-0.5 text-[11px] text-brand-blue">Автопродление</span>}
                  </div>
                  <div className="mt-1 text-sm text-brand-muted">
                    {t.kind === "free" ? "Бесплатно" : rub(t.price)} · {t.periodLabel}
                    {t.description && ` · ${t.description}`}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setForm({ id: t.id, strategyId, name: t.name, description: t.description, kind: t.kind, price: String(t.price), periodValue: t.periodValue, periodUnit: t.periodUnit, trialDays: t.trialDays, autoRenew: t.autoRenew, isActive: t.isActive, position: t.position })
                      }
                      className={btnGhost}
                    >
                      <Icon name="Pencil" size={14} /> Изменить
                    </button>
                    <button disabled={busy} onClick={() => archive(t)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50" aria-label="Убрать тариф">
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="Wallet" title="Тарифов пока нет" text="Без тарифов клиенты не смогут подключить стратегию. Добавьте хотя бы один." />
        )}
      </WsCard>

      {form && (
        <WsCard>
          <form onSubmit={save} className="space-y-5">
            <div className="font-display text-lg font-semibold">{form.id ? "Изменить тариф" : "Новый тариф"}</div>
            <Segmented value={form.kind} options={[["subscription", "Подписка"], ["one_time", "Разовая оплата"], ["free", "Бесплатный"]]} onChange={(v) => set("kind", v)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Название"><input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder="Например, «3 месяца»" /></Field>
              {form.kind !== "free" && (
                <Field label="Стоимость, ₽"><input className={inputCls} inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="4900" /></Field>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Срок доступа" hint="Без бессрочных тарифов"><input className={inputCls} type="number" min={1} value={form.periodValue} onChange={(e) => set("periodValue", Number(e.target.value) || 1)} /></Field>
              <Field label="Единица"><select className={inputCls} value={form.periodUnit} onChange={(e) => set("periodUnit", e.target.value as TariffInput["periodUnit"])}><option value="month">месяцев</option><option value="day">дней</option></select></Field>
              {form.kind !== "free" && (
                <Field label="Пробный период, дней" hint="0 — без пробного"><input className={inputCls} type="number" min={0} max={90} value={form.trialDays} onChange={(e) => set("trialDays", Number(e.target.value) || 0)} /></Field>
              )}
            </div>
            <Field label="Описание" hint="Что входит в тариф"><textarea className={areaCls} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={500} /></Field>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {form.kind === "subscription" && (
                <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#397FC4]" checked={form.autoRenew} onChange={(e) => set("autoRenew", e.target.checked)} /> Разрешить автопродление (с согласия клиента)</label>
              )}
              <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#397FC4]" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Показывать клиентам</label>
              <label className="flex items-center gap-2">Порядок <input type="number" className={cn(inputCls, "h-9 w-20")} value={form.position} onChange={(e) => set("position", Number(e.target.value) || 0)} /></label>
            </div>
            {form.id ? <p className="text-xs text-brand-muted">Изменение цены не влияет на уже оплаченные заказы — их условия сохранены в момент оплаты.</p> : null}
            <div className="flex gap-2">
              <button disabled={busy} className={btnPrimary}><Icon name={busy ? "Loader2" : "Save"} size={15} className={busy ? "animate-spin" : ""} /> Сохранить</button>
              <button type="button" onClick={() => setForm(null)} className={btnGhost}>Отмена</button>
            </div>
          </form>
        </WsCard>
      )}
    </div>
  );
}
