import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import Icon from "@/components/ui/icon";
import { LEVELS, saveCourseFn, uploadCoverFn, type CourseInput, type DbAuthor, type DbCourse, type DbModule } from "@/lib/courses";
import { cn } from "@/lib/utils";

const EMPTY: CourseInput = {
  title: "",
  category: "",
  short: "",
  description: "",
  level: "Начальный",
  access: "free",
  price: 0,
  authorId: null,
  coverUrl: "",
  published: true,
  modules: [],
};

const fromCourse = (c: DbCourse): CourseInput => ({
  id: c.id,
  title: c.title,
  category: c.category,
  short: c.short,
  description: c.description,
  level: c.level,
  access: c.access,
  price: c.price,
  authorId: c.author?.id ?? null,
  coverUrl: c.coverUrl,
  published: c.published,
  modules: c.modules,
});

const inputCls =
  "h-11 w-full rounded-lg border border-brand-ink/15 bg-white px-3.5 text-[15px] text-brand-ink focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15";

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium text-brand-ink">{children}</span>
      {hint && <span className="text-xs text-brand-muted">{hint}</span>}
    </div>
  );
}

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

export default function CourseForm({
  open,
  course,
  authors,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  course: DbCourse | null;
  authors: DbAuthor[];
  categories: string[];
  onClose: () => void;
  onSaved: (c: DbCourse, created: boolean) => void;
}) {
  const [form, setForm] = useState<CourseInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(course ? fromCourse(course) : EMPTY);
    setError("");
  }, [open, course]);

  const set = <K extends keyof CourseInput>(k: K, v: CourseInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setModules = (fn: (m: DbModule[]) => DbModule[]) => setForm((f) => ({ ...f, modules: fn(f.modules) }));

  const pickCover = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Обложка должна быть в формате JPG, PNG или WEBP");
    if (file.size > 5 * 1024 * 1024) return setError("Обложка должна быть не больше 5 МБ");
    setUploading(true);
    const data = await readAsBase64(file);
    const r = await uploadCoverFn({ data: { contentType: file.type, data } });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!r.ok) return setError(r.message);
    set("coverUrl", r.url);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.title.trim().length < 3) return setError("Укажите название курса (не короче 3 символов)");
    if (form.category.trim().length < 2) return setError("Укажите категорию");
    if (form.access === "paid" && form.price < 1) return setError("Укажите цену платного курса");
    if (form.modules.some((m) => !m.title.trim() || m.lessons.some((l) => !l.title.trim())))
      return setError("Заполните названия всех модулей и уроков или удалите пустые");
    setSaving(true);
    const r = await saveCourseFn({ data: { ...form, price: form.access === "free" ? 0 : form.price } });
    setSaving(false);
    if (!r.ok) return setError(r.message);
    onSaved(r.course, !form.id);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <SheetContent side="right" className="theme-light w-full overflow-y-auto border-0 bg-brand-light p-0 text-brand-ink sm:max-w-[640px]">
        <form onSubmit={submit} className="flex min-h-full flex-col">
          <div className="sticky top-0 z-10 border-b border-brand-ink/10 bg-white px-6 py-5">
            <SheetTitle className="font-display text-xl text-brand-ink">{form.id ? "Редактирование курса" : "Новый курс"}</SheetTitle>
            <SheetDescription className="text-brand-muted">Изменения сразу появятся в каталоге университета.</SheetDescription>
          </div>

          <div className="flex-1 space-y-6 px-6 py-6">
            <div>
              <Label hint="JPG, PNG, WEBP до 5 МБ">Обложка</Label>
              <div className="flex items-start gap-4">
                <div className="relative flex aspect-[16/10] w-48 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-brand-ink/10 bg-brand-surface">
                  {form.coverUrl ? (
                    <img src={form.coverUrl} alt="Обложка курса" className="h-full w-full object-cover" />
                  ) : (
                    <Icon name="ImagePlus" size={28} className="text-brand-muted" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                      <Icon name="Loader2" size={22} className="animate-spin text-brand-blue" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickCover(e.target.files?.[0])} />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-3.5 py-2 text-sm font-medium hover:bg-brand-surface disabled:opacity-60"
                  >
                    <Icon name="Upload" size={15} /> {form.coverUrl ? "Заменить" : "Загрузить"}
                  </button>
                  {form.coverUrl && (
                    <button type="button" onClick={() => set("coverUrl", "")} className="text-left text-sm text-red-600 hover:underline">
                      Убрать обложку
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label>Название</Label>
              <input className={inputCls} value={form.title} maxLength={200} onChange={(e) => set("title", e.target.value)} placeholder="Например, Основы инвестиций" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Категория</Label>
                <input className={inputCls} list="course-categories" value={form.category} maxLength={80} onChange={(e) => set("category", e.target.value)} placeholder="Выберите или введите новую" />
                <datalist id="course-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label>Уровень</Label>
                <select className={inputCls} value={form.level} onChange={(e) => set("level", e.target.value)}>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label hint="Новых авторов добавляйте в разделе «Авторы»">Автор</Label>
              <select className={inputCls} value={form.authorId ?? ""} onChange={(e) => set("authorId", Number(e.target.value) || null)}>
                <option value="">Без автора</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.role ? ` — ${a.role}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Доступ и цена</Label>
              <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="flex rounded-lg border border-brand-ink/15 bg-white p-1 text-sm">
                  {([
                    ["free", "Бесплатный"],
                    ["paid", "Платный"],
                  ] as const).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set("access", v)}
                      className={cn("rounded-md px-4 py-1.5 font-medium transition-colors", form.access === v ? "bg-brand-blue text-white" : "text-brand-muted hover:text-brand-ink")}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                {form.access === "paid" && (
                  <label className="relative">
                    <input
                      className={cn(inputCls, "pr-10")}
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={form.price || ""}
                      onChange={(e) => set("price", Math.max(0, Math.round(Number(e.target.value) || 0)))}
                      placeholder="Цена"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted">₽</span>
                  </label>
                )}
              </div>
            </div>

            <div>
              <Label hint={`${form.short.length}/400`}>Краткое описание</Label>
              <textarea
                className={cn(inputCls, "h-auto min-h-[72px] py-2.5")}
                maxLength={400}
                value={form.short}
                onChange={(e) => set("short", e.target.value)}
                placeholder="Одно-два предложения для карточки в каталоге"
              />
            </div>

            <div>
              <Label>Подробное описание</Label>
              <textarea
                className={cn(inputCls, "h-auto min-h-[150px] py-2.5")}
                maxLength={20000}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Для кого курс, чему научится слушатель, что входит в программу"
              />
            </div>

            <div>
              <Label hint={`${form.modules.length} мод.`}>Программа курса</Label>
              <div className="space-y-3">
                {form.modules.map((m, mi) => (
                  <div key={mi} className="rounded-lg border border-brand-ink/10 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 shrink-0 font-display text-sm tabular-nums text-brand-blue">{String(mi + 1).padStart(2, "0")}</span>
                      <input
                        className={cn(inputCls, "h-10")}
                        value={m.title}
                        maxLength={200}
                        onChange={(e) => setModules((ms) => ms.map((x, i) => (i === mi ? { ...x, title: e.target.value } : x)))}
                        placeholder="Название модуля"
                      />
                      <button
                        type="button"
                        aria-label="Удалить модуль"
                        onClick={() => setModules((ms) => ms.filter((_, i) => i !== mi))}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-brand-muted hover:bg-red-50 hover:text-red-600"
                      >
                        <Icon name="Trash2" size={16} />
                      </button>
                    </div>
                    <div className="mt-3 space-y-2 pl-8">
                      {m.lessons.map((l, li) => {
                        const upd = (patch: Partial<typeof l>) =>
                          setModules((ms) => ms.map((x, i) => (i === mi ? { ...x, lessons: x.lessons.map((y, j) => (j === li ? { ...y, ...patch } : y)) } : x)));
                        return (
                          <div key={li} className="flex items-center gap-2">
                            <input className={cn(inputCls, "h-9 text-sm")} value={l.title} maxLength={200} onChange={(e) => upd({ title: e.target.value })} placeholder="Название урока" />
                            <input className={cn(inputCls, "h-9 w-24 shrink-0 text-sm")} value={l.duration} maxLength={30} onChange={(e) => upd({ duration: e.target.value })} placeholder="15 мин" />
                            <button
                              type="button"
                              aria-label="Удалить урок"
                              onClick={() => setModules((ms) => ms.map((x, i) => (i === mi ? { ...x, lessons: x.lessons.filter((_, j) => j !== li) } : x)))}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-muted hover:bg-red-50 hover:text-red-600"
                            >
                              <Icon name="X" size={15} />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setModules((ms) => ms.map((x, i) => (i === mi ? { ...x, lessons: [...x.lessons, { title: "", duration: "", hasFiles: false }] } : x)))}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:underline"
                      >
                        <Icon name="Plus" size={14} /> Урок
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setModules((ms) => [...ms, { title: "", lessons: [] }])}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand-ink/20 py-3 text-sm font-medium text-brand-muted hover:border-brand-blue hover:text-brand-blue"
                >
                  <Icon name="Plus" size={15} /> Добавить модуль
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-ink/10 bg-white p-4">
              <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#397FC4]" />
              <span>
                <span className="block text-sm font-medium">Показывать на сайте</span>
                <span className="block text-xs text-brand-muted">Снимите галочку, чтобы скрыть курс. Он останется в админке</span>
              </span>
            </label>
          </div>

          <div className="sticky bottom-0 border-t border-brand-ink/10 bg-white px-6 py-4">
            {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="flex justify-end gap-3">
              <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-brand-ink/15 px-4 py-2.5 text-sm font-medium hover:bg-brand-surface">
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0] disabled:opacity-60"
              >
                {saving && <Icon name="Loader2" size={15} className="animate-spin" />}
                {form.id ? "Сохранить" : "Создать курс"}
              </button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
