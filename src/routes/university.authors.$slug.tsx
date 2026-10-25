import { createFileRoute, Link } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import AuthorAvatar from "@/components/university/AuthorAvatar";
import CourseCard from "@/components/university/CourseCard";
import Icon from "@/components/ui/icon";
import { authorBySlugFn, lessonsTotal, type AuthorLink } from "@/lib/courses";

export const Route = createFileRoute("/university/authors/$slug")({
  loader: ({ params }) => authorBySlugFn({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    const a = loaderData?.author;
    const title = a ? `${a.name} — автор JETRA University` : "Автор — JETRA University";
    const desc = a ? a.bio || `${a.name}${a.role ? `, ${a.role}` : ""}. Обучения автора в JETRA University.` : "Автор обучений JETRA University";
    return {
      meta: [
        { title },
        { name: "description", content: desc.slice(0, 300) },
        { property: "og:title", content: title },
        { property: "og:description", content: desc.slice(0, 300) },
        ...(a?.photoUrl ? [{ property: "og:image", content: a.photoUrl }] : []),
      ],
    };
  },
  component: AuthorPage,
});

const LINK_ICONS: [RegExp, string][] = [
  [/t\.me|telegram/i, "Send"],
  [/youtube|youtu\.be/i, "Youtube"],
  [/vk\.com|vk\.ru/i, "Users"],
  [/linkedin/i, "Linkedin"],
  [/instagram/i, "Instagram"],
  [/twitter|x\.com/i, "Twitter"],
  [/github/i, "Github"],
  [/^mailto:/i, "Mail"],
];

const linkIcon = (l: AuthorLink) => LINK_ICONS.find(([re]) => re.test(l.url))?.[1] ?? "Globe";

function AuthorPage() {
  const { author, courses } = Route.useLoaderData();
  const lessons = courses.reduce((n, c) => n + lessonsTotal(c), 0);
  const paragraphs = (author.about || author.bio)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <PublicLayout>
      <section className="pb-24 pt-10 md:pt-14">
        <div className="container-x">
          <Link to="/university" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
            <Icon name="ArrowLeft" size={16} /> Все обучения
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-14">
            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="rounded-2xl border border-brand-ink/10 bg-white p-7 text-center lg:text-left">
                <AuthorAvatar
                  name={author.name}
                  photoUrl={author.photoUrl}
                  className="mx-auto h-40 w-40 lg:mx-0"
                  textClassName="font-display text-4xl text-brand-ink/70"
                />
                <h1 className="mt-6 font-display text-[28px] font-semibold leading-tight text-brand-ink">{author.name}</h1>
                {author.role && <p className="mt-2 text-brand-muted">{author.role}</p>}

                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-brand-ink/10 pt-6 text-left">
                  <div>
                    <div className="font-display text-2xl font-semibold text-brand-ink">{courses.length}</div>
                    <div className="text-sm text-brand-muted">{courses.length === 1 ? "обучение" : courses.length < 5 ? "обучения" : "обучений"}</div>
                  </div>
                  <div>
                    <div className="font-display text-2xl font-semibold text-brand-ink">{lessons}</div>
                    <div className="text-sm text-brand-muted">уроков</div>
                  </div>
                </div>

                {author.links.length > 0 && (
                  <div className="mt-6 space-y-2 border-t border-brand-ink/10 pt-6 text-left">
                    {author.links.map((l, i) => (
                      <a
                        key={i}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] text-brand-ink transition-colors hover:bg-brand-light"
                      >
                        <Icon name={linkIcon(l)} fallback="Globe" size={17} className="shrink-0 text-brand-blue" />
                        <span className="min-w-0 flex-1 truncate">{l.title}</span>
                        <Icon name="ArrowUpRight" size={15} className="shrink-0 text-brand-muted" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <div className="min-w-0">
              {author.facts.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {author.facts.map((f, i) => (
                    <div key={i} className="rounded-2xl border border-brand-ink/10 bg-white p-6">
                      <div className="font-display text-3xl font-semibold text-brand-blue">{f.value}</div>
                      <div className="mt-2 text-[15px] leading-snug text-brand-muted">{f.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {paragraphs.length > 0 && (
                <div className={author.facts.length > 0 ? "mt-12" : ""}>
                  <h2 className="font-display text-2xl font-semibold text-brand-ink">Об авторе</h2>
                  <div className="mt-5 max-w-3xl space-y-4 text-[17px] leading-relaxed text-brand-ink/80">
                    {paragraphs.map((p, i) => (
                      <p key={i} className="whitespace-pre-line">{p}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className={author.facts.length > 0 || paragraphs.length > 0 ? "mt-14" : ""}>
                <h2 className="font-display text-2xl font-semibold text-brand-ink">Обучения автора</h2>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {courses.map((c) => (
                    <CourseCard key={c.id} c={c} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
