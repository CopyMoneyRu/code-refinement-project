import { useState } from "react";
import Icon from "@/components/ui/icon";
import { WsCard } from "@/components/workspace/WorkspaceLayout";
import RiskMeter, { RISK_TEXT } from "@/components/strategies/RiskMeter";
import StrategyCard from "@/components/strategies/StrategyCard";
import { cn } from "@/lib/utils";
import {
  COPY_DEFAULTS,
  EXCHANGE_LABEL,
  LABEL_COLORS,
  saveStrategyFn,
  type AdminStrategy,
  type CopySettings,
  type Exchange,
  type StrategyCategory,
  type StrategyInput,
  type StrategyLabel,
} from "@/lib/strategies";
import ImageUpload from "./ImageUpload";
import { areaCls, btnPrimary, Field, inputCls, Notice, Segmented } from "./fields";

const toInput = (s: AdminStrategy): StrategyInput => ({
  id: s.id,
  title: s.title,
  short: s.short,
  kind: s.kind,
  categoryId: s.category?.id ?? null,
  coverUrl: s.coverUrl,
  risk: s.risk,
  yield: { mode: s.yield.mode, basis: s.yield.basis, from: s.yield.from?.toString() ?? "", to: s.yield.to?.toString() ?? "", period: s.yield.period },
  priceLabel: s.priceLabel,
  exchanges: s.exchanges,
  metrics: s.metrics,
  cardOptions: s.cardOptions,
  labelIds: s.labels.map((l) => l.id),
  accessNote: s.accessNote,
  settings: { ...COPY_DEFAULTS, ...s.settings },
  sort: s.sort,
});

const SETTINGS: { key: keyof CopySettings; label: string; hint: string; suffix: string }[] = [
  { key: "marginPercent", label: "Маржа на сделку", hint: "Доля расчётной базы под маржу", suffix: "%" },
  { key: "maxLeverage", label: "Максимальное плечо", hint: "От 1× до 50×", suffix: "×" },
  { key: "maxRiskPercent", label: "Максимальный риск до стопа", hint: "От расчётной базы", suffix: "%" },
  { key: "maxPositions", label: "Максимум открытых позиций", hint: "На один аккаунт", suffix: "шт." },
  { key: "entryWaitMinutes", label: "Ожидание входа при сбое биржи", hint: "Не больше 5 минут", suffix: "мин" },
  { key: "priceDeviationPercent", label: "Допустимое отклонение цены", hint: "Не больше 2%", suffix: "%" },
];

