import { useEffect, useMemo, useState } from "react";
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { calculate, rub, rubShort, type CalcInput } from "./calc";

const parse = (v: string) => {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function MoneyField({ label, value, max, step, onChange, children }: { label: string; value: number; max: number; step: number; onChange: (v: number) => void; children?: React.ReactNode }) {
  const [text, setText] = useState(value.toLocaleString("ru-RU"));
  useEffect(() => setText(value.toLocaleString("ru-RU")), [value]);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium text-brand-muted">{label}</label>
        {children}
      </div>
      <div className="mt-2 flex items-center rounded-xl border border-brand-ink/10 bg-brand-light px-4 focus-within:border-brand-blue/50">
        <input
          inputMode="numeric"
          value={text}
          aria-label={label}
          onChange={(e) => {
            const n = Math.min(parse(e.target.value), 1e12);
            setText(e.target.value === "" ? "" : n.toLocaleString("ru-RU"));
            onChange(n);
          }}
          onBlur={() => setText(value.toLocaleString("ru-RU"))}
          className="h-12 w-full bg-transparent font-display text-lg font-semibold text-brand-ink outline-none"
        />
        <span className="text-brand-muted">₽</span>
      </div>
      <Slider className="mt-4" min={0} max={max} step={step} value={[Math.min(value, max)]} onValueChange={([v]) => onChange(v)} aria-label={label} />
    </div>
  );
}

