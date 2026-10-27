import { requireAuth } from "@/lib/requireAuth";
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import AuthorAvatar from "@/components/university/AuthorAvatar";
import CourseCard from "@/components/university/CourseCard";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { authorBySlugFn, lessonsTotal, type AuthorLink } from "@/lib/courses";

export const Route = createFileRoute("/university/authors/$slug")({
  beforeLoad: requireAuth,
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
  const cats = useMemo(() => {
    const map = new Map<string, { key: string; name: string; count: number }>();
    for (const c of courses) {
      const list = c.categories.length ? c.categories.map((x) => ({ key: String(x.id), name: x.name })) : c.category ? [{ key: c.category, name: c.category }] : [];
      for (const x of list) map.set(x.key, { ...x, count: (map.get(x.key)?.count ?? 0) + 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
  }, [courses]);
  const [cat, setCat] = useState<string | null>(null);
  const shown = cat
    ? courses.filter((c) => (c.categories.length ? c.categories.some((x) => String(x.id) === cat) : c.category === cat))
    : courses;
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

                {cats.length > 0 && (
                  <div className="mt-6 border-t border-brand-ink/10 pt-6 text-left">
                    <div className="text-sm font-medium text-brand-ink">Категории обучений</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {cats.map((x) => (
                        <button
                          key={x.key}
                          type="button"
                          onClick={() => setCat(cat === x.key ? null : x.key)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                            cat === x.key ? "bg-brand-blue text-white" : "bg-brand-surface text-brand-ink hover:bg-brand-blue/10",
                          )}
                        >
                          {x.name}
                          <span className={cn("text-xs", cat === x.key ? "text-white/75" : "text-brand-ink/45")}>{x.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-2xl font-semibold text-brand-ink">
                    Обучения автора{cat && <span className="text-brand-muted"> · {cats.find((x) => x.key === cat)?.name}</span>}
                  </h2>
                  {cat && (
                    <button type="button" onClick={() => setCat(null)} className="inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink">
                      <Icon name="X" size={15} /> Показать все
                    </button>
                  )}
                </div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {shown.map((c) => (
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
