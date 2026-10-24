import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import Icon from "@/components/ui/icon";
import VideoPlayer, { embedUrl, isDirectVideo } from "@/components/learning/VideoPlayer";
import { lessonSaveFn, type LessonFull, type LessonInput, type Material, type ModuleFull, type VideoType } from "@/lib/learning";
import { formatSize, uploadFile } from "@/lib/upload";
import { cn } from "@/lib/utils";

const inputCls =
  "h-11 w-full rounded-lg border border-brand-ink/15 bg-white px-3.5 text-[15px] text-brand-ink focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15";

const empty = (moduleId: number): LessonInput => ({
  moduleId,
  title: "",
  description: "",
  duration: "",
  videoType: "none",
  videoUrl: "",
  materials: [],
});

type Uploading = { name: string; percent: number } | null;

export default function LessonForm({
  open,
  moduleId,
  lesson,
  onClose,
  onSaved,
}: {
  open: boolean;
  moduleId: number;
  lesson: LessonFull | null;
  onClose: () => void;
  onSaved: (modules: ModuleFull[], created: boolean, title: string) => void;
}) {
  const [form, setForm] = useState<LessonInput>(empty(moduleId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [videoUp, setVideoUp] = useState<Uploading>(null);
  const [fileUp, setFileUp] = useState<Uploading>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      lesson
        ? {
            id: lesson.id,
            moduleId,
            title: lesson.title,
            description: lesson.description,
            duration: lesson.duration,
            videoType: lesson.videoType,
            videoUrl: lesson.videoUrl,
            materials: lesson.materials,
          }
        : empty(moduleId),
    );
  }, [open, lesson, moduleId]);

  const set = <K extends keyof LessonInput>(k: K, v: LessonInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const busy = saving || !!videoUp || !!fileUp;

  const pickVideo = async (file?: File) => {
    if (!file) return;
    setError("");
    setVideoUp({ name: file.name, percent: 0 });
    const r = await uploadFile(file, "video", (p) => setVideoUp({ name: file.name, percent: p }));
    setVideoUp(null);
    if (videoRef.current) videoRef.current.value = "";
    if (!r.ok) return setError(r.message);
    setForm((f) => ({ ...f, videoType: "file", videoUrl: r.url }));
  };

  const pickMaterials = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    for (const file of Array.from(files)) {
      setFileUp({ name: file.name, percent: 0 });
      const r = await uploadFile(file, "material", (p) => setFileUp({ name: file.name, percent: p }));
      if (!r.ok) {
        setError(`«${file.name}»: ${r.message}`);
        break;
      }
      const title = file.name.replace(/\.[^.]+$/, "");
      setForm((f) => ({ ...f, materials: [...f.materials, { title, kind: "file", url: r.url, fileSize: r.size }] }));
    }
    setFileUp(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const updMat = (i: number, patch: Partial<Material>) =>
    setForm((f) => ({ ...f, materials: f.materials.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));

  const moveMat = (i: number, d: -1 | 1) =>
    setForm((f) => {
      const j = i + d;
      if (j < 0 || j >= f.materials.length) return f;
      const arr = f.materials.slice();
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...f, materials: arr };
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.title.trim().length < 2) return setError("Укажите название урока");
    if (form.videoType === "link") {
      if (!/^https:\/\/\S+\.\S+/i.test(form.videoUrl.trim())) return setError("Ссылка на видео должна начинаться с https://");
    }
    if (form.videoType === "file" && !form.videoUrl) return setError("Загрузите видеофайл или выберите другой вариант");
    const mats = form.materials.filter((m) => m.url.trim());
    const bad = mats.find((m) => m.kind === "link" && !/^https:\/\/\S+\.\S+/i.test(m.url.trim()));
    if (bad) return setError(`Ссылка «${bad.title || bad.url}» должна начинаться с https://`);
    setSaving(true);
    const r = await lessonSaveFn({ data: { ...form, materials: mats } });
    setSaving(false);
    if (!r.ok) return setError(r.message);
    onSaved(r.modules, !form.id, form.title.trim());
  };

  const linkKnown = form.videoType === "link" && form.videoUrl && (embedUrl(form.videoUrl) || isDirectVideo(form.videoUrl));

  return (
    <Sheet open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <SheetContent side="right" className="theme-light w-full overflow-y-auto border-0 bg-brand-light p-0 text-brand-ink sm:max-w-[680px]">
        <form onSubmit={submit} className="flex min-h-full flex-col">
          <div className="sticky top-0 z-10 border-b border-brand-ink/10 bg-white px-6 py-5">
            <SheetTitle className="font-display text-xl text-brand-ink">{form.id ? "Редактирование урока" : "Новый урок"}</SheetTitle>
            <SheetDescription className="text-brand-muted">Видео, описание и материалы, которые увидит ученик.</SheetDescription>
          </div>

          <div className="flex-1 space-y-7 px-6 py-6">
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <div>
                <div className="mb-1.5 text-sm font-medium">Название урока</div>
                <input className={inputCls} value={form.title} maxLength={200} onChange={(e) => set("title", e.target.value)} placeholder="Например, Как устроен рынок" />
              </div>
              <div>
                <div className="mb-1.5 text-sm font-medium">Длительность</div>
                <input className={inputCls} value={form.duration} maxLength={30} onChange={(e) => set("duration", e.target.value)} placeholder="15 мин" />
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">Видео</div>
              <div className="flex flex-wrap gap-1 rounded-lg border border-brand-ink/15 bg-white p-1 text-sm sm:inline-flex">
                {([
                  ["none", "Без видео", "VideoOff"],
                  ["link", "Ссылка", "Link"],
                  ["file", "Загрузить файл", "Upload"],
                ] as [VideoType, string, string][]).map(([v, l, ic]) => (
                  <button
                    key={v}
                    type="button"
                    disabled={!!videoUp}
                    onClick={() => setForm((f) => ({ ...f, videoType: v, videoUrl: v === f.videoType ? f.videoUrl : "" }))}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3.5 py-1.5 font-medium transition-colors",
                      form.videoType === v ? "bg-brand-blue text-white" : "text-brand-muted hover:text-brand-ink",
                    )}
                  >
                    <Icon name={ic} size={15} /> {l}
                  </button>
                ))}
              </div>

              {form.videoType === "link" && (
                <div className="mt-3 space-y-3">
                  <input
                    className={inputCls}
                    value={form.videoUrl}
                    maxLength={1000}
                    inputMode="url"
                    onChange={(e) => set("videoUrl", e.target.value.trim())}
                    placeholder="https://www.youtube.com/watch?v=… или Rutube, VK Видео, Kinescope"
                  />
                  {form.videoUrl && !linkKnown && (
                    <p className="text-xs text-amber-700">
                      Не удалось встроить эту ссылку в плеер — ученик увидит кнопку «Открыть видео в новой вкладке». Встраиваются YouTube, Rutube, VK Видео, Kinescope и Vimeo.
                    </p>
                  )}
                  {linkKnown && <VideoPlayer type="link" url={form.videoUrl} title={form.title} />}
                </div>
              )}

              {form.videoType === "file" && (
                <div className="mt-3 space-y-3">
                  <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v" className="hidden" onChange={(e) => pickVideo(e.target.files?.[0])} />
                  {videoUp ? (
                    <UploadBar name={videoUp.name} percent={videoUp.percent} />
                  ) : form.videoUrl ? (
                    <>
                      <VideoPlayer type="file" url={form.videoUrl} title={form.title} />
                      <div className="flex gap-3 text-sm">
                        <button type="button" onClick={() => videoRef.current?.click()} className="font-medium text-brand-blue hover:underline">Заменить видео</button>
                        <button type="button" onClick={() => set("videoUrl", "")} className="text-red-600 hover:underline">Убрать</button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => videoRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-brand-ink/20 bg-white py-8 text-sm text-brand-muted hover:border-brand-blue hover:text-brand-blue"
                    >
                      <Icon name="UploadCloud" size={26} />
                      <span className="font-medium">Выбрать видеофайл</span>
                      <span className="text-xs">MP4, WEBM или MOV до 70 МБ. Для длинных видео лучше ссылка на видеохостинг</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium">Описание урока</span>
                <span className="text-xs text-brand-muted">пустая строка — новый абзац</span>
              </div>
              <textarea
                className={cn(inputCls, "h-auto min-h-[200px] py-2.5")}
                maxLength={50000}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="О чём урок, ключевые тезисы, задание для самостоятельной работы"
              />
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-medium">Дополнительные материалы</span>
                <span className="text-xs text-brand-muted">{form.materials.length}/30</span>
              </div>
              <div className="space-y-2">
                {form.materials.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-brand-ink/10 bg-white p-2">
                    <Icon name={m.kind === "file" ? "FileText" : "Link"} size={17} className="ml-1 shrink-0 text-brand-blue" />
                    <input
                      className={cn(inputCls, "h-9 border-transparent px-2 text-sm hover:border-brand-ink/15")}
                      value={m.title}
                      maxLength={200}
                      onChange={(e) => updMat(i, { title: e.target.value })}
                      placeholder="Название"
                    />
                    {m.kind === "link" ? (
                      <input
                        className={cn(inputCls, "h-9 text-sm")}
                        value={m.url}
                        maxLength={1000}
                        inputMode="url"
                        onChange={(e) => updMat(i, { url: e.target.value.trim() })}
                        placeholder="https://…"
                      />
                    ) : (
                      <span className="shrink-0 whitespace-nowrap px-1 text-xs text-brand-muted">{formatSize(m.fileSize)}</span>
                    )}
                    <div className="flex shrink-0">
                      <button type="button" aria-label="Выше" disabled={i === 0} onClick={() => moveMat(i, -1)} className="flex h-8 w-7 items-center justify-center text-brand-muted hover:text-brand-ink disabled:opacity-30">
                        <Icon name="ChevronUp" size={15} />
                      </button>
                      <button type="button" aria-label="Ниже" disabled={i === form.materials.length - 1} onClick={() => moveMat(i, 1)} className="flex h-8 w-7 items-center justify-center text-brand-muted hover:text-brand-ink disabled:opacity-30">
                        <Icon name="ChevronDown" size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Удалить материал"
                        onClick={() => set("materials", form.materials.filter((_, j) => j !== i))}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-brand-muted hover:bg-red-50 hover:text-red-600"
                      >
                        <Icon name="X" size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                {fileUp && <UploadBar name={fileUp.name} percent={fileUp.percent} />}
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.png,.jpg,.jpeg,.webp,.mp3,.xmind,.key"
                  className="hidden"
                  onChange={(e) => pickMaterials(e.target.files)}
                />
                {form.materials.length < 30 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!!fileUp}
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-3.5 py-2 text-sm font-medium hover:bg-brand-surface disabled:opacity-60"
                    >
                      <Icon name="Paperclip" size={15} /> Загрузить файлы
                    </button>
                    <button
                      type="button"
                      onClick={() => set("materials", [...form.materials, { title: "", kind: "link", url: "", fileSize: 0 }])}
                      className="inline-flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-3.5 py-2 text-sm font-medium hover:bg-brand-surface"
                    >
                      <Icon name="Link" size={15} /> Добавить ссылку
                    </button>
                  </div>
                )}
                <p className="text-xs text-brand-muted">PDF, Word, Excel, PowerPoint, ZIP, изображения, MP3 — до 50 МБ каждый.</p>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-brand-ink/10 bg-white px-6 py-4">
            {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="flex justify-end gap-3">
              <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-brand-ink/15 px-4 py-2.5 text-sm font-medium hover:bg-brand-surface disabled:opacity-60">
                Отмена
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0] disabled:opacity-60"
              >
                {saving && <Icon name="Loader2" size={15} className="animate-spin" />}
                {form.id ? "Сохранить урок" : "Добавить урок"}
              </button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function UploadBar({ name, percent }: { name: string; percent: number }) {
  return (
    <div className="rounded-lg border border-brand-ink/10 bg-white p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <Icon name="Loader2" size={15} className="shrink-0 animate-spin text-brand-blue" />
          <span className="truncate">{name}</span>
        </span>
        <span className="shrink-0 tabular-nums text-brand-muted">{percent}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-surface">
        <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-brand-muted">Не закрывайте окно до окончания загрузки</p>
    </div>
  );
}