function RangeField({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-brand-muted">{label}</label>
        <span className="font-display text-lg font-semibold text-brand-ink">
          {value} {suffix}
        </span>
      </div>
      <Slider className="mt-4" min={min} max={max} step={1} value={[value]} onValueChange={([v]) => onChange(v)} aria-label={label} />
      <div className="mt-2 flex justify-between text-xs text-brand-muted/70">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

const yearsLabel = (n: number) => {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return "год";
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return "года";
  return "лет";
};

export default function CapitalCalculator() {
  const [p, setP] = useState<CalcInput>({ initial: 100_000, add: 10_000, period: "month", years: 5, rate: 30, reinvest: true });
  const set = <K extends keyof CalcInput>(k: K, v: CalcInput[K]) => setP((s) => ({ ...s, [k]: v }));
  const r = useMemo(() => calculate(p), [p]);

  const stats = [
    { label: p.reinvest ? "Итоговый капитал" : "Итоговый капитал (вложенная сумма)", value: r.capital, accent: true },
    { label: "Сумма вложений", value: r.invested },
    { label: p.reinvest ? "Расчётный доход" : "Расчётный доход (условно выведен)", value: r.income },
    { label: "Потенциальный пассивный доход в месяц", value: r.passive, wide: true },
  ];

  return (
    <div className="rounded-[28px] border border-brand-ink/[0.06] bg-white p-5 shadow-[0_30px_80px_-40px_rgba(23,38,60,0.35)] sm:p-8 lg:p-10">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
        <div className="space-y-8">
          <MoneyField label="Первоначальный капитал" value={p.initial} max={100_000_000} step={10_000} onChange={(v) => set("initial", v)} />
          <MoneyField label="Дополнительные вложения" value={p.add} max={1_000_000} step={1_000} onChange={(v) => set("add", v)}>
            <div className="inline-flex rounded-lg bg-brand-surface p-0.5 text-sm">
              {(["month", "year"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set("period", k)}
                  className={cn("rounded-md px-3 py-1 font-medium transition-colors", p.period === k ? "bg-white text-brand-ink shadow-sm" : "text-brand-muted")}
                >
                  {k === "month" ? "Ежемесячно" : "Ежегодно"}
                </button>
              ))}
            </div>
          </MoneyField>
          <RangeField label="Срок инвестирования" value={p.years} min={1} max={30} suffix={yearsLabel(p.years)} onChange={(v) => set("years", v)} />
          <RangeField label="Годовая доходность" value={p.rate} min={0} max={50} suffix="%" onChange={(v) => set("rate", v)} />
          <div className="flex items-center justify-between rounded-xl bg-brand-light px-4 py-3.5">
            <div>
              <div className="text-sm font-medium text-brand-ink">Реинвестирование дохода</div>
              <div className="text-xs text-brand-muted">{p.reinvest ? "Доход ежемесячно добавляется к капиталу" : "Доход условно выводится каждый месяц"}</div>
            </div>
            <Switch checked={p.reinvest} onCheckedChange={(v) => set("reinvest", v)} aria-label="Реинвестирование" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <div key={s.label} className={cn("rounded-2xl p-4 sm:p-5", s.accent ? "col-span-2 bg-brand-ink text-white" : "bg-brand-light", s.wide && "col-span-2")}>
                <div className={cn("text-xs leading-snug sm:text-sm", s.accent ? "text-white/65" : "text-brand-muted")}>{s.label}</div>
                <div className={cn("mt-1.5 break-words font-display font-semibold tracking-tight", s.accent ? "text-3xl sm:text-4xl" : "text-lg sm:text-xl text-brand-ink")}>
                  {rub(s.value)}
                </div>
              </div>
            ))}
            {!p.reinvest && (
              <div className="col-span-2 flex items-center justify-between rounded-2xl border border-brand-blue/20 px-4 py-3 text-sm sm:px-5">
                <span className="text-brand-muted">Общий финансовый результат</span>
                <span className="font-display font-semibold text-brand-ink">{rub(r.total)}</span>
              </div>
            )}
          </div>

          <div className="mt-6 h-[260px] w-full sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={r.points} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="capFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#397FC4" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#397FC4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#17263C" strokeOpacity={0.06} vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#5A6B82" }} tickFormatter={(v) => `${v}`} interval="preserveStartEnd" minTickGap={14} />
                <YAxis tickLine={false} axisLine={false} width={64} tick={{ fontSize: 11, fill: "#5A6B82" }} tickFormatter={rubShort} />
                <Tooltip
                  cursor={{ stroke: "#397FC4", strokeOpacity: 0.3 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof r.points)[number];
                    return (
                      <div className="rounded-xl border border-brand-ink/10 bg-white px-3.5 py-2.5 text-xs shadow-lg">
                        <div className="mb-1 font-semibold text-brand-ink">{d.year === 0 ? "Старт" : `${d.year} ${yearsLabel(d.year)}`}</div>
                        <div className="text-brand-blue">Капитал: {rub(d.capital)}</div>
                        <div className="text-brand-ink/70">Вложения: {rub(d.invested)}</div>
                        {!p.reinvest && <div className="text-emerald-600">Выведено: {rub(d.withdrawn)}</div>}
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="capital" name="Капитал" stroke="#397FC4" strokeWidth={2.5} fill="url(#capFill)" isAnimationActive={false} />
                <Line type="monotone" dataKey="invested" name="Вложения" stroke="#17263C" strokeOpacity={0.55} strokeDasharray="5 5" strokeWidth={2} dot={false} isAnimationActive={false} />
                {!p.reinvest && <Line type="monotone" dataKey="withdrawn" name="Выведено" stroke="#059669" strokeWidth={2} dot={false} isAnimationActive={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-brand-muted">
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-brand-blue" />Расчётная стоимость капитала</span>
            <span className="inline-flex items-center gap-2"><i className="h-0.5 w-4 bg-brand-ink/55" />Собственные вложения</span>
            {!p.reinvest && <span className="inline-flex items-center gap-2"><i className="h-0.5 w-4 bg-emerald-600" />Условно выведенный доход</span>}
          </div>
        </div>
      </div>

      <p className="mt-8 rounded-xl bg-brand-light px-4 py-3.5 text-sm leading-relaxed text-brand-muted">
        Расчёт носит исключительно иллюстративный характер.
        <br />
        Указанная доходность является пользовательским сценарием, не прогнозом и не гарантией.
      </p>
    </div>
  );
}
