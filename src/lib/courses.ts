import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";

export type CourseCategory = { id: number; name: string };
export type AdminCategory = CourseCategory & { coursesCount: number };

export type DbLesson = { title: string; duration: string; hasFiles: boolean; hasVideo?: boolean; isFree?: boolean };
export type DbModule = { title: string; lessons: DbLesson[] };
export type AuthorLink = { title: string; url: string };
export type AuthorFact = { value: string; label: string };
export type DbAuthor = {
  id: number;
  slug: string;
  name: string;
  role: string;
  photoUrl: string;
  bio: string;
  about: string;
  links: AuthorLink[];
  facts: AuthorFact[];
  published: boolean;
};
export type AdminAuthor = DbAuthor & { coursesTotal: number; coursesPublished: number };
export type AuthorInput = {
  id?: number;
  name: string;
  role: string;
  bio: string;
  about: string;
  photoUrl: string;
  links: AuthorLink[];
  facts: AuthorFact[];
  published: boolean;
};

export type DbCourse = {
  id: number;
  slug: string;
  title: string;
  short: string;
  description: string;
  category: string;
  categories: CourseCategory[];
  access: "free" | "paid";
  price: number;
  coverUrl: string;
  published: boolean;
  modules: DbModule[];
  flatProgram?: boolean;
  author: DbAuthor | null;
  updatedAt: string;
};

export type CourseInput = {
  id?: number;
  title: string;
  categoryIds: number[];
  short: string;
  description: string;
  access: "free" | "paid";
  price: number;
  authorId: number | null;
  coverUrl: string;
  published: boolean;
  modules: DbModule[];
};

type Fail = { ok: false; error: string; message: string };

export const lessonsTotal = (c: { modules: DbModule[] }) => c.modules.reduce((n, m) => n + m.lessons.length, 0);

export const durationMinutes = (d: string) => {
  const s = (d || "").toLowerCase();
  const h = s.match(/(\d+)\s*(ч|h)/);
  const m = s.match(/(\d+)\s*(мин|m)/);
  if (!h && !m) return Number(s.match(/\d+/)?.[0] ?? 0);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
};

export const courseMinutes = (c: { modules: DbModule[] }) =>
  c.modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + durationMinutes(l.duration), 0), 0);

