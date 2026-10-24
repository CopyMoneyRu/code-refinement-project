import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { moduleSaveFn, type ModuleFull, type UnlockMode } from "@/lib/learning";
import { cn } from "@/lib/utils";

export const UNLOCK_OPTIONS: { value: UnlockMode; title: string; text: string; icon: string }[] = [
  { value: "all", title: "Все уроки сразу", text: "Ученик может открыть любой урок модуля в любом порядке", icon: "LayoutList" },
  { value: "sequential", title: "По порядку", text: "Следующий урок открывается после отметки «Урок пройден» в предыдущем", icon: "ListOrdered" },
];

export default function ModuleForm({
  open,
  courseId,
  module,
  onClose,
  onSaved,
}: {
  open: boolean;
  courseId: number;
  module: ModuleFull | null;
  onClose: () => void;
  onSaved: (modules: ModuleFull[], created: boolean, title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<UnlockMode>("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(module?.title ?? "");
    setDescription(module?.description ?? "");
    setMode(module?.unlockMode ?? "all");
    setError("");
  }, [open, module]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) return setError("Укажите название модуля");
    setSaving(true);
    const r = await moduleSaveFn({ data: { id: module?.id, courseId, title, description, unlockMode: mode } });
    setSaving(false);
    if (!r.ok) return setError(r.message);
    onSaved(r.modules, !module, title.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="theme-light max-h-[90vh] overflow-y-auto bg-white text-brand-ink sm:max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{module ? "Настройки модуля" : "Новый модуль"}</DialogTitle>
            <DialogDescription className="text-brand-muted">Название, описание и порядок открытия уроков.</DialogDescription>
          </DialogHeader>

          <div>
            <div className="mb-1.5 text-sm font-medium">Название</div>
            <input
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например, Введение"
              className="h-11 w-full rounded-lg border border-brand-ink/15 px-3.5 text-[15px] focus:border-brand-blue focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-1.5 text-sm font-medium">Описание <span className="font-normal text-brand-muted">— необязательно</span></div>
            <textarea
              value={description}
              maxLength={5000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Что ученик узнает в этом модуле"
              className="min-h-[80px] w-full rounded-lg border border-brand-ink/15 px-3.5 py-2.5 text-[15px] focus:border-brand-blue focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Как открываются уроки</div>
            <div className="grid gap-2">
              {UNLOCK_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setMode(o.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                    mode === o.value ? "border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue" : "border-brand-ink/15 hover:border-brand-ink/30",
                  )}
                >
                  <Icon name={o.icon} size={19} className={cn("mt-0.5 shrink-0", mode === o.value ? "text-brand-blue" : "text-brand-muted")} />
                  <span>
                    <span className="block text-sm font-medium">{o.title}</span>
                    <span className="block text-xs text-brand-muted">{o.text}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <DialogFooter className="gap-2 sm:gap-0">
            <button type="button" onClick={onClose} className="rounded-lg border border-brand-ink/15 px-4 py-2.5 text-sm font-medium hover:bg-brand-surface">
              Отмена
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0] disabled:opacity-60">
              {module ? "Сохранить" : "Добавить модуль"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