export default function StrategySettingsForm({
  strategy,
  categories,
  labels,
  onSaved,
}: {
  strategy: AdminStrategy;
  categories: StrategyCategory[];
  labels: StrategyLabel[];
  onSaved: (s: AdminStrategy) => void;
}) {
  const [f, setF] = useState<StrategyInput>(() => toInput(strategy));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const set = <K extends keyof StrategyInput>(k: K, v: StrategyInput[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setOk("");
  };

  const preview: AdminStrategy = {
    ...strategy,
    title: f.title || "Название стратегии",
    short: f.short,
    coverUrl: f.coverUrl,
    category: categories.find((c) => c.id === f.categoryId) ?? null,
    risk: f.risk,
    yield: { ...f.yield, from: f.yield.from === "" ? null : Number(f.yield.from.replace(",", ".")), to: f.yield.to === "" ? null : Number(f.yield.to.replace(",", ".")) },
    priceLabel: f.priceLabel,
    exchanges: f.exchanges,
    metrics: f.metrics.filter((m) => m.label && m.value),
    cardOptions: f.cardOptions,
    labels: labels.filter((l) => f.labelIds.includes(l.id)),
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOk("");
    setBusy(true);
    const r = await saveStrategyFn({ data: f });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setOk("Настройки сохранены");
    onSaved(r.strategy);
  };

  const toggleEx = (e: Exchange) => set("exchanges", f.exchanges.includes(e) ? f.exchanges.filter((x) => x !== e) : [...f.exchanges, e]);

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <WsCard className="space-y-5">
          <div className="font-display text-lg font-semibold">Основное</div>
          <Field label="Название"><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={200} /></Field>
          <Field label="Краткое описание" hint="Для карточки, до 400 символов"><textarea className={areaCls} rows={3} value={f.short} onChange={(e) => set("short", e.target.value)} maxLength={400} /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Категория">
              <select className={inputCls} value={f.categoryId ?? ""} onChange={(e) => set("categoryId", Number(e.target.value) || null)}>
                <option value="">Без категории</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Тип стратегии" hint="Определяет сценарий подключения">
              <select className={inputCls} value={f.kind} onChange={(e) => set("kind", e.target.value as StrategyInput["kind"])}>
                <option value="generic">Информационная / другие направления</option>
                <option value="copytrading">Копитрейдинг криптовалют</option>
              </select>
            </Field>
          </div>
          <Field label="Изображение карточки"><div className="max-w-sm"><ImageUpload value={f.coverUrl} onChange={(v) => set("coverUrl", v)} /></div></Field>
        </WsCard>

        <WsCard className="space-y-5">
          <div className="font-display text-lg font-semibold">Риск и доходность</div>
          <div>
            <div className="mb-2 text-sm font-medium">Надёжность: {f.risk.level} из 5 — {RISK_TEXT[f.risk.level]}</div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => set("risk", { ...f.risk, level: n })} className={cn("h-9 w-9 rounded-lg border text-sm font-semibold", f.risk.level === n ? "border-brand-blue bg-brand-blue text-white" : "border-brand-ink/15 hover:bg-brand-surface")}>
                    {n}
                  </button>
                ))}
              </div>
              <Segmented value={f.risk.style} options={[["stars", "Звёзды"], ["bars", "Столбики"]]} onChange={(v) => set("risk", { ...f.risk, style: v })} />
              <RiskMeter level={f.risk.level} style={f.risk.style} />
            </div>
            <p className="mt-2 text-xs text-brand-muted">1 — наиболее высокий риск, 5 — наименьший.</p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Segmented value={f.yield.mode} options={[["none", "Не показывать"], ["fixed", "Процент"], ["range", "Диапазон"]]} onChange={(v) => set("yield", { ...f.yield, mode: v })} />
              {f.yield.mode !== "none" && <Segmented value={f.yield.basis} options={[["forecast", "Прогнозная"], ["actual", "Фактическая"]]} onChange={(v) => set("yield", { ...f.yield, basis: v })} />}
            </div>
            {f.yield.mode !== "none" && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={f.yield.mode === "range" ? "От, %" : "Доходность, %"}><input className={inputCls} inputMode="decimal" value={f.yield.from} onChange={(e) => set("yield", { ...f.yield, from: e.target.value })} /></Field>
                {f.yield.mode === "range" && <Field label="До, %"><input className={inputCls} inputMode="decimal" value={f.yield.to} onChange={(e) => set("yield", { ...f.yield, to: e.target.value })} /></Field>}
                <Field label="Период"><input className={inputCls} value={f.yield.period} onChange={(e) => set("yield", { ...f.yield, period: e.target.value })} placeholder="в год" /></Field>
              </div>
            )}
          </div>
        </WsCard>

        <WsCard className="space-y-5">
          <div className="font-display text-lg font-semibold">Карточка в каталоге</div>
          <Field label="Стоимость участия" hint="Текст на карточке, например «от 4 900 ₽ в месяц»"><input className={inputCls} value={f.priceLabel} onChange={(e) => set("priceLabel", e.target.value)} maxLength={120} /></Field>
          <div>
            <div className="mb-1.5 text-sm font-medium">Поддерживаемые биржи</div>
            <div className="flex gap-2">
              {(Object.keys(EXCHANGE_LABEL) as Exchange[]).map((e) => (
                <button key={e} type="button" onClick={() => toggleEx(e)} className={cn("inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium", f.exchanges.includes(e) ? "border-brand-blue bg-brand-blue/5 text-brand-ink ring-1 ring-brand-blue" : "border-brand-ink/15 text-brand-muted")}>
                  {f.exchanges.includes(e) && <Icon name="Check" size={14} className="text-brand-blue" />} {EXCHANGE_LABEL[e]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium">Дополнительные показатели на карточке</div>
            <div className="space-y-2">
              {f.metrics.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputCls} value={m.label} onChange={(e) => set("metrics", f.metrics.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Название, например «Сделок в месяц»" maxLength={60} />
                  <input className={cn(inputCls, "w-40")} value={m.value} onChange={(e) => set("metrics", f.metrics.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="Значение" maxLength={40} />
                  <button type="button" onClick={() => set("metrics", f.metrics.filter((_, j) => j !== i))} className="px-2 text-brand-muted hover:text-red-600" aria-label="Удалить"><Icon name="X" size={16} /></button>
                </div>
              ))}
              {f.metrics.length < 8 && (
                <button type="button" onClick={() => set("metrics", [...f.metrics, { label: "", value: "" }])} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:underline">
                  <Icon name="Plus" size={15} /> Показатель
                </button>
              )}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium">Что показывать на карточке</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {([["showRisk", "Риск"], ["showYield", "Доходность"], ["showPrice", "Стоимость"], ["showExchanges", "Биржи"]] as const).map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-[#397FC4]" checked={f.cardOptions[k]} onChange={(e) => set("cardOptions", { ...f.cardOptions, [k]: e.target.checked })} /> {l}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium">Метки</div>
            {labels.length ? (
              <div className="flex flex-wrap gap-2">
                {labels.map((l) => {
                  const on = f.labelIds.includes(l.id);
                  return (
                    <button key={l.id} type="button" onClick={() => set("labelIds", on ? f.labelIds.filter((x) => x !== l.id) : [...f.labelIds, l.id])} className={cn("rounded-md px-2.5 py-1 text-xs font-medium", LABEL_COLORS[l.color], on ? "ring-2 ring-brand-blue ring-offset-1" : "opacity-60 hover:opacity-100")}>
                      {on && "✓ "}{l.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-brand-muted">Меток пока нет — создайте их во вкладке «Метки» списка стратегий.</p>
            )}
          </div>
          <Field label="Условия доступа" hint="Показываются на странице рядом с кнопкой подключения"><textarea className={areaCls} rows={3} value={f.accessNote} onChange={(e) => set("accessNote", e.target.value)} maxLength={4000} /></Field>
          <Field label="Порядок в каталоге" hint="Меньше — выше"><input className={cn(inputCls, "w-32")} type="number" value={f.sort} onChange={(e) => set("sort", Number(e.target.value) || 0)} /></Field>
        </WsCard>

        {f.kind === "copytrading" && (
          <WsCard className="space-y-5">
            <div>
              <div className="font-display text-lg font-semibold">Риск-менеджмент копитрейдинга</div>
              <p className="mt-1 text-sm text-brand-muted">Инструменты: USDT perpetual futures, режим Isolated Margin, One-way. Эти лимиты будут проверяться при создании каждой сделки.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {SETTINGS.map((x) => (
                <Field key={x.key} label={`${x.label}, ${x.suffix}`} hint={x.hint}>
                  <input className={inputCls} inputMode="decimal" value={String(f.settings[x.key] ?? "")} onChange={(e) => set("settings", { ...f.settings, [x.key]: e.target.value })} />
                </Field>
              ))}
            </div>
          </WsCard>
        )}

        {error && <Notice kind="error">{error}</Notice>}
        {ok && <Notice kind="ok">{ok}</Notice>}
        <div className="sticky bottom-4 z-10 flex justify-end">
          <button disabled={busy} className={cn(btnPrimary, "shadow-lg")}>
            <Icon name={busy ? "Loader2" : "Save"} size={16} className={busy ? "animate-spin" : ""} /> Сохранить настройки
          </button>
        </div>
      </div>

      <div className="xl:sticky xl:top-24 xl:self-start">
        <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-brand-muted">Карточка в каталоге</div>
        <StrategyCard s={preview} preview />
      </div>
    </form>
  );
}
