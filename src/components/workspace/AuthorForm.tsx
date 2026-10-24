import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import Icon from "@/components/ui/icon";
import AuthorAvatar from "@/components/university/AuthorAvatar";
import { saveAuthorFn, uploadAuthorPhotoFn, type AdminAuthor, type AuthorInput } from "@/lib/courses";
import { cn } from "@/lib/utils";

const EMPTY: AuthorInput = { name: "", role: "", bio: "", about: "", photoUrl: "", links: [], facts: [] };

const inputCls =
  "h-11 w-full rounded-lg border border-brand-ink/15 bg-white px-3.5 text-[15px] text-brand-ink focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15";

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

export default function AuthorForm({
  open,
  author,
  onClose,
  onSaved,
}: {
  open: boolean;
  author: AdminAuthor | null;
  onClose: () => void;
  onSaved: (a: AdminAuthor, created: boolean) => void;
}) {
  const [form, setForm] = useState<AuthorInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      author
        ? {
            id: author.id,
            name: author.name,
            role: author.role,
            bio: author.bio,
            about: author.about,
            photoUrl: author.photoUrl,
            links: author.links,
            facts: author.facts,
          }
        : EMPTY,
    );
    setError("");
  }, [open, author]);

  const set = <K extends keyof AuthorInput>(k: K, v: AuthorInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Фото должно быть в формате JPG, PNG или WEBP");
    if (file.size > 5 * 1024 * 1024) return setError("Фото должно быть не больше 5 МБ");
    setUploading(true);
    const data = await readAsBase64(file);
    const r = await uploadAuthorPhotoFn({ data: { contentType: file.type, data } });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!r.ok) return setError(r.message);
    set("photoUrl", r.url);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.name.trim().length < 2) return setError("Укажите имя автора");
    const links = form.links.filter((l) => l.title.trim() || l.url.trim());
    const badLink = links.find((l) => !/^https?:\/\/\S+\.\S+/i.test(l.url.trim()));
    if (badLink) return setError(`Проверьте адрес ссылки «${badLink.title || badLink.url}» — он должен начинаться с https://`);
    const facts = form.facts.filter((f) => f.value.trim() || f.label.trim());
    if (facts.some((f) => !f.value.trim() || !f.label.trim())) return setError("У каждого факта заполните и значение, и подпись");
    setSaving(true);
    const r = await saveAuthorFn({ data: { ...form, links, facts } });
    setSaving(false);
    if (!r.ok) return setError(r.message);
    onSaved(r.author, !form.id);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <SheetContent side="right" className="theme-light w-full overflow-y-auto border-0 bg-brand-light p-0 text-brand-ink sm:max-w-[520px]">
        <form onSubmit={submit} className="flex min-h-full flex-col">
          <div className="sticky top-0 z-10 border-b border-brand-ink/10 bg-white px-6 py-5">
            <SheetTitle className="font-display text-xl text-brand-ink">{form.id ? "Редактирование автора" : "Новый автор"}</SheetTitle>
            <SheetDescription className="text-brand-muted">
              Автор и его страница появятся в университете, когда у него будет хотя бы один опубликованный курс.
            </SheetDescription>
          </div>

          <div className="flex-1 space-y-6 px-6 py-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <AuthorAvatar name={form.name || "?"} photoUrl={form.photoUrl} className="h-24 w-24 border border-brand-ink/10" textClassName="text-2xl" />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                    <Icon name="Loader2" size={22} className="animate-spin text-brand-blue" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-3.5 py-2 text-sm font-medium hover:bg-brand-surface disabled:opacity-60"
                >
                  <Icon name="Upload" size={15} /> {form.photoUrl ? "Заменить фото" : "Загрузить фото"}
                </button>
                {form.photoUrl ? (
                  <button type="button" onClick={() => set("photoUrl", "")} className="text-left text-sm text-red-600 hover:underline">
                    Убрать фото
                  </button>
                ) : (
                  <span className="text-xs text-brand-muted">JPG, PNG, WEBP до 5 МБ. Лучше квадратное.</span>
                )}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-sm font-medium">Имя</div>
              <input className={inputCls} value={form.name} maxLength={120} onChange={(e) => set("name", e.target.value)} placeholder="Например, Анна Смирнова" />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium">Специализация</span>
                <span className="text-xs text-brand-muted">Одна строка под именем</span>
              </div>
              <input className={inputCls} value={form.role} maxLength={160} onChange={(e) => set("role", e.target.value)} placeholder="Например, Портфельный управляющий" />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium">Кратко об авторе</span>
                <span className="text-xs text-brand-muted">{form.bio.length}/500 · в каталоге и на курсах</span>
              </div>
              <textarea
                className={cn(inputCls, "h-auto min-h-[90px] py-2.5")}
                maxLength={500}
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="2–3 предложения: кто автор и чем полезен слушателям"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium">Подробный рассказ</span>
                <span className="text-xs text-brand-muted">на странице автора</span>
              </div>
              <textarea
                className={cn(inputCls, "h-auto min-h-[220px] py-2.5")}
                maxLength={30000}
                value={form.about}
                onChange={(e) => set("about", e.target.value)}
                placeholder={"Опыт, образование, достижения, подход к обучению.\n\nПустая строка начинает новый абзац."}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium">Факты в цифрах</span>
                <span className="text-xs text-brand-muted">до 12, например «15 лет» — «на финансовых рынках»</span>
              </div>
              <div className="space-y-2">
                {form.facts.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className={cn(inputCls, "h-10 w-32 shrink-0")}
                      value={f.value}
                      maxLength={40}
                      placeholder="15 лет"
                      onChange={(e) => set("facts", form.facts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                    />
                    <input
                      className={cn(inputCls, "h-10")}
                      value={f.label}
                      maxLength={120}
                      placeholder="на финансовых рынках"
                      onChange={(e) => set("facts", form.facts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    />
                    <button
                      type="button"
                      aria-label="Удалить факт"
                      onClick={() => set("facts", form.facts.filter((_, j) => j !== i))}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-brand-muted hover:bg-red-50 hover:text-red-600"
                    >
                      <Icon name="X" size={16} />
                    </button>
                  </div>
                ))}
                {form.facts.length < 12 && (
                  <button
                    type="button"
                    onClick={() => set("facts", [...form.facts, { value: "", label: "" }])}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:underline"
                  >
                    <Icon name="Plus" size={14} /> Добавить факт
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium">Ссылки</span>
                <span className="text-xs text-brand-muted">соцсети, сайт, YouTube, публикации</span>
              </div>
              <div className="space-y-2">
                {form.links.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className={cn(inputCls, "h-10 w-36 shrink-0")}
                      value={l.title}
                      maxLength={80}
                      placeholder="Telegram"
                      onChange={(e) => set("links", form.links.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                    />
                    <input
                      className={cn(inputCls, "h-10")}
                      value={l.url}
                      maxLength={500}
                      inputMode="url"
                      placeholder="https://t.me/username"
                      onChange={(e) => set("links", form.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                    />
                    <button
                      type="button"
                      aria-label="Удалить ссылку"
                      onClick={() => set("links", form.links.filter((_, j) => j !== i))}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-brand-muted hover:bg-red-50 hover:text-red-600"
                    >
                      <Icon name="X" size={16} />
                    </button>
                  </div>
                ))}
                {form.links.length < 20 && (
                  <button
                    type="button"
                    onClick={() => set("links", [...form.links, { title: "", url: "" }])}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:underline"
                  >
                    <Icon name="Plus" size={14} /> Добавить ссылку
                  </button>
                )}
              </div>
            </div>
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
                {form.id ? "Сохранить" : "Добавить автора"}
              </button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
