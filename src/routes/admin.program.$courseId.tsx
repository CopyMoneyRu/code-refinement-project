import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import ConfirmDelete from "@/components/workspace/ConfirmDelete";
import PublishToggle from "@/components/workspace/PublishToggle";
import LessonForm from "@/components/workspace/LessonForm";
import ModuleForm, { UNLOCK_OPTIONS } from "@/components/workspace/ModuleForm";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { requirePermission } from "@/lib/adminGuard";
import {
  lessonDeleteFn,
  lessonMoveFn,
  lessonSetFreeFn,
  lessonSetPublishedFn,
  moduleDeleteFn,
  moduleSetFreeFn,
  moduleSetPublishedFn,
  moduleMoveFn,
  moduleSaveFn,
  programSetFlatFn,
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
  const [flat, setFlat] = useState(!!course.flat);
  const [askFlat, setAskFlat] = useState(false);

  const switchFlat = async (v: boolean) => {
    setAskFlat(false);
    setBusy(true);
    setError("");
    setNotice("");
    const r = await programSetFlatFn({ data: { courseId: course.id, flat: v } });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setModules(r.modules);
    setFlat(v);
    setNotice(v ? "Теперь уроки идут одним списком, без модулей" : "Включены модули. Уроки собраны в модуль «" + (r.modules[0]?.title ?? "Уроки") + "» — переименуйте его или добавьте новые");
  };

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
  const hiddenModules = modules.filter((m) => m.published === false).length;
  const hiddenLessons = modules.reduce((n, m) => n + m.lessons.filter((l) => l.published === false).length, 0);
  const paid = course.access === "paid";
  const freeTotal = modules.reduce((n, m) => n + m.lessons.filter((l) => l.isFree).length, 0);

  const renderLessons = (m: ModuleFull) => (
                  <div className="p-3">
                    {m.lessons.length > 0 && (
                      <ul className="space-y-1">
                        {m.lessons.map((l, li) => (
                          <li key={l.id} className={"group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-brand-light " + (l.published === false ? "opacity-60" : "")}>
                            <span className="w-6 shrink-0 text-center text-sm tabular-nums text-brand-muted">{li + 1}</span>
                            {paid && (
                              <label
                                className={
                                  "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium " +
                                  (l.isFree ? "bg-emerald-50 text-emerald-700" : "text-brand-muted hover:bg-brand-surface")
                                }
                                title={l.isFree ? "Урок бесплатный — открыт всем зарегистрированным" : "Сделать урок бесплатным"}
                              >
                                <input
                                  type="checkbox"
                                  checked={l.isFree}
                                  disabled={busy}
                                  onChange={(e) => run(() => lessonSetFreeFn({ data: { id: l.id, isFree: e.target.checked } }))}
                                  className="h-3.5 w-3.5 accent-emerald-600"
                                />
                                Бесплатно
                              </label>
                            )}
                            <button onClick={() => setLessonForm({ open: true, moduleId: m.id, lesson: l })} className="min-w-0 flex-1 text-left">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-[15px] font-medium hover:text-brand-blue">{l.title}</span>
                                {l.published === false && (
                                  <span className="shrink-0 rounded-md bg-brand-surface px-2 py-0.5 text-xs font-medium text-brand-muted">Скрыт</span>
                                )}
                              </span>
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
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                run(
                                  () => lessonSetPublishedFn({ data: { id: l.id, published: l.published === false } }),
                                  l.published === false ? `Урок «${l.title}» снова виден ученикам` : `Урок «${l.title}» скрыт`,
                                )
                              }
                              title={l.published === false ? "Урок скрыт. Нажмите, чтобы показать ученикам" : "Урок виден ученикам. Нажмите, чтобы скрыть"}
                              aria-label={l.published === false ? "Показать урок" : "Скрыть урок"}
                              className={
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40 " +
                                (l.published === false ? "bg-brand-surface text-brand-muted hover:text-brand-ink" : "text-emerald-600 hover:bg-emerald-50")
                              }
                            >
                              <Icon name={l.published === false ? "EyeOff" : "Eye"} size={16} />
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
  );

  return (
    <>
      <Link to="/admin/lessons" className="mb-4 inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
        <Icon name="ArrowLeft" size={16} /> Все обучения
      </Link>
      <WsTitle
        title={course.title}
        text={`Программа обучения: ${flat ? "" : `${modules.length} мод. · `}${totalLessons} ур.${
          hiddenModules || hiddenLessons ? ` Скрыто: ${hiddenModules ? `${hiddenModules} мод.` : ""}${hiddenModules && hiddenLessons ? ", " : ""}${hiddenLessons ? `${hiddenLessons} ур.` : ""}` : ""
        } Изменения сразу видны ученикам.`}
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
            {flat ? (
              <button
                onClick={() => modules[0] && setLessonForm({ open: true, moduleId: modules[0].id, lesson: null })}
                disabled={busy || !modules[0]}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0] disabled:opacity-60"
              >
                <Icon name="Plus" size={16} /> Добавить урок
              </button>
            ) : (
            <button
              onClick={() => setModuleForm({ open: true, module: null })}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0]"
            >
              <Icon name="Plus" size={16} /> Добавить модуль
            </button>
            )}
          </div>
        }
      />
      <WsCard className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">Структура обучения</div>
          <div className="text-xs text-brand-muted">
            {flat ? "Уроки идут одним списком: Урок 1, 2, 3… Подходит для коротких обучений." : "Уроки разбиты на модули. Подходит для больших обучений."}
          </div>
        </div>
        <div className="inline-flex shrink-0 rounded-lg border border-brand-ink/15 bg-brand-light p-1">
          {[
            { v: true, label: "Без модулей", icon: "List" },
            { v: false, label: "С модулями", icon: "Layers" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              disabled={busy || flat === o.v}
              onClick={() => (o.v && modules.length > 1 ? setAskFlat(true) : switchFlat(o.v))}
              className={
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                (flat === o.v ? "bg-white text-brand-ink shadow-sm" : "text-brand-muted hover:text-brand-ink")
              }
            >
              <Icon name={o.icon} size={15} /> {o.label}
            </button>
          ))}
        </div>
      </WsCard>
      {paid && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-4 text-sm">
          <Icon name="Gift" size={18} className="mt-0.5 shrink-0 text-brand-blue" />
          <div>
            <span className="font-medium">Обучение платное.</span>{" "}
            {freeTotal > 0
              ? `Бесплатных уроков: ${freeTotal} из ${totalLessons} — они открыты всем зарегистрированным, остальные после оплаты.`
              : "Отметьте галочкой «Бесплатно» уроки, которые можно пройти без оплаты — например, первый модуль."}
          </div>
        </div>
      )}
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {flat ? (
        modules[0] && <FlatProgram m={modules[0]} paid={paid} busy={busy} run={run} courseId={course.id}>{renderLessons(modules[0])}</FlatProgram>
      ) : modules.length === 0 ? (
        <WsCard>
          <EmptyState icon="Layers" title="В обучении пока нет модулей" text="Добавьте первый модуль, а в нём — уроки с видео и материалами." />
        </WsCard>
      ) : (
        <div className="space-y-4">
          {modules.map((m, mi) => {
            const mode = UNLOCK_OPTIONS.find((o) => o.value === m.unlockMode)!;
            const isCollapsed = collapsed[m.id];
            return (
              <WsCard key={m.id} className={"p-0 " + (m.published === false ? "border-dashed bg-brand-light/60" : "")}>
                <div className="flex flex-col gap-3 border-b border-brand-ink/[0.08] px-5 py-4 sm:flex-row sm:items-center">
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, [m.id]: !c[m.id] }))}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Icon name={isCollapsed ? "ChevronRight" : "ChevronDown"} size={18} className="shrink-0 text-brand-muted" />
                    <span className="font-display text-sm tabular-nums text-brand-blue">{String(mi + 1).padStart(2, "0")}</span>
                    <span className="min-w-0">
                      <span className={"block truncate font-semibold " + (m.published === false ? "text-brand-muted" : "")}>{m.title}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-brand-muted">
                        <Icon name={mode.icon} size={13} /> {mode.title} · {m.lessons.length} ур.
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <span className="mr-2">
                      <PublishToggle
                        checked={m.published !== false}
                        disabled={busy}
                        label={`Показывать модуль «${m.title}» ученикам`}
                        onChange={(v) =>
                          run(
                            () => moduleSetPublishedFn({ data: { id: m.id, published: v } }),
                            v ? `Модуль «${m.title}» снова виден ученикам` : `Модуль «${m.title}» скрыт. Он и его уроки остаются в админке`,
                          )
                        }
                      />
                    </span>
                    {paid && m.lessons.length > 0 && (() => {
                      const allFree = m.lessons.every((l) => l.isFree);
                      return (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            run(
                              () => moduleSetFreeFn({ data: { id: m.id, isFree: !allFree } }),
                              allFree ? `Модуль «${m.title}» снова платный` : `Все уроки модуля «${m.title}» открыты бесплатно`,
                            )
                          }
                          className={
                            "mr-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 " +
                            (allFree ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-brand-ink/15 text-brand-muted hover:text-brand-ink")
                          }
                        >
                          <Icon name={allFree ? "CheckSquare" : "Square"} size={14} /> Весь модуль бесплатно
                        </button>
                      );
                    })()}
                    <IconBtn icon="ChevronUp" label="Модуль выше" disabled={busy || mi === 0} onClick={() => run(() => moduleMoveFn({ data: { id: m.id, direction: -1 } }))} />
                    <IconBtn icon="ChevronDown" label="Модуль ниже" disabled={busy || mi === modules.length - 1} onClick={() => run(() => moduleMoveFn({ data: { id: m.id, direction: 1 } }))} />
                    <IconBtn icon="Settings2" label="Настройки модуля" onClick={() => setModuleForm({ open: true, module: m })} />
                    <IconBtn icon="Trash2" label="Удалить модуль" danger disabled={busy} onClick={() => setToDelete({ kind: "module", item: m })} />
                  </div>
                </div>

                {!isCollapsed && renderLessons(m)}
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
        paidCourse={paid}
        onClose={() => setLessonForm((s) => ({ ...s, open: false }))}
        onSaved={(mods, created, title) => {
          setModules(mods);
          setLessonForm((s) => ({ ...s, open: false }));
          setError("");
          setNotice(created ? `Урок «${title}» добавлен` : `Урок «${title}» сохранён`);
        }}
      />

      <ConfirmDelete
        open={askFlat}
        title="Убрать модули?"
        busy={busy}
        confirmLabel="Убрать модули"
        onCancel={() => setAskFlat(false)}
        onConfirm={() => switchFlat(true)}
      >
        <p>
          Все уроки из {modules.length} модулей соберутся в один общий список в текущем порядке. Уроки, материалы и прогресс учеников сохранятся,
          названия и описания модулей будут удалены.
        </p>
      </ConfirmDelete>

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

type RunFn = (fn: () => Promise<{ ok: true; modules: ModuleFull[] } | { ok: false; message: string }>, msg?: string) => Promise<void>;

function FlatProgram({ m, paid, busy, run, courseId, children }: { m: ModuleFull; paid: boolean; busy: boolean; run: RunFn; courseId: number; children: React.ReactNode }) {
  const allFree = m.lessons.length > 0 && m.lessons.every((l) => l.isFree);
  return (
    <WsCard className="p-0">
      <div className="flex flex-col gap-3 border-b border-brand-ink/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-semibold">Уроки · {m.lessons.length}</div>
        <div className="flex flex-wrap items-center gap-2">
          {UNLOCK_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={busy || m.unlockMode === o.value}
              title={o.text}
              onClick={() =>
                run(() => moduleSaveFn({ data: { id: m.id, courseId, title: m.title, description: m.description, unlockMode: o.value } }), `Уроки открываются: ${o.title.toLowerCase()}`)
              }
              className={
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors " +
                (m.unlockMode === o.value ? "border-brand-blue bg-brand-blue/5 text-brand-blue" : "border-brand-ink/15 text-brand-muted hover:text-brand-ink")
              }
            >
              <Icon name={o.icon} size={14} /> {o.title}
            </button>
          ))}
          {paid && m.lessons.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => moduleSetFreeFn({ data: { id: m.id, isFree: !allFree } }), allFree ? "Уроки снова платные" : "Все уроки открыты бесплатно")}
              className={
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 " +
                (allFree ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-brand-ink/15 text-brand-muted hover:text-brand-ink")
              }
            >
              <Icon name={allFree ? "CheckSquare" : "Square"} size={14} /> Все бесплатно
            </button>
          )}
        </div>
      </div>
      {children}
    </WsCard>
  );
}
