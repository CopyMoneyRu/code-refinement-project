import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import Icon from "@/components/ui/icon";
import VideoPlayer, { embedUrl, isDirectVideo } from "@/components/learning/VideoPlayer";
import { lessonSaveFn, type LessonFull, type LessonInput, type LessonVideo, type Material, type ModuleFull } from "@/lib/learning";
import { formatSize, uploadFile } from "@/lib/upload";
import { cn } from "@/lib/utils";

const inputCls =
  "h-11 w-full rounded-lg border border-brand-ink/15 bg-white px-3.5 text-[15px] text-brand-ink focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15";

const empty = (moduleId: number): LessonInput => ({
  moduleId,
  title: "",
  description: "",
  body: "",
  duration: "",
  videoType: "none",
  videoUrl: "",
  videos: [],
  isFree: false,
  materials: [],
});

type Uploading = { name: string; percent: number } | null;

export default function LessonForm({
  open,
  moduleId,
  lesson,
  paidCourse,
  onClose,
  onSaved,
}: {
  open: boolean;
  moduleId: number;
  lesson: LessonFull | null;
  paidCourse: boolean;
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
            body: lesson.body ?? "",
            duration: lesson.duration,
            videoType: lesson.videoType,
            videoUrl: lesson.videoUrl,
            videos: lesson.videos?.length
              ? lesson.videos.map((v) => ({ title: v.title, kind: v.kind, url: v.url }))
              : lesson.videoType !== "none" && lesson.videoUrl
                ? [{ title: "", kind: lesson.videoType, url: lesson.videoUrl }]
                : [],
            isFree: lesson.isFree,
            materials: lesson.materials,
          }
        : empty(moduleId),
    );
  }, [open, lesson, moduleId]);

  const set = <K extends keyof LessonInput>(k: K, v: LessonInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const busy = saving || !!videoUp || !!fileUp;

  const pickVideos = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    for (const file of Array.from(files)) {
      setVideoUp({ name: file.name, percent: 0 });
      const r = await uploadFile(file, "video", (p) => setVideoUp({ name: file.name, percent: p }));
      if (!r.ok) {
        setError(`«${file.name}»: ${r.message}`);
        break;
      }
      const title = file.name.replace(/\.[^.]+$/, "");
      setForm((f) => (f.videos.length >= 20 ? f : { ...f, videos: [...f.videos, { title, kind: "file", url: r.url }] }));
    }
    setVideoUp(null);
    if (videoRef.current) videoRef.current.value = "";
  };

  const updVideo = (i: number, patch: Partial<LessonVideo>) =>
    setForm((f) => ({ ...f, videos: f.videos.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));

  const moveVideo = (i: number, d: -1 | 1) =>
    setForm((f) => {
      const j = i + d;
      if (j < 0 || j >= f.videos.length) return f;
      const arr = f.videos.slice();
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...f, videos: arr };
    });

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
    const videos = form.videos.filter((v) => v.url.trim());
    const badVideo = videos.find((v) => v.kind === "link" && !/^https:\/\/\S+\.\S+/i.test(v.url.trim()));
    if (badVideo) return setError(`Ссылка на видео${badVideo.title ? ` «${badVideo.title}»` : ""} должна начинаться с https://`);
    const mats = form.materials.filter((m) => m.url.trim());
    const bad = mats.find((m) => m.kind === "link" && !/^https:\/\/\S+\.\S+/i.test(m.url.trim()));
    if (bad) return setError(`Ссылка «${bad.title || bad.url}» должна начинаться с https://`);
    setSaving(true);
    const r = await lessonSaveFn({
      data: { ...form, videos, videoType: videos[0]?.kind ?? "none", videoUrl: videos[0]?.url ?? "", materials: mats },
    });
    setSaving(false);
    if (!r.ok) return setError(r.message);
    onSaved(r.modules, !form.id, form.title.trim());
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <SheetContent side="right" className="theme-light w-full overflow-y-auto border-0 bg-brand-light p-0 text-brand-ink sm:max-w-[680px]">
        <form onSubmit={submit} className="flex min-h-full flex-col">
          <div className="sticky top-0 z-10 border-b border-brand-ink/10 bg-white px-6 py-5">
            <SheetTitle className="font-display text-xl text-brand-ink">{form.id ? "Редактирование урока" : "Новый урок"}</SheetTitle>
            <SheetDescription className="text-brand-muted">Описание, видео, текст и материалы, которые увидит ученик.</SheetDescription>
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

            {paidCourse && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                <input type="checkbox" checked={form.isFree} onChange={(e) => set("isFree", e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
                <span>
                  <span className="block text-sm font-medium">Бесплатный урок</span>
                  <span className="block text-xs text-brand-muted">Доступен всем зарегистрированным пользователям без оплаты обучения</span>
                </span>
              </label>
            )}

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium">Описание урока</span>
                <span className="text-xs text-brand-muted">пустая строка — новый абзац</span>
              </div>
              <textarea
                className={cn(inputCls, "h-auto min-h-[110px] py-2.5")}
                maxLength={5000}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Коротко: о чём урок и что узнает ученик. Показывается над видео"
              />
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-medium">Видео</span>
                <span className="text-xs text-brand-muted">{form.videos.length}/20</span>
              </div>
              <div className="space-y-3">
                {form.videos.map((v, i) => (
                  <VideoItem
                    key={i}
                    video={v}
                    index={i}
                    total={form.videos.length}
                    lessonTitle={form.title}
                    onChange={(patch) => updVideo(i, patch)}
                    onMove={(d) => moveVideo(i, d)}
                    onRemove={() => set("videos", form.videos.filter((_, j) => j !== i))}
                  />
                ))}
                {videoUp && <UploadBar name={videoUp.name} percent={videoUp.percent} />}
                <input
                  ref={videoRef}
                  type="file"
                  multiple
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
                  className="hidden"
                  onChange={(e) => pickVideos(e.target.files)}
                />
                {form.videos.length < 20 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => set("videos", [...form.videos, { title: "", kind: "link", url: "" }])}
                      className="inline-flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-3.5 py-2 text-sm font-medium hover:bg-brand-surface"
                    >
                      <Icon name="Link" size={15} /> Добавить ссылку на видео
                    </button>
                    <button
                      type="button"
                      disabled={!!videoUp}
                      onClick={() => videoRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-3.5 py-2 text-sm font-medium hover:bg-brand-surface disabled:opacity-60"
                    >
                      <Icon name="Upload" size={15} /> Загрузить видеофайлы
                    </button>
                  </div>
                )}
                <p className="text-xs text-brand-muted">
                  Ссылки: YouTube, Rutube, VK Видео, Kinescope, Vimeo. Файлы: MP4, WEBM или MOV до 70 МБ каждый. Можно добавить несколько видео — ученик увидит их по порядку.
                </p>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium">Текст урока</span>
                <span className="text-xs text-brand-muted">пустая строка — новый абзац</span>
              </div>
              <textarea
                className={cn(inputCls, "h-auto min-h-[200px] py-2.5")}
                maxLength={100000}
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder="Конспект, ключевые тезисы, задание. Показывается под видео"
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