export const formatDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} ч${m ? ` ${m} мин` : ""}` : `${m} мин`;
};

export type CourseProgress = { courseId: number; done: number; total: number; percent: number };

export const formatPrice = (rub: number) => `${rub.toLocaleString("ru-RU")} ₽`;

export const catalogFn = createServerFn({ method: "GET" }).handler(async () => {
  const { callCourses } = await import("./courses.server");
  const { callLearning, hasSession } = await import("./learning.server");
  const [r, p] = await Promise.all([
    callCourses<{ courses: DbCourse[]; authors: DbAuthor[]; categories: AdminCategory[] }>("list"),
    hasSession() ? callLearning<{ progress: CourseProgress[] }>("my_progress") : Promise.resolve(null),
  ]);
  const progress = p && p.ok ? p.progress : ([] as CourseProgress[]);
  const loggedIn = !!p && p.ok;
  return r.ok
    ? { courses: r.courses, authors: r.authors, categories: r.categories, progress, loggedIn }
    : { courses: [] as DbCourse[], authors: [] as DbAuthor[], categories: [] as AdminCategory[], progress, loggedIn };
});

export const courseBySlugFn = createServerFn({ method: "GET" })
  .validator((input: unknown) => ({ slug: typeof input === "object" && input && typeof (input as { slug?: unknown }).slug === "string" ? (input as { slug: string }).slug.slice(0, 120) : "" }))
  .handler(async ({ data }) => {
    const { callCourses } = await import("./courses.server");
    const r = await callCourses<{ course: DbCourse }>("get", { slug: data.slug });
    if (!r.ok) throw notFound();
    return r.course;
  });

export const adminCoursesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { callCourses } = await import("./courses.server");
  const r = await callCourses<{ courses: DbCourse[]; authors: DbAuthor[]; categories: AdminCategory[] }>("admin_list", {}, true);
  return r.ok
    ? { courses: r.courses, authors: r.authors, categories: r.categories }
    : { courses: [] as DbCourse[], authors: [] as DbAuthor[], categories: [] as AdminCategory[] };
});

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

function toModules(v: unknown): DbModule[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 50).map((m) => {
    const o = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
    const lessons = Array.isArray(o.lessons) ? o.lessons : [];
    return {
      title: str(o.title, 200),
      lessons: lessons.slice(0, 100).map((l) => {
        const lo = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
        return { title: str(lo.title, 200), duration: str(lo.duration, 30), hasFiles: Boolean(lo.hasFiles) };
      }),
    };
  });
}

export const saveCourseFn = createServerFn({ method: "POST" })
  .validator((input: unknown): CourseInput => {
    const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return {
      id: Number(o.id) || undefined,
      title: str(o.title, 200),
      categoryIds: (Array.isArray(o.categoryIds) ? o.categoryIds : []).slice(0, 30).map((x) => Math.round(Number(x) || 0)).filter((x) => x > 0),
      short: str(o.short, 400),
      description: str(o.description, 20000),
      access: o.access === "paid" ? "paid" : "free",
      price: Math.max(0, Math.round(Number(o.price) || 0)),
      authorId: Number(o.authorId) || null,
      coverUrl: str(o.coverUrl, 500),
      published: o.published !== false,
      modules: toModules(o.modules),
    };
  })
  .handler(async ({ data }): Promise<{ ok: true; course: DbCourse } | Fail> => {
    const { callCourses } = await import("./courses.server");
    const r = await callCourses<{ course: DbCourse }>("save", data as unknown as Record<string, unknown>, true);
    return r.ok ? { ok: true, course: r.course } : { ok: false, error: r.error, message: r.message };
  });

export const uploadCoverFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return { contentType: str(o.contentType, 40), data: str(o.data, 7_200_000) };
  })
  .handler(async ({ data }): Promise<{ ok: true; url: string } | Fail> => {
    const { callCourses } = await import("./courses.server");
    const r = await callCourses<{ url: string }>("upload_cover", data, true);
    return r.ok ? { ok: true, url: r.url } : { ok: false, error: r.error, message: r.message };
  });

export const adminAuthorsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { callCourses } = await import("./courses.server");
  const r = await callCourses<{ authors: AdminAuthor[] }>("admin_authors", {}, true);
  return r.ok ? r.authors : ([] as AdminAuthor[]);
});

export const saveAuthorFn = createServerFn({ method: "POST" })
  .validator((input: unknown): AuthorInput => {
    const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return {
      id: Number(o.id) || undefined,
      name: str(o.name, 120),
      role: str(o.role, 160),
      bio: str(o.bio, 500),
      published: o.published !== false,
      about: str(o.about, 30000),
      photoUrl: str(o.photoUrl, 500),
      links: (Array.isArray(o.links) ? o.links : []).slice(0, 20).map((l) => {
        const lo = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
        return { title: str(lo.title, 80), url: str(lo.url, 500) };
      }),
      facts: (Array.isArray(o.facts) ? o.facts : []).slice(0, 12).map((f) => {
        const fo = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
        return { value: str(fo.value, 40), label: str(fo.label, 120) };
      }),
    };
  })
  .handler(async ({ data }): Promise<{ ok: true; author: AdminAuthor } | Fail> => {
    const { callCourses } = await import("./courses.server");
    const r = await callCourses<{ author: AdminAuthor }>("save_author", data as unknown as Record<string, unknown>, true);
    return r.ok ? { ok: true, author: r.author } : { ok: false, error: r.error, message: r.message };
  });

export const uploadAuthorPhotoFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return { contentType: str(o.contentType, 40), data: str(o.data, 7_200_000) };
  })
  .handler(async ({ data }): Promise<{ ok: true; url: string } | Fail> => {
    const { callCourses } = await import("./courses.server");
    const r = await callCourses<{ url: string }>("upload_author_photo", data, true);
    return r.ok ? { ok: true, url: r.url } : { ok: false, error: r.error, message: r.message };
  });

export const authorBySlugFn = createServerFn({ method: "GET" })
  .validator((input: unknown) => ({ slug: typeof input === "object" && input && typeof (input as { slug?: unknown }).slug === "string" ? (input as { slug: string }).slug.slice(0, 60) : "" }))
  .handler(async ({ data }) => {
    const { callCourses } = await import("./courses.server");
    const r = await callCourses<{ author: DbAuthor; courses: DbCourse[] }>("author", { slug: data.slug });
    if (!r.ok) throw notFound();
    return { author: r.author, courses: r.courses };
  });

const idPayload = (input: unknown) => {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return { id: Math.max(0, Math.round(Number(o.id) || 0)), published: o.published === true };
};

async function adminCall<T>(action: string, data: Record<string, unknown>): Promise<({ ok: true } & T) | Fail> {
  const { callCourses } = await import("./courses.server");
  const r = await callCourses<T>(action, data, true);
  return r.ok ? r : { ok: false, error: r.error, message: r.message };
}

export const setCoursePublishedFn = createServerFn({ method: "POST" })
  .validator(idPayload)
  .handler(({ data }) => adminCall<{ course: DbCourse }>("set_course_published", data));

export const deleteCourseFn = createServerFn({ method: "POST" })
  .validator(idPayload)
  .handler(({ data }) => adminCall<{ title: string }>("delete_course", { id: data.id }));

export const setAuthorPublishedFn = createServerFn({ method: "POST" })
  .validator(idPayload)
  .handler(({ data }) => adminCall<{ author: AdminAuthor }>("set_author_published", data));

export const deleteAuthorFn = createServerFn({ method: "POST" })
  .validator(idPayload)
  .handler(({ data }) => adminCall<{ name: string; coursesDetached: number }>("delete_author", { id: data.id }));

export const adminCategoriesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { callCourses } = await import("./courses.server");
  const r = await callCourses<{ categories: AdminCategory[] }>("admin_categories", {}, true);
  return r.ok ? r.categories : ([] as AdminCategory[]);
});

export const saveCategoryFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return { id: Math.max(0, Math.round(Number(o.id) || 0)) || undefined, name: str(o.name, 80) };
  })
  .handler(({ data }) => adminCall<{ category: AdminCategory }>("save_category", data));

export const deleteCategoryFn = createServerFn({ method: "POST" })
  .validator(idPayload)
  .handler(({ data }) => adminCall<{ name: string }>("delete_category", { id: data.id }));

export type ArchiveKind = "course" | "author" | "category" | "user";
export type ArchiveItem = { kind: ArchiveKind; id: number; title: string; archivedAt: string };

export const archiveListFn = createServerFn({ method: "GET" }).handler(async () => {
  const { callCourses } = await import("./courses.server");
  const { callAuth } = await import("./auth.server");
  const [a, b] = await Promise.all([
    callCourses<{ items: ArchiveItem[] }>("archive_list", {}, true),
    callAuth<{ items: ArchiveItem[] }>("admin_archived_users", {}, true),
  ]);
  const items = [...(a.ok ? a.items : []), ...(b.ok ? b.items : [])];
  return items.sort((x, y) => String(y.archivedAt).localeCompare(String(x.archivedAt)));
});

const archivePayload = (input: unknown) => {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const kinds: ArchiveKind[] = ["course", "author", "category", "user"];
  return {
    kind: (kinds.includes(o.kind as ArchiveKind) ? o.kind : "course") as ArchiveKind,
    id: Math.max(0, Math.round(Number(o.id) || 0)),
    purge: o.purge === true,
  };
};

export const archiveActionFn = createServerFn({ method: "POST" })
  .validator(archivePayload)
  .handler(async ({ data }): Promise<{ ok: true; title: string } | Fail> => {
    if (data.kind === "user") {
      const { callAuth } = await import("./auth.server");
      const r = await callAuth<{ title: string }>(data.purge ? "admin_purge_user" : "admin_restore_user", { id: data.id }, true);
      return r.ok ? { ok: true, title: r.title } : { ok: false, error: r.error, message: r.message };
    }
    return adminCall<{ title: string }>(data.purge ? "archive_purge" : "archive_restore", { kind: data.kind, id: data.id });
  });
