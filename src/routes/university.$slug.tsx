import { requireAuth } from "@/lib/requireAuth";
import { createFileRoute, getRouteApi, Link, notFound } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import { AccessBadge, ClubPerk } from "@/components/university/CourseCard";
import CategoryChips from "@/components/university/CategoryChips";
import AuthorAvatar from "@/components/university/AuthorAvatar";
import Icon from "@/components/ui/icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { courseBySlugFn, coursePricing, formatPrice, lessonsTotal, monthsLabel } from "@/lib/courses";

export const Route = createFileRoute("/university/$slug")({
  beforeLoad: requireAuth,
  loader: async ({ params }) => {
    const course = await courseBySlugFn({ data: { slug: params.slug } });
    if (!course) throw notFound();
    return { course };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.course.title} — JETRA University` : "Обучение — JETRA University";
    const desc = loaderData?.course.short ?? "Обучение JETRA University";
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

const rootApi = getRouteApi("__root__");

function CoursePage() {
  const user = rootApi.useLoaderData();
  const { course } = Route.useLoaderData();
  const total = lessonsTotal(course);
  const pricing = coursePricing(course);
  const freeCount = course.modules.reduce((n, m) => n + m.lessons.filter((l) => l.isFree).length, 0);

  return (
    <PublicLayout>
      <section className="pb-12 pt-10 md:pt-14">
        <div className="container-x">
          <Link to="/university" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
            <Icon name="ArrowLeft" size={16} /> Все обучения
          </Link>
          <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
            <div>
              <div className="flex flex-wrap items-center gap-2"><AccessBadge access={course.access} price={course.price} oldPrice={course.oldPrice} tariffs={course.tariffs} /><ClubPerk months={course.clubMonths ?? 0} /></div>
              <h1 className="mt-5 font-display text-4xl font-light leading-[1.1] text-brand-ink md:text-[52px]">
                {course.title}
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-brand-muted">{course.short}</p>
              <CategoryChips
                names={course.categories.length ? course.categories.map((x) => x.name) : course.category ? [course.category] : []}
                className="mt-5"
              />

              {course.coverUrl && (
                <div className="mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-brand-surface">
                  <img src={course.coverUrl} alt={course.title} className="h-full w-full object-cover" />
                </div>
              )}

              <div className="mt-10 grid grid-cols-2 gap-4 border-y border-brand-ink/10 py-6">
                {(course.flatProgram ? [["Уроков", total]] : [
                  ["Модулей", course.modules.length],
                  ["Уроков", total],
                ]).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-sm text-brand-muted">{k}</div>
                    <div className="mt-1 font-display text-xl font-semibold text-brand-ink">{v}</div>
                  </div>
                ))}
              </div>

              {course.description && (
                <>
                  <h2 className="mt-12 font-display text-2xl font-semibold text-brand-ink">Об обучении</h2>
                  <div className="mt-5 whitespace-pre-line text-[16px] leading-relaxed text-brand-ink/80">{course.description}</div>
                </>
              )}

              {course.modules.length > 0 && (
              <>
              <h2 className="mt-12 font-display text-2xl font-semibold text-brand-ink">Программа обучения</h2>
              {course.flatProgram ? (
                <ul className="mt-6 divide-y divide-brand-ink/[0.08] rounded-xl border border-brand-ink/10 bg-white px-3">
                  {course.modules.flatMap((m) => m.lessons).map((l, li) => (
                    <li key={li} className="flex items-center justify-between gap-3 px-2 py-3.5 text-[15px] text-brand-ink/85">
                      <span className="flex items-center gap-3">
                        <span className="w-6 shrink-0 font-display text-sm tabular-nums text-brand-blue">{String(li + 1).padStart(2, "0")}</span>
                        {l.title}
                        {course.access === "paid" && l.isFree && (
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">Бесплатно</span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-3 text-sm text-brand-ink/50">
                        {course.access === "paid" && !l.isFree && <Icon name="Lock" size={14} />}
                        {l.hasVideo && <Icon name="PlayCircle" size={14} />}
                        {l.hasFiles && <Icon name="Paperclip" size={14} />}
                        {l.duration}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
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
                              <Icon name={course.access === "free" || l.isFree ? "PlayCircle" : "Lock"} size={16} className="shrink-0 text-brand-ink/50" />
                              {l.title}
                              {course.access === "paid" && l.isFree && (
                                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">Бесплатно</span>
                              )}
                            </span>
                            <span className="flex shrink-0 items-center gap-3 text-sm text-brand-ink/50">
                              {l.hasVideo && <Icon name="PlayCircle" size={14} />}
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
              )}
              </>
              )}
            </div>

            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="rounded-2xl border border-brand-ink/10 bg-white p-7">
                <div className="text-sm text-brand-muted">Доступ к обучению</div>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-2xl font-semibold text-brand-ink">
                    {course.access === "free" ? "Бесплатно" : pricing.price ? `${pricing.from ? "от " : ""}${formatPrice(pricing.price)}` : "Платный доступ"}
                  </span>
                  {pricing.oldPrice > 0 && (
                    <>
                      <s className="text-base text-brand-muted">{formatPrice(pricing.oldPrice)}</s>
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                        −{Math.round(((pricing.oldPrice - pricing.price) * 100) / pricing.oldPrice)}%
                      </span>
                    </>
                  )}
                </div>
                {course.access === "paid" && (course.tariffs?.length ?? 0) > 1 && (
                  <ul className="mt-4 space-y-2.5">
                    {course.tariffs.map((t, i) => (
                      <li key={i} className="rounded-lg border border-brand-ink/10 bg-brand-light/60 px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-medium text-brand-ink">{t.name}</span>
                          <span className="shrink-0 text-right">
                            {t.oldPrice > t.price && <s className="mr-1.5 text-xs text-brand-muted">{formatPrice(t.oldPrice)}</s>}
                            <span className="font-semibold text-brand-ink">{formatPrice(t.price)}</span>
                          </span>
                        </div>
                        {t.description && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-brand-muted">{t.description}</p>}
                      </li>
                    ))}
                  </ul>
                )}
                {course.access === "paid" && (course.clubMonths ?? 0) > 0 && (
                  <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3">
                    <Icon name="Gift" size={18} className="mt-0.5 shrink-0 text-amber-500" />
                    <div className="text-sm leading-relaxed text-amber-900">
                      <span className="font-medium">Подарок при покупке:</span> подписка на клуб «CAPITALIST» на {monthsLabel(course.clubMonths)}
                    </div>
                  </div>
                )}
                <p className="mt-3 text-sm leading-relaxed text-brand-muted">
                  {course.access === "free"
                    ? user
                      ? "Проходите уроки в своём темпе — прогресс сохраняется автоматически."
                      : "Зарегистрируйтесь, чтобы начать обучение и сохранять прогресс."
                    : freeCount > 0
                      ? `${freeCount} ${freeCount === 1 ? "урок доступен" : freeCount < 5 ? "урока доступны" : "уроков доступны"} бесплатно после регистрации, остальные — после оплаты.`
                      : "Доступ открывается после оплаты. Если доступ уже выдан — обучение откроется в личном кабинете."}
                </p>
                {user ? (
                  <Link
                    to="/cabinet/learn/$slug"
                    params={{ slug: course.slug }}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue py-3.5 font-medium text-white transition-colors hover:bg-[#3271B0]"
                  >
                    <Icon name="Play" size={17} /> {course.access === "free" ? "Перейти к обучению" : freeCount > 0 ? "Смотреть бесплатные уроки" : "Открыть обучение"}
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="mt-6 flex w-full items-center justify-center rounded-lg bg-brand-blue py-3.5 font-medium text-white transition-colors hover:bg-[#3271B0]"
                    >
                      {course.access === "free" ? "Начать обучение" : freeCount > 0 ? "Начать бесплатно" : "Записаться"}
                    </Link>
                    <Link to="/login" className="mt-3 block text-center text-sm text-brand-muted hover:text-brand-ink">
                      Уже есть аккаунт? <span className="font-medium text-brand-blue">Войти</span>
                    </Link>
                  </>
                )}
                <ul className="mt-6 space-y-3 border-t border-brand-ink/10 pt-6 text-sm text-brand-muted">
                  <li className="flex items-center gap-3"><Icon name="Video" size={16} className="text-brand-blue" />Видеоуроки</li>
                  <li className="flex items-center gap-3"><Icon name="FileText" size={16} className="text-brand-blue" />Дополнительные материалы</li>
                  <li className="flex items-center gap-3"><Icon name="BarChart3" size={16} className="text-brand-blue" />Прогресс обучения</li>
                </ul>
              </div>
              {course.author && (
                <div className="mt-5 rounded-2xl border border-brand-ink/10 bg-white p-6">
                  <div className="text-xs uppercase tracking-[0.14em] text-brand-muted">Автор обучения</div>
                  <Link to="/university/authors/$slug" params={{ slug: course.author.slug }} className="group mt-4 flex items-center gap-4">
                    <AuthorAvatar name={course.author.name} photoUrl={course.author.photoUrl} className="h-14 w-14" textClassName="text-base" />
                    <div className="min-w-0">
                      <div className="font-medium text-brand-ink group-hover:text-brand-blue">{course.author.name}</div>
                      {course.author.role && <div className="text-sm text-brand-muted">{course.author.role}</div>}
                    </div>
                  </Link>
                  {course.author.bio && (
                    <p className="mt-4 line-clamp-4 whitespace-pre-line border-t border-brand-ink/10 pt-4 text-sm leading-relaxed text-brand-muted">{course.author.bio}</p>
                  )}
                  <Link
                    to="/university/authors/$slug"
                    params={{ slug: course.author.slug }}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:underline"
                  >
                    Подробнее об авторе <Icon name="ArrowRight" size={15} />
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
