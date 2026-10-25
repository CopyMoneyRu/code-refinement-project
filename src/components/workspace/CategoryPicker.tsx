import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Icon from "@/components/ui/icon";
import { saveCategoryFn, type CourseCategory } from "@/lib/courses";
import { cn } from "@/lib/utils";

export default function CategoryPicker({
  categories,
  value,
  onChange,
  onCreated,
}: {
  categories: CourseCategory[];
  value: number[];
  onChange: (ids: number[]) => void;
  onCreated: (c: CourseCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = categories.filter((c) => value.includes(c.id));
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  const create = async () => {
    const n = name.trim();
    if (n.length < 2) return setError("Не короче 2 символов");
    const exists = categories.find((c) => c.name.toLowerCase() === n.toLowerCase());
    if (exists) {
      if (!value.includes(exists.id)) onChange([...value, exists.id]);
      setName("");
      return;
    }
    setBusy(true);
    setError("");
    const r = await saveCategoryFn({ data: { name: n } });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onCreated({ id: r.category.id, name: r.category.name });
    onChange([...value, r.category.id]);
    setName("");
  };

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-brand-ink/15 bg-white px-3.5 py-2 text-left text-[15px] text-brand-ink focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
          >
            <span className={cn("truncate", !selected.length && "text-brand-muted")}>
              {selected.length ? `Выбрано: ${selected.length}` : "Выберите категории"}
            </span>
            <Icon name="ChevronDown" size={16} className="shrink-0 text-brand-muted" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="theme-light w-[var(--radix-popover-trigger-width)] min-w-[260px] bg-white p-0 text-brand-ink">
          <div className="max-h-60 overflow-y-auto p-1.5">
            {categories.length ? (
              categories.map((c) => {
                const on = value.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-brand-surface"
                  >
                    <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", on ? "border-brand-blue bg-brand-blue text-white" : "border-brand-ink/25")}>
                      {on && <Icon name="Check" size={12} />}
                    </span>
                    {c.name}
                  </button>
                );
              })
            ) : (
              <div className="px-2.5 py-3 text-sm text-brand-muted">Категорий пока нет — добавьте первую ниже</div>
            )}
          </div>
          <div className="border-t border-brand-ink/10 p-2.5">
            <div className="flex gap-2">
              <input
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    create();
                  }
                }}
                placeholder="Новая категория"
                className="h-9 min-w-0 flex-1 rounded-md border border-brand-ink/15 px-2.5 text-sm focus:border-brand-blue focus:outline-none"
              />
              <button
                type="button"
                disabled={busy}
                onClick={create}
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md bg-brand-blue px-3 text-sm font-medium text-white hover:bg-[#3271B0] disabled:opacity-60"
              >
                {busy ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Plus" size={14} />}
                Добавить
              </button>
            </div>
            {error && <div className="mt-1.5 text-xs text-red-600">{error}</div>}
          </div>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1 rounded-md bg-brand-surface py-1 pl-2.5 pr-1 text-xs font-medium text-brand-ink">
              {c.name}
              <button type="button" onClick={() => toggle(c.id)} aria-label={`Убрать ${c.name}`} className="rounded p-0.5 text-brand-muted hover:text-brand-ink">
                <Icon name="X" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
