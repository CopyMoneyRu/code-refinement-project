import { createServerFn } from "@tanstack/react-start";

export type UnlockMode = "all" | "sequential";
export type VideoType = "none" | "link" | "file";
export type Material = { id?: number; title: string; kind: "file" | "link"; url: string; fileSize: number };

export type LessonBrief = {
  id: number;
  title: string;
  duration: string;
  hasVideo: boolean;
  materialsCount: number;
  isFree: boolean;
  completed?: boolean;
  locked?: boolean;
  paidLocked?: boolean;
};
export type LessonFull = LessonBrief & {
  description: string;
  videoType: VideoType;
  videoUrl: string;
  materials: Material[];
};
export type ModuleBrief = { id: number; title: string; description: string; unlockMode: UnlockMode; lessons: LessonBrief[] };
export type ModuleFull = Omit<ModuleBrief, "lessons"> & { lessons: LessonFull[] };

export type CourseHead = {
  id: number;
  slug: string;
  title: string;
  short: string;
  coverUrl: string;
  access: "free" | "paid";
  price: number;
  level: string;
  category: string;
  published: boolean;
  author: { name: string; slug: string } | null;
};
export type Progress = { done: number; total: number; percent: number; nextLessonId: number | null };
export type AccessState = "open" | "login" | "paid" | "hidden";

type Fail = { ok: false; error: string; message: string };
type Ok<T> = { ok: true } & T;

const obj = (v: unknown) => (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

async function call<T>(action: string, data: Record<string, unknown> = {}): Promise<Ok<T> | Fail> {
  const { callLearning } = await import("./learning.server");
  const r = await callLearning<T>(action, data);
  return r.ok ? r : { ok: false, error: r.error, message: r.message };
}

export const courseLearnFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => ({ slug: str(obj(i).slug, 120) }))
  .handler(({ data }) =>
    call<{ course: CourseHead; state: AccessState; preview: boolean; modules: ModuleBrief[]; progress: Progress; freeLessons: number }>(
      "course_learn",
      data,
    ),
  );

export const lessonGetFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => ({ lessonId: num(obj(i).lessonId) }))
  .handler(({ data }) =>
    call<{
      lesson: LessonFull;
      module: { id: number; title: string; unlockMode: UnlockMode };
      position: { index: number; total: number };
      prev: { id: number; title: string; locked: boolean; paidLocked: boolean } | null;
      next: { id: number; title: string; locked: boolean; paidLocked: boolean } | null;
      state: AccessState;
    }>("lesson_get", data),
  );

export const lessonCompleteFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => ({ lessonId: num(obj(i).lessonId), completed: obj(i).completed !== false }))
  .handler(({ data }) => call<{ modules: ModuleBrief[]; progress: Progress }>("lesson_complete", data));

export type MyCourse = CourseHead & { progress: Progress; lastActivity: string | null; state: AccessState };
export const myCoursesFn = createServerFn({ method: "GET" }).handler(async () => {
  const r = await call<{ courses: MyCourse[] }>("my_courses");
  return r.ok ? r.courses : ([] as MyCourse[]);
});

export type ProgramCourse = { id: number; slug: string; title: string; published: boolean; access: "free" | "paid"; modules: number; lessons: number };
export const programCoursesFn = createServerFn({ method: "GET" }).handler(async () => {
  const r = await call<{ courses: ProgramCourse[] }>("program_courses");
  return r.ok ? r.courses : ([] as ProgramCourse[]);
});

export const programGetFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => ({ courseId: num(obj(i).courseId) }))
  .handler(({ data }) => call<{ course: CourseHead; modules: ModuleFull[] }>("program_get", data));

export const moduleSaveFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => {
    const o = obj(i);
    return {
      id: num(o.id) || undefined,
      courseId: num(o.courseId),
      title: str(o.title, 200),
      description: str(o.description, 5000),
      unlockMode: o.unlockMode === "sequential" ? "sequential" : "all",
    };
  })
  .handler(({ data }) => call<{ moduleId: number; modules: ModuleFull[] }>("module_save", data));

