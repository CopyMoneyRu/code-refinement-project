import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import Icon from "@/components/ui/icon";
import AuthorAvatar from "@/components/university/AuthorAvatar";
import { saveAuthorFn, uploadAuthorPhotoFn, type AdminAuthor, type AuthorInput } from "@/lib/courses";
import { cn } from "@/lib/utils";

const EMPTY: AuthorInput = { name: "", role: "", bio: "", photoUrl: "" };

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
    setForm(author ? { id: author.id, name: author.name, role: author.role, bio: author.bio, photoUrl: author.photoUrl } : EMPTY);
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
    setSaving(true);
    const r = await saveAuthorFn({ data: form });
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
            <SheetDescription className="text-brand-muted">Автор появится в университете, когда у него будет хотя бы один опубликованный курс.</SheetDescription>
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
                <span className="text-sm font-medium">Описание</span>
                <span className="text-xs text-brand-muted">{form.bio.length}/5000</span>
              </div>
              <textarea
                className={cn(inputCls, "h-auto min-h-[180px] py-2.5")}
                maxLength={5000}
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="Опыт, достижения, чем автор может быть полезен слушателям"
              />
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
