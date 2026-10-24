import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";

export type CourseLevel = "Начальный" | "Средний" | "Продвинутый";
export const LEVELS: CourseLevel[] = ["Начальный", "Средний", "Продвинутый"];

export type DbLesson = { title: string; duration: string; hasFiles: boolean };
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
};

export type DbCourse = {
  id: number;
  slug: string;
  title: string;
  short: string;
  description: string;
  category: string;
  level: string;
  access: "free" | "paid";
  price: number;
  coverUrl: string;
  published: boolean;
  modules: DbModule[];
  author: DbAuthor | null;
  updatedAt: string;
};

export type CourseInput = {
  id?: number;
  title: string;
  category: string;
  short: string;
  description: string;
  level: string;
  access: "free" | "paid";
  price: number;
  authorId: number | null;
  coverUrl: string;
  published: boolean;
  modules: DbModule[];
};

type Fail = { ok: false; error: string; message: string };

export const lessonsTotal = (c: { modules: DbModule[] }) => c.modules.reduce((n, m) => n + m.lessons.length, 0);

export const formatPrice = (rub: number) => `${rub.toLocaleString("ru-RU")} ₽`;

export const catalogFn = createServerFn({ method: "GET" }).handler(async () => {
  const { callCourses } = await import("./courses.server");
  const r = await callCourses<{ courses: DbCourse[]; authors: DbAuthor[] }>("list");
  return r.ok ? { courses: r.courses, authors: r.authors } : { courses: [] as DbCourse[], authors: [] as DbAuthor[] };
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
  const r = await callCourses<{ courses: DbCourse[]; authors: DbAuthor[] }>("admin_list", {}, true);
  return r.ok ? { courses: r.courses, authors: r.authors } : { courses: [] as DbCourse[], authors: [] as DbAuthor[] };
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
      category: str(o.category, 80),
      short: str(o.short, 400),
      description: str(o.description, 20000),
      level: str(o.level, 40),
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
