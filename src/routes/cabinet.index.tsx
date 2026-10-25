import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import ContinueLearning from "@/components/learning/ContinueLearning";
import { catalogFn } from "@/lib/courses";
import { myCoursesFn } from "@/lib/learning";
import { ADMIN_SECTIONS } from "@/lib/adminSections";
import { can, ROLE_LABEL } from "@/lib/permissions";

export const Route = createFileRoute("/cabinet/")({
  loader: async () => {
    const [catalog, mine] = await Promise.all([catalogFn(), myCoursesFn()]);
    return { courses: catalog.courses, mine };
  },
  component: CabinetHome,
});

const cabinetApi = getRouteApi("/cabinet");

function CabinetHome() {
  const { user } = cabinetApi.useRouteContext();
  const { courses, mine } = Route.useLoaderData();
  const isDone = (c: (typeof mine)[number]) => c.progress.total > 0 && c.progress.done === c.progress.total;
  const current = mine.find((c) => !isDone(c)) ?? mine[0] ?? null;
  const tiles = [
    { label: "Обучений в процессе", icon: "GraduationCap", value: mine.filter((c) => !isDone(c)).length },
    { label: "Пройдено уроков", icon: "CheckCircle2", value: mine.reduce((n, c) => n + c.progress.done, 0) },
    { label: "Завершено обучений", icon: "Award", value: mine.filter(isDone).length },
  ];
  const adminSections = ADMIN_SECTIONS.filter((s) => can(user, s.perm));
  return (
    <>
      <WsTitle title={`Добро пожаловать, ${user.name}`} text="Здесь будут ваши обучения, прогресс и покупки." />
      {user.role !== "user" && (
        <WsCard className="mb-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Icon name="ShieldCheck" size={18} className="text-brand-blue" /> Управление платформой
            </div>
            <span className="text-sm text-brand-muted">Ваша роль: {ROLE_LABEL[user.role]}</span>
          </div>
          {adminSections.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {adminSections.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="flex items-center gap-3 rounded-lg border border-brand-ink/10 px-4 py-3 text-sm font-medium transition-colors hover:border-brand-blue/40 hover:bg-brand-light"
                >
                  <Icon name={s.icon} size={18} className="text-brand-blue" />
                  {s.label}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-brand-muted">Вам пока не назначены права. Обратитесь к супер администратору.</p>
          )}
        </WsCard>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <WsCard key={t.label}>
            <div className="flex items-center justify-between text-brand-muted">
              <span className="text-sm">{t.label}</span>
              <Icon name={t.icon} size={18} className="text-brand-blue" />
            </div>
            <div className="mt-4 font-display text-3xl font-bold text-brand-ink">{t.value}</div>
          </WsCard>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <WsCard className="p-0">
          <div className="border-b border-brand-ink/[0.08] px-6 py-4 font-semibold">Продолжить обучение</div>
          {current ? (
            <ContinueLearning course={current} />
          ) : (
            <>
              <EmptyState
                icon="BookOpen"
                title="Вы ещё не начали обучение"
                text="Выберите обучение в каталоге JETRA University — прогресс будет сохраняться автоматически."
              />
              <div className="px-6 pb-6 text-center">
                <Link to="/university" className="inline-flex rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0]">
                  Перейти в каталог
                </Link>
              </div>
            </>
          )}
        </WsCard>
        <WsCard>
          <div className="font-semibold">Рекомендуем начать</div>
          <ul className="mt-4 divide-y divide-brand-ink/[0.07]">
            {courses.filter((c) => c.access === "free").slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link to="/university/$slug" params={{ slug: c.slug }} className="flex items-center justify-between gap-3 py-3.5 text-[15px] hover:text-brand-blue">
                  {c.title}
                  <Icon name="ChevronRight" size={16} className="text-brand-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </WsCard>
      </div>
    </>
  );
}
