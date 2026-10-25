import { createServerFn } from "@tanstack/react-start";

export type PeriodStats = {
  newUsers: number;
  startedCourses: number;
  completedCourses: number;
  lessonsCompleted: number;
  activeLearners: number;
  payments: number;
  revenue: number;
  accessGranted: number;
};

export type Totals = {
  users: number;
  verifiedUsers: number;
  admins: number;
  courses: number;
  publishedCourses: number;
  paidCourses: number;
  lessons: number;
  authors: number;
  learners: number;
  startedCourses: number;
  completedCourses: number;
  payments: number;
  revenue: number;
  accessGrants: number;
  marketingConsents: number;
};

export type SeriesPoint = { date: string } & Omit<PeriodStats, "activeLearners" | "accessGranted">;
export type CourseStat = {
  id: number;
  title: string;
  access: "free" | "paid";
  learners: number;
  started: number;
  completed: number;
  avgPercent: number;
  payments: number;
  revenue: number;
};

export type Overview = { totals: Totals; week: PeriodStats; month: PeriodStats };
export type Report = {
  from: string;
  to: string;
  unit: "day" | "week" | "month";
  current: PeriodStats;
  previous: PeriodStats;
  series: SeriesPoint[];
  courses: CourseStat[];
  totals: Totals;
};

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T | null> {
  const { callAnalytics } = await import("./analytics.server");
  return callAnalytics<T>(action, payload);
}

export const overviewFn = createServerFn({ method: "GET" }).handler(() => call<Overview>("overview"));

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const reportFn = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return {
      from: typeof o.from === "string" && DAY.test(o.from) ? o.from : "",
      to: typeof o.to === "string" && DAY.test(o.to) ? o.to : "",
    };
  })
  .handler(({ data }) => call<Report>("report", data));

export const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;
