import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { WsCard } from "@/components/workspace/WorkspaceLayout";
import { cn } from "@/lib/utils";
import { archiveLabelFn, LABEL_COLORS, saveLabelFn, type StrategyLabel } from "@/lib/strategies";
import { btnPrimary, inputCls, Notice } from "./fields";

const COLORS = Object.keys(LABEL_COLORS);

export default function LabelsManager({ labels: initial }: { labels: StrategyLabel[] }) {
  const router = useRouter();
  const [labels, setLabels] = useState(initial);
  const [edit, setEdit] = useState<{ id: number; name: string; color: string }>({ id: 0, name: "", color: "blue" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const r = await saveLabelFn({ data: edit });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setLabels(r.labels);
    setEdit({ id: 0, name: "", color: "blue" });
    router.invalidate();
  };

  const remove = async (id: number) => {
    setBusy(true);
    const r = await archiveLabelFn({ data: { id } });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setLabels(r.labels);
    router.invalidate();
  };

  return (
    <WsCard>
      <p className="text-sm text-brand-muted">Метки — информационные значки на карточках, например «VIP», «Новый продукт», «Ограниченный набор». Они не влияют на торговлю и доступы.</p>
      {error && <div className="mt-4"><Notice kind="error">{error}</Notice></div>}
      <form onSubmit={save} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input className={cn(inputCls, "sm:max-w-xs")} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Название метки" maxLength={40} />
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setEdit({ ...edit, color: c })} aria-label={c} className={cn("h-8 w-8 rounded-md text-xs font-semibold", LABEL_COLORS[c], edit.color === c && "ring-2 ring-brand-blue ring-offset-1")}>
              A
            </button>
          ))}
        </div>
        <button disabled={busy || !edit.name.trim()} className={btnPrimary}>
          {edit.id ? "Сохранить" : "Добавить метку"}
        </button>
        {edit.id > 0 && (
          <button type="button" onClick={() => setEdit({ id: 0, name: "", color: "blue" })} className="text-sm text-brand-muted hover:text-brand-ink">
            Отмена
          </button>
        )}
      </form>
      <ul className="mt-6 divide-y divide-brand-ink/[0.06] rounded-lg border border-brand-ink/10">
        {labels.length ? (
          labels.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-3">
              <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", LABEL_COLORS[l.color])}>{l.name}</span>
              <span className="flex-1 text-xs text-brand-muted">{l.used ? `используется в ${l.used}` : "не используется"}</span>
              <button onClick={() => setEdit({ id: l.id, name: l.name, color: l.color })} className="text-brand-muted hover:text-brand-ink" aria-label="Изменить">
                <Icon name="Pencil" size={15} />
              </button>
              <button disabled={busy} onClick={() => remove(l.id)} className="text-brand-muted hover:text-red-600" aria-label="Удалить">
                <Icon name="Trash2" size={15} />
              </button>
            </li>
          ))
        ) : (
          <li className="px-4 py-6 text-center text-sm text-brand-muted">Меток пока нет</li>
        )}
      </ul>
    </WsCard>
  );
}