function VideoItem({
  video,
  index,
  total,
  lessonTitle,
  onChange,
  onMove,
  onRemove,
}: {
  video: LessonVideo;
  index: number;
  total: number;
  lessonTitle: string;
  onChange: (patch: Partial<LessonVideo>) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
}) {
  const known = video.kind === "file" || (!!video.url && (!!embedUrl(video.url) || isDirectVideo(video.url)));
  return (
    <div className="rounded-lg border border-brand-ink/10 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-semibold text-brand-blue">{index + 1}</span>
        <input
          className={cn(inputCls, "h-9 border-transparent px-2 text-sm hover:border-brand-ink/15")}
          value={video.title}
          maxLength={200}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={video.kind === "file" ? "Название видео" : "Название видео (необязательно)"}
        />
        <div className="flex shrink-0">
          <button type="button" aria-label="Выше" disabled={index === 0} onClick={() => onMove(-1)} className="flex h-8 w-7 items-center justify-center text-brand-muted hover:text-brand-ink disabled:opacity-30">
            <Icon name="ChevronUp" size={15} />
          </button>
          <button type="button" aria-label="Ниже" disabled={index === total - 1} onClick={() => onMove(1)} className="flex h-8 w-7 items-center justify-center text-brand-muted hover:text-brand-ink disabled:opacity-30">
            <Icon name="ChevronDown" size={15} />
          </button>
          <button
            type="button"
            aria-label="Удалить видео"
            onClick={onRemove}
            className="flex h-8 w-8 items-center justify-center rounded-md text-brand-muted hover:bg-red-50 hover:text-red-600"
          >
            <Icon name="X" size={15} />
          </button>
        </div>
      </div>
      {video.kind === "link" && (
        <input
          className={cn(inputCls, "mt-2")}
          value={video.url}
          maxLength={1000}
          inputMode="url"
          onChange={(e) => onChange({ url: e.target.value.trim() })}
          placeholder="https://www.youtube.com/watch?v=… или Rutube, VK Видео, Kinescope"
        />
      )}
      {video.url && !known && (
        <p className="mt-2 text-xs text-amber-700">
          Не удалось встроить эту ссылку в плеер — ученик увидит кнопку «Открыть видео в новой вкладке». Встраиваются YouTube, Rutube, VK Видео, Kinescope и Vimeo.
        </p>
      )}
      {video.url && known && (
        <div className="mt-3">
          <VideoPlayer type={video.kind} url={video.url} title={video.title || lessonTitle} />
        </div>
      )}
    </div>
  );
}
