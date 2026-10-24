import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import ConfirmDelete from "@/components/workspace/ConfirmDelete";
import LessonForm from "@/components/workspace/LessonForm";
import ModuleForm, { UNLOCK_OPTIONS } from "@/components/workspace/ModuleForm";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { requirePermission } from "@/lib/adminGuard";
import {
  lessonDeleteFn,
  lessonMoveFn,
  moduleDeleteFn,
  moduleMoveFn,
  programGetFn,
  type LessonFull,
  type ModuleFull,
} from "@/lib/learning";

export const Route = createFileRoute("/admin/program/$courseId")({
  beforeLoad: ({ context }) => requirePermission(context, "lessons"),
  loader: async ({ params }) => {
    const r = await programGetFn({ data: { courseId: Number(params.courseId) || 0 } });
    if (!r.ok) throw notFound();
    return r;
  },
  component: ProgramEditor,
});

type DeleteTarget = { kind: "module"; item: ModuleFull } | { kind: "lesson"; item: LessonFull } | null;

function ProgramEditor() {
  const data = Route.useLoaderData();
  const course = data.course;
  const [modules, setModules] = useState<ModuleFull[]>(data.modules);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [moduleForm, setModuleForm] = useState<{ open: boolean; module: ModuleFull | null }>({ open: false, module: null });
  const [lessonForm, setLessonForm] = useState<{ open: boolean; moduleId: number; lesson: LessonFull | null }>({ open: false, moduleId: 0, lesson: null });
  const [toDelete, setToDelete] = useState<DeleteTarget>(null);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const run = async (fn: () => Promise<{ ok: true; modules: ModuleFull[] } | { ok: false; message: string }>, msg?: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setModules(r.modules);
    if (msg) setNotice(msg);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const t = toDelete;
    await run(
      () => (t.kind === "module" ? moduleDeleteFn({ data: { id: t.item.id, direction: 1 } }) : lessonDeleteFn({ data: { id: t.item.id, direction: 1 } })),
      t.kind === "module" ? `Модуль «${t.item.title}» удалён` : `Урок «${t.item.title}» удалён`,
    );
    setToDelete(null);
  };

  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <>
      <Link to="/admin/lessons" className="mb-4 inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
        <Icon name="ArrowLeft" size={16} /> Все курсы
      </Link>
      <WsTitle
        title={course.title}
        text={`Программа курса: ${modules.length} мод. · ${totalLessons} ур. Изменения сразу видны ученикам.`}
        action={
          <div className="flex flex-wrap gap-2">
            {course.published && (
              <Link
                to="/cabinet/learn/$slug"
                params={{ slug: course.slug }}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-ink/15 bg-white px-4 py-2.5 text-sm font-medium hover:bg-brand-surface"
              >
                <Icon name="Eye" size={16} /> Глазами ученика
              </Link>
            )}
            <button
              onClick={() => setModuleForm({ open: true, module: null })}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0]"
            >
              <Icon name="Plus" size={16} /> Добавить модуль
            </button>
          </div>
        }
      />
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {modules.length === 0 ? (
        <WsCard>
          <EmptyState icon="Layers" title="В курсе пока нет модулей" text="Добавьте первый модуль, а в нём — уроки с видео и материалами." />
        </WsCard>
      ) : (
        <div className="space-y-4">
          {modules.map((m, mi) => {
            const mode = UNLOCK_OPTIONS.find((o) => o.value === m.unlockMode)!;
            const isCollapsed = collapsed[m.id];
            return (
              <WsCard key={m.id} className="p-0">
                <div className="flex flex-col gap-3 border-b border-brand-ink/[0.08] px-5 py-4 sm:flex-row sm:items-center">
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, [m.id]: !c[m.id] }))}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Icon name={isCollapsed ? "ChevronRight" : "ChevronDown"} size={18} className="shrink-0 text-brand-muted" />
                    <span className="font-display text-sm tabular-nums text-brand-blue">{String(mi + 1).padStart(2, "0")}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{m.title}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-brand-muted">
                        <Icon name={mode.icon} size={13} /> {mode.title} · {m.lessons.length} ур.
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconBtn icon="ChevronUp" label="Модуль выше" disabled={busy || mi === 0} onClick={() => run(() => moduleMoveFn({ data: { id: m.id, direction: -1 } }))} />
                    <IconBtn icon="ChevronDown" label="Модуль ниже" disabled={busy || mi === modules.length - 1} onClick={() => run(() => moduleMoveFn({ data: { id: m.id, direction: 1 } }))} />
                    <IconBtn icon="Settings2" label="Настройки модуля" onClick={() => setModuleForm({ open: true, module: m })} />
                    <IconBtn icon="Trash2" label="Удалить модуль" danger disabled={busy} onClick={() => setToDelete({ kind: "module", item: m })} />
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="p-3">
                    {m.lessons.length > 0 && (
                      <ul className="space-y-1">
                        {m.lessons.map((l, li) => (
                          <li key={l.id} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-brand-light">
                            <span className="w-6 shrink-0 text-center text-sm tabular-nums text-brand-muted">{li + 1}</span>
                            <button onClick={() => setLessonForm({ open: true, moduleId: m.id, lesson: l })} className="min-w-0 flex-1 text-left">
                              <span className="block truncate text-[15px] font-medium hover:text-brand-blue">{l.title}</span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-muted">
                                {l.hasVideo ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700"><Icon name="PlayCircle" size={13} /> Видео</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-700"><Icon name="VideoOff" size={13} /> Без видео</span>
                                )}
                                {l.materialsCount > 0 && <span className="inline-flex items-center gap-1"><Icon name="Paperclip" size={13} /> {l.materialsCount} мат.</span>}
                                {l.description && <span className="inline-flex items-center gap-1"><Icon name="AlignLeft" size={13} /> Описание</span>}
                                {l.duration && <span>{l.duration}</span>}
                              </span>
                            </button>
                            <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                              <IconBtn icon="ChevronUp" label="Урок выше" disabled={busy || li === 0} onClick={() => run(() => lessonMoveFn({ data: { id: l.id, direction: -1 } }))} />
                              <IconBtn icon="ChevronDown" label="Урок ниже" disabled={busy || li === m.lessons.length - 1} onClick={() => run(() => lessonMoveFn({ data: { id: l.id, direction: 1 } }))} />
                              <IconBtn icon="Pencil" label="Редактировать урок" onClick={() => setLessonForm({ open: true, moduleId: m.id, lesson: l })} />
                              <IconBtn icon="Trash2" label="Удалить урок" danger disabled={busy} onClick={() => setToDelete({ kind: "lesson", item: l })} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      onClick={() => setLessonForm({ open: true, moduleId: m.id, lesson: null })}
                      className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand-ink/20 py-2.5 text-sm font-medium text-brand-muted hover:border-brand-blue hover:text-brand-blue"
                    >
                      <Icon name="Plus" size={15} /> Добавить урок
                    </button>
                  </div>
                )}
              </WsCard>
            );
          })}
        </div>
      )}

      <ModuleForm
        open={moduleForm.open}
        courseId={course.id}
        module={moduleForm.module}
        onClose={() => setModuleForm({ open: false, module: null })}
        onSaved={(mods, created, title) => {
          setModules(mods);
          setModuleForm({ open: false, module: null });
          setError("");
          setNotice(created ? `Модуль «${title}» добавлен` : `Модуль «${title}» сохранён`);
        }}
      />

      <LessonForm
        open={lessonForm.open}
        moduleId={lessonForm.moduleId}
        lesson={lessonForm.lesson}
        onClose={() => setLessonForm((s) => ({ ...s, open: false }))}
        onSaved={(mods, created, title) => {
          setModules(mods);
          setLessonForm((s) => ({ ...s, open: false }));
          setError("");
          setNotice(created ? `Урок «${title}» добавлен` : `Урок «${title}» сохранён`);
        }}
      />

      <ConfirmDelete
        open={!!toDelete}
        title={toDelete?.kind === "module" ? "Удалить модуль?" : "Удалить урок?"}
        busy={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      >
        {toDelete?.kind === "module" ? (
          <p>
            Модуль <span className="font-medium text-brand-ink">«{toDelete.item.title}»</span> будет удалён вместе со всеми уроками ({toDelete.item.lessons.length}),
            материалами и прогрессом учеников по ним.
          </p>
        ) : (
          <p>
            Урок <span className="font-medium text-brand-ink">«{toDelete?.item.title}»</span> будет удалён вместе с материалами и отметками учеников о прохождении.
          </p>
        )}
      </ConfirmDelete>
    </>
  );
}

function IconBtn({ icon, label, onClick, disabled, danger }: { icon: string; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={
        "flex h-8 w-8 items-center justify-center rounded-lg text-brand-muted transition-colors disabled:pointer-events-none disabled:opacity-30 " +
        (danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-brand-surface hover:text-brand-ink")
      }
    >
      <Icon name={icon} size={16} />
    </button>
  );
}
