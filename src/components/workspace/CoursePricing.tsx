import Icon from "@/components/ui/icon";
import { formatPrice, monthsLabel, type CourseInput, type CourseTariff } from "@/lib/courses";
import { cn } from "@/lib/utils";

const inputCls =
  "h-11 w-full rounded-lg border border-brand-ink/15 bg-white px-3.5 text-[15px] text-brand-ink focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15";

const toInt = (v: string) => Math.max(0, Math.round(Number(v) || 0));

function Rub({ value, onChange, placeholder }: { value: number; onChange: (v: number) => void; placeholder: string }) {
  return (
    <label className="relative block">
      <input
        className={cn(inputCls, "pr-10")}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={value || ""}
        onChange={(e) => onChange(toInt(e.target.value))}
        placeholder={placeholder}
      />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted">₽</span>
    </label>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-brand-ink/15 bg-white p-1 text-sm">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn("rounded-md px-4 py-1.5 font-medium transition-colors", value === v ? "bg-brand-blue text-white" : "text-brand-muted hover:text-brand-ink")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

const DiscountHint = ({ price, oldPrice }: { price: number; oldPrice: number }) =>
  oldPrice > price && price > 0 ? (
    <div className="mt-1.5 text-xs text-emerald-700">
      Скидка {Math.round(((oldPrice - price) * 100) / oldPrice)}% — в карточке: <s className="text-brand-muted">{formatPrice(oldPrice)}</s> {formatPrice(price)}
    </div>
  ) : oldPrice > 0 && oldPrice <= price ? (
    <div className="mt-1.5 text-xs text-red-600">Старая цена должна быть больше новой</div>
  ) : null;

const newTariff = (): CourseTariff => ({ name: "", price: 0, oldPrice: 0, description: "" });

export default function CoursePricing({ form, onChange }: { form: CourseInput; onChange: (patch: Partial<CourseInput>) => void }) {
  const multi = form.tariffs.length > 0;
  const setTariff = (i: number, patch: Partial<CourseTariff>) =>
    onChange({ tariffs: form.tariffs.map((t, k) => (k === i ? { ...t, ...patch } : t)) });
  const minPrice = multi ? Math.min(...form.tariffs.map((t) => t.price || Infinity)) : 0;

  return (
    <div className="space-y-4">
      <Segmented
        value={form.access}
        options={[["free", "Бесплатный"], ["paid", "Платный"]]}
        onChange={(v) => onChange({ access: v })}
      />

      {form.access === "paid" && (
        <div className="space-y-4 rounded-xl border border-brand-ink/10 bg-white p-4">
          <div>
            <div className="mb-1.5 text-sm font-medium text-brand-ink">Тарифы</div>
            <Segmented
              value={multi ? "multi" : "single"}
              options={[["single", "Один тариф"], ["multi", "Несколько тарифов"]]}
              onChange={(v) =>
                onChange(
                  v === "multi"
                    ? { tariffs: [{ ...newTariff(), name: "Базовый", price: form.price, oldPrice: form.oldPrice }, { ...newTariff(), name: "С обратной связью" }] }
                    : { tariffs: [], price: form.tariffs[0]?.price ?? form.price, oldPrice: form.tariffs[0]?.oldPrice ?? form.oldPrice },
                )
              }
            />
          </div>

          {!multi ? (
            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-brand-muted">Цена</div>
                  <Rub value={form.price} onChange={(v) => onChange({ price: v })} placeholder="990" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-brand-muted">Старая цена (для скидки, необязательно)</div>
                  <Rub value={form.oldPrice} onChange={(v) => onChange({ oldPrice: v })} placeholder="1 490" />
                </div>
              </div>
              <DiscountHint price={form.price} oldPrice={form.oldPrice} />
            </div>
          ) : (
            <div className="space-y-3">
              {form.tariffs.map((t, i) => (
                <div key={i} className="rounded-lg border border-brand-ink/10 bg-brand-light/60 p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-semibold text-brand-blue">{i + 1}</span>
                    <input
                      className={cn(inputCls, "h-10")}
                      value={t.name}
                      maxLength={80}
                      onChange={(e) => setTariff(i, { name: e.target.value })}
                      placeholder="Название тарифа, например «С обратной связью»"
                    />
                    {form.tariffs.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onChange({ tariffs: form.tariffs.filter((_, k) => k !== i) })}
                        className="shrink-0 rounded-md p-2 text-brand-muted hover:bg-red-50 hover:text-red-600"
                        aria-label="Удалить тариф"
                      >
                        <Icon name="Trash2" size={16} />
                      </button>
                    )}
                  </div>
                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                    <Rub value={t.price} onChange={(v) => setTariff(i, { price: v })} placeholder="Цена" />
                    <Rub value={t.oldPrice} onChange={(v) => setTariff(i, { oldPrice: v })} placeholder="Старая цена (необязательно)" />
                  </div>
                  <DiscountHint price={t.price} oldPrice={t.oldPrice} />
                  <textarea
                    className="mt-2.5 min-h-[64px] w-full rounded-lg border border-brand-ink/15 bg-white px-3.5 py-2.5 text-sm text-brand-ink focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
                    value={t.description}
                    maxLength={500}
                    onChange={(e) => setTariff(i, { description: e.target.value })}
                    placeholder="Что входит в тариф (необязательно)"
                  />
                </div>
              ))}
              {form.tariffs.length < 6 && (
                <button
                  type="button"
                  onClick={() => onChange({ tariffs: [...form.tariffs, newTariff()] })}
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-blue hover:underline"
                >
                  <Icon name="Plus" size={15} /> Добавить тариф
                </button>
              )}
              {Number.isFinite(minPrice) && minPrice > 0 && (
                <div className="text-xs text-brand-muted">В каталоге цена покажется как «от {formatPrice(minPrice)}»</div>
              )}
            </div>
          )}

          <div className="border-t border-brand-ink/10 pt-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-brand-blue"
                checked={form.clubMonths > 0}
                onChange={(e) => onChange({ clubMonths: e.target.checked ? 1 : 0 })}
              />
              <span>
                <span className="block text-sm font-medium text-brand-ink">Подписка на клуб «Капиталист» в подарок</span>
                <span className="block text-xs text-brand-muted">Покупатель обучения получает доступ в клуб на выбранный срок</span>
              </span>
            </label>
            {form.clubMonths > 0 && (
              <div className="mt-3 flex items-center gap-3 pl-7">
                <input
                  className={cn(inputCls, "h-10 w-24")}
                  type="number"
                  min={1}
                  max={36}
                  value={form.clubMonths}
                  onChange={(e) => onChange({ clubMonths: Math.min(36, Math.max(1, toInt(e.target.value))) })}
                />
                <span className="text-sm text-brand-muted">{monthsLabel(form.clubMonths).replace(/^\d+\s/, "")} клуба в подарок</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
