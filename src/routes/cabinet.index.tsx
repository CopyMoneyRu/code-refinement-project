import { createFileRoute, Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { COURSES } from "@/data/catalog";

export const Route = createFileRoute("/cabinet/")({
  component: CabinetHome,
});

function CabinetHome() {
  const tiles = [
    { label: "Курсов в обучении", icon: "GraduationCap" },
    { label: "Пройдено уроков", icon: "CheckCircle2" },
    { label: "Сертификатов", icon: "Award" },
  ];
  return (
    <>
      <WsTitle title="Добро пожаловать" text="Здесь будут ваши курсы, прогресс обучения и покупки." />
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <WsCard key={t.label}>
            <div className="flex items-center justify-between text-brand-muted">
              <span className="text-sm">{t.label}</span>
              <Icon name={t.icon} size={18} className="text-brand-blue" />
            </div>
            <div className="mt-4 font-display text-3xl font-bold text-brand-ink/30">—</div>
          </WsCard>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <WsCard className="p-0">
          <div className="border-b border-brand-ink/[0.08] px-6 py-4 font-semibold">Продолжить обучение</div>
          <EmptyState
            icon="BookOpen"
            title="Вы ещё не начали курсы"
            text="Выберите курс в каталоге JETRA University — прогресс будет сохраняться автоматически."
          />
          <div className="px-6 pb-6 text-center">
            <Link to="/university" className="inline-flex rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0]">
              Перейти в каталог
            </Link>
          </div>
        </WsCard>
        <WsCard>
          <div className="font-semibold">Рекомендуем начать</div>
          <ul className="mt-4 divide-y divide-brand-ink/[0.07]">
            {COURSES.filter((c) => c.access === "free").map((c) => (
              <li key={c.slug}>
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
