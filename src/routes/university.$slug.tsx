import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import { AccessBadge } from "@/components/university/CourseCard";
import Icon from "@/components/ui/icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { courseBySlugFn, formatPrice, lessonsTotal } from "@/lib/courses";

export const Route = createFileRoute("/university/$slug")({
  loader: async ({ params }) => {
    const course = await courseBySlugFn({ data: { slug: params.slug } });
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
        ...(loaderData?.course.coverUrl ? [{ property: "og:image", content: loaderData.course.coverUrl }] : []),
      ],
    };
  },
  component: CoursePage,
});

function CoursePage() {
  const { course } = Route.useLoaderData();
  const total = lessonsTotal(course);

  return (
    <PublicLayout>
      <section className="pb-12 pt-10 md:pt-14">
        <div className="container-x">
          <Link to="/university" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
            <Icon name="ArrowLeft" size={16} /> Все курсы
          </Link>
          <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs uppercase tracking-[0.14em] text-brand-muted">{course.category}</span>
                <AccessBadge access={course.access} price={course.price} />
              </div>
              <h1 className="mt-5 font-display text-4xl font-light leading-[1.1] text-brand-ink md:text-[52px]">
                {course.title}
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-brand-muted">{course.short}</p>

              {course.coverUrl && (
                <div className="mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-brand-surface">
                  <img src={course.coverUrl} alt={course.title} className="h-full w-full object-cover" />
                </div>
              )}

              <div className="mt-10 grid grid-cols-3 gap-4 border-y border-brand-ink/10 py-6">
                {[
                  ["Модулей", course.modules.length],
                  ["Уроков", total],
                  ["Уровень", course.level],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-sm text-brand-muted">{k}</div>
                    <div className="mt-1 font-display text-xl font-semibold text-brand-ink">{v}</div>
                  </div>
                ))}
              </div>

              {course.description && (
                <>
                  <h2 className="mt-12 font-display text-2xl font-semibold text-brand-ink">О курсе</h2>
                  <div className="mt-5 whitespace-pre-line text-[16px] leading-relaxed text-brand-ink/80">{course.description}</div>
                </>
              )}

              {course.modules.length > 0 && (
              <>
              <h2 className="mt-12 font-display text-2xl font-semibold text-brand-ink">Программа курса</h2>
              <Accordion type="multiple" defaultValue={["m0"]} className="mt-6 space-y-3">
                {course.modules.map((mod, i) => (
                  <AccordionItem key={i} value={`m${i}`} className="rounded-xl border border-brand-ink/10 bg-white px-5">
                    <AccordionTrigger className="py-5 text-left hover:no-underline">
                      <span className="flex items-center gap-4">
                        <span className="font-display text-sm tabular-nums text-brand-blue">{String(i + 1).padStart(2, "0")}</span>
                        <span className="font-medium text-brand-ink">{mod.title}</span>
                        <span className="hidden text-sm text-brand-ink/50 sm:inline">{mod.lessons.length} ур.</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1 pb-2">
                        {mod.lessons.map((l, li) => (
                          <li key={li} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-[15px] text-brand-ink/85">
                            <span className="flex items-center gap-3">
                              <Icon name={course.access === "free" ? "PlayCircle" : "Lock"} size={16} className="shrink-0 text-brand-ink/50" />
                              {l.title}
                            </span>
                            <span className="flex shrink-0 items-center gap-3 text-sm text-brand-ink/50">
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
              </>
              )}
            </div>

            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="rounded-2xl border border-brand-ink/10 bg-white p-7">
                <div className="text-sm text-brand-muted">Доступ к курсу</div>
                <div className="mt-2 font-display text-2xl font-semibold text-brand-ink">
                  {course.access === "free" ? "Бесплатно" : course.price ? formatPrice(course.price) : "Платный доступ"}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-brand-muted">
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
                <ul className="mt-6 space-y-3 border-t border-brand-ink/10 pt-6 text-sm text-brand-muted">
                  <li className="flex items-center gap-3"><Icon name="Video" size={16} className="text-brand-blue" />Видеоуроки</li>
                  <li className="flex items-center gap-3"><Icon name="FileText" size={16} className="text-brand-blue" />Дополнительные материалы</li>
                  <li className="flex items-center gap-3"><Icon name="BarChart3" size={16} className="text-brand-blue" />Прогресс обучения</li>
                </ul>
              </div>
              {course.author && (
                <div className="mt-5 flex items-center gap-4 rounded-2xl border border-brand-ink/10 bg-white p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-blue/15 text-brand-blue">
                    <Icon name="UserRound" size={22} />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-brand-muted">Автор курса</div>
                    <div className="mt-0.5 font-medium text-brand-ink">{course.author.name}</div>
                    {course.author.role && <div className="text-sm text-brand-muted">{course.author.role}</div>}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