const idMove = (i: unknown) => ({ id: num(obj(i).id), direction: Number(obj(i).direction) > 0 ? 1 : -1 });

export const moduleDeleteFn = createServerFn({ method: "POST" })
  .validator(idMove)
  .handler(({ data }) => call<{ modules: ModuleFull[] }>("module_delete", { id: data.id }));

export const moduleMoveFn = createServerFn({ method: "POST" })
  .validator(idMove)
  .handler(({ data }) => call<{ modules: ModuleFull[] }>("module_move", data));

export type LessonInput = {
  id?: number;
  moduleId: number;
  title: string;
  description: string;
  duration: string;
  videoType: VideoType;
  videoUrl: string;
  isFree: boolean;
  materials: Material[];
};

export const lessonSaveFn = createServerFn({ method: "POST" })
  .validator((i: unknown): LessonInput => {
    const o = obj(i);
    const vt = o.videoType === "link" || o.videoType === "file" ? o.videoType : "none";
    return {
      id: num(o.id) || undefined,
      moduleId: num(o.moduleId),
      title: str(o.title, 200),
      description: str(o.description, 50000),
      duration: str(o.duration, 30),
      videoType: vt,
      videoUrl: str(o.videoUrl, 1000),
      isFree: o.isFree === true,
      materials: (Array.isArray(o.materials) ? o.materials : []).slice(0, 30).map((m) => {
        const mo = obj(m);
        return { title: str(mo.title, 200), kind: mo.kind === "link" ? "link" : "file", url: str(mo.url, 1000), fileSize: num(mo.fileSize) };
      }),
    };
  })
  .handler(({ data }) => call<{ lessonId: number; modules: ModuleFull[] }>("lesson_save", data as unknown as Record<string, unknown>));

export const lessonDeleteFn = createServerFn({ method: "POST" })
  .validator(idMove)
  .handler(({ data }) => call<{ modules: ModuleFull[] }>("lesson_delete", { id: data.id }));

export const lessonMoveFn = createServerFn({ method: "POST" })
  .validator(idMove)
  .handler(({ data }) => call<{ modules: ModuleFull[] }>("lesson_move", data));

export const uploadStartFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => {
    const o = obj(i);
    return { kind: o.kind === "video" ? "video" : "material", filename: str(o.filename, 255), size: num(o.size) };
  })
  .handler(({ data }) => call<{ uploadId: string; token: string; chunkSize: number; chunks: number }>("upload_start", data));

export type AccessGrant = {
  id: number;
  createdAt: string;
  grantedBy: string | null;
  user: { id: number; name: string; email: string };
  course: { id: number; title: string };
};
export const accessListFn = createServerFn({ method: "GET" }).handler(async () => {
  const r = await call<{ grants: AccessGrant[]; courses: { id: number; title: string; published: boolean }[] }>("access_list");
  return r.ok ? { grants: r.grants, courses: r.courses } : { grants: [] as AccessGrant[], courses: [] as { id: number; title: string; published: boolean }[] };
});

export const accessGrantFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => ({ email: str(obj(i).email, 255).trim(), courseId: num(obj(i).courseId) }))
  .handler(({ data }) => call<{ created: boolean; userName: string; courseTitle: string }>("access_grant", data));

export const accessRevokeFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => ({ id: num(obj(i).id) }))
  .handler(({ data }) => call<Record<string, never>>("access_revoke", data));

const freeToggle = (i: unknown) => ({ id: num(obj(i).id), isFree: obj(i).isFree === true });

export const lessonSetFreeFn = createServerFn({ method: "POST" })
  .validator(freeToggle)
  .handler(({ data }) => call<{ modules: ModuleFull[] }>("lesson_set_free", data));

export const moduleSetFreeFn = createServerFn({ method: "POST" })
  .validator(freeToggle)
  .handler(({ data }) => call<{ modules: ModuleFull[] }>("module_set_free", data));
