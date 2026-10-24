import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import { AccessBadge } from "@/components/university/CourseCard";
import Icon from "@/components/ui/icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { COURSES, lessonsCount } from "@/data/catalog";

export const Route = createFileRoute("/university/$slug")({
  loader: ({ params }) => {
    const course = COURSES.find((c) => c.slug === params.slug);
    if (!course) throw notFound();
    return { course };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.course.title} — JETRA University` : "Курс — JETRA University";
    const desc = loaderData?.course.short ?? "Курс JETRA University";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: CoursePage,
});

function CoursePage() {
  const { course } = Route.useLoaderData();
  const total = lessonsCount(course);

  return (
    <PublicLayout>
      <section className="pb-12 pt-10 md:pt-14">
        <div className="container-x">
          <Link to="/university" className="inline-flex items-center gap-2 text-sm text-brand-snow/55 hover:text-brand-snow">
            <Icon name="ArrowLeft" size={16} /> Все курсы
          </Link>
          <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs uppercase tracking-[0.14em] text-brand-snow/45">{course.category}</span>
                <AccessBadge access={course.access} />
              </div>
              <h1 className="mt-5 font-display text-4xl font-light leading-[1.1] text-brand-snow md:text-[52px]">
                {course.title}
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-brand-snow/60">{course.short}</p>

              <div className="mt-10 grid grid-cols-3 gap-4 border-y border-white/[0.07] py-6">
                {[
                  ["Модулей", course.modules.length],
                  ["Уроков", total],
                  ["Уровень", course.level],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-sm text-brand-snow/45">{k}</div>
                    <div className="mt-1 font-display text-xl font-semibold text-brand-snow">{v}</div>
                  </div>
                ))}
              </div>

              <h2 className="mt-12 font-display text-2xl font-semibold text-brand-snow">Программа курса</h2>
              <Accordion type="multiple" defaultValue={[course.modules[0].id]} className="mt-6 space-y-3">
                {course.modules.map((mod, i) => (
                  <AccordionItem key={mod.id} value={mod.id} className="rounded-xl border border-white/[0.06] bg-brand-card px-5">
                    <AccordionTrigger className="py-5 text-left hover:no-underline">
                      <span className="flex items-center gap-4">
                        <span className="font-display text-sm tabular-nums text-brand-blue">{String(i + 1).padStart(2, "0")}</span>
                        <span className="font-medium text-brand-snow">{mod.title}</span>
                        <span className="hidden text-sm text-brand-snow/40 sm:inline">{mod.lessons.length} ур.</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1 pb-2">
                        {mod.lessons.map((l) => (
                          <li key={l.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-[15px] text-brand-snow/75">
                            <span className="flex items-center gap-3">
                              <Icon name={course.access === "free" ? "PlayCircle" : "Lock"} size={16} className="shrink-0 text-brand-snow/40" />
                              {l.title}
                            </span>
                            <span className="flex shrink-0 items-center gap-3 text-sm text-brand-snow/40">
                              {l.hasFiles && <Icon name="Paperclip" size={14} />}
                              {l.duration}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="rounded-2xl border border-white/[0.06] bg-brand-card p-7">
                <div className="text-sm text-brand-snow/50">Доступ к курсу</div>
                <div className="mt-2 font-display text-2xl font-semibold text-brand-snow">
                  {course.access === "free" ? "Бесплатно" : "Платный доступ"}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-brand-snow/55">
                  {course.access === "free"
                    ? "Зарегистрируйтесь, чтобы начать обучение и сохранять прогресс."
                    : "Оплата и автоматическое открытие доступа появятся на следующем этапе."}
                </p>
                <Link
                  to="/register"
                  className="mt-6 flex w-full items-center justify-center rounded-lg bg-brand-blue py-3.5 font-medium text-white transition-colors hover:bg-[#3271B0]"
                >
                  {course.access === "free" ? "Начать обучение" : "Записаться"}
                </Link>
                <ul className="mt-6 space-y-3 border-t border-white/[0.07] pt-6 text-sm text-brand-snow/65">
                  <li className="flex items-center gap-3"><Icon name="Video" size={16} className="text-brand-blue" />Видеоуроки</li>
                  <li className="flex items-center gap-3"><Icon name="FileText" size={16} className="text-brand-blue" />Дополнительные материалы</li>
                  <li className="flex items-center gap-3"><Icon name="BarChart3" size={16} className="text-brand-blue" />Прогресс обучения</li>
                </ul>
              </div>
              <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-brand-card p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/15 text-brand-blue">
                  <Icon name="UserRound" size={22} />
                </div>
                <div>
                  <div className="font-medium text-brand-snow">{course.teacher.name}</div>
                  <div className="text-sm text-brand-snow/50">{course.teacher.role}</div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
