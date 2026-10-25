import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "@/components/ui/icon";
import StatTile, { deltaOf } from "@/components/analytics/StatTile";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { requirePermission } from "@/lib/adminGuard";
import { reportFn, rub, type SeriesPoint } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Search = { from?: string; to?: string };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const Route = createFileRoute("/admin/analytics")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    from: typeof s.from === "string" && DAY.test(s.from) ? s.from : undefined,
    to: typeof s.to === "string" && DAY.test(s.to) ? s.to : undefined,
  }),
  beforeLoad: ({ context }) => requirePermission(context, "any"),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => reportFn({ data: { from: deps.from ?? "", to: deps.to ?? "" } }),
  component: AnalyticsPage,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);
const PRESETS = [
  { label: "7 дней", days: 7 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
  { label: "Год", days: 365 },
];

const METRICS: { key: keyof Omit<SeriesPoint, "date">; label: string; color: string; money?: boolean }[] = [
  { key: "newUsers", label: "Новые пользователи", color: "#397FC4" },
  { key: "startedCourses", label: "Начато обучений", color: "#0EA5E9" },
  { key: "completedCourses", label: "Завершено обучений", color: "#10B981" },
  { key: "lessonsCompleted", label: "Пройдено уроков", color: "#6366F1" },
  { key: "payments", label: "Оплаты", color: "#F59E0B" },
  { key: "revenue", label: "Выручка", color: "#17263C", money: true },
];

const fmtDay = (d: string, unit: string) =>
  new Date(d).toLocaleDateString("ru-RU", unit === "month" ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" });

function AnalyticsPage() {
  const report = Route.useLoaderData();
  const navigate = useNavigate({ from: "/admin/analytics" });
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("newUsers");
  const [range, setRange] = useState({ from: report?.from ?? "", to: report?.to ?? "" });

  if (!report) {
    return (
      <>
        <WsTitle title="Аналитика" />
        <WsCard>
          <EmptyState icon="BarChart3" title="Не удалось загрузить аналитику" text="Обновите страницу через минуту." />
        </WsCard>
      </>
    );
  }

  const apply = (from: string, to: string) => {
    setRange({ from, to });
    navigate({ search: { from, to } });
  };
  const preset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days + 1);
    apply(iso(from), iso(to));
  };
  const activeDays = Math.round((new Date(report.to).getTime() - new Date(report.from).getTime()) / 86400000) + 1;
  const c = report.current;
  const p = report.previous;
  const m = METRICS.find((x) => x.key === metric)!;
  const chartData = report.series.map((s) => ({ ...s, label: fmtDay(s.date, report.unit) }));
  const t = report.totals;

  return (
    <>
      <WsTitle title="Аналитика" text="Пользователи, обучение, оплаты и выручка за выбранный период. Рядом с цифрой — изменение к предыдущему такому же периоду." />

      <WsCard className="mb-6 flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((pr) => (
            <button
              key={pr.days}
              onClick={() => preset(pr.days)}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm transition-colors",
                activeDays === pr.days && report.to === iso(new Date()) ? "bg-brand-blue text-white" : "bg-brand-light text-brand-muted hover:text-brand-ink",
              )}
            >
              {pr.label}
            </button>
          ))}
        </div>
        <form
          className="flex flex-wrap items-center gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (range.from && range.to) apply(range.from, range.to);
          }}
        >
          <input type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} className="rounded-lg border border-brand-ink/15 bg-white px-3 py-2" />
          <span className="text-brand-muted">—</span>
          <input type="date" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} className="rounded-lg border border-brand-ink/15 bg-white px-3 py-2" />
          <button className="rounded-lg bg-brand-blue px-4 py-2 font-medium text-white hover:bg-[#3271B0]">Показать</button>
        </form>
      </WsCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Новые пользователи" value={c.newUsers} icon="UserPlus" delta={deltaOf(c.newUsers, p.newUsers)} />
        <StatTile label="Начато обучений" value={c.startedCourses} icon="PlayCircle" delta={deltaOf(c.startedCourses, p.startedCourses)} />
        <StatTile label="Завершено обучений" value={c.completedCourses} icon="Award" delta={deltaOf(c.completedCourses, p.completedCourses)} />
        <StatTile label="Пройдено уроков" value={c.lessonsCompleted} icon="CheckCircle2" delta={deltaOf(c.lessonsCompleted, p.lessonsCompleted)} />
        <StatTile label="Активные ученики" value={c.activeLearners} icon="Users" delta={deltaOf(c.activeLearners, p.activeLearners)} />
        <StatTile label="Оплаты" value={c.payments} icon="CreditCard" delta={deltaOf(c.payments, p.payments)} />
        <StatTile label="Выручка" value={rub(c.revenue)} icon="Wallet" delta={deltaOf(c.revenue, p.revenue)} />
        <StatTile
          label="Средний чек"
          value={rub(c.payments ? Math.round(c.revenue / c.payments) : 0)}
          icon="Receipt"
          hint={`выдано доступов: ${c.accessGranted}`}
        />
      </div>

      <WsCard className="mt-6">
        <div className="flex flex-wrap gap-2">
          {METRICS.map((x) => (
            <button
              key={x.key}
              onClick={() => setMetric(x.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                metric === x.key ? "border-brand-ink/20 bg-brand-light font-medium text-brand-ink" : "border-transparent text-brand-muted hover:text-brand-ink",
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: x.color }} />
              {x.label}
            </button>
          ))}
        </div>
        <div className="mt-6 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={m.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={m.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#17263C14" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5A6B82" }} tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5A6B82" }} tickLine={false} axisLine={false} width={m.money ? 70 : 36} />
              <Tooltip
                formatter={(v: number) => [m.money ? rub(v) : v, m.label]}
                labelStyle={{ color: "#17263C", fontWeight: 600 }}
                contentStyle={{ borderRadius: 10, border: "1px solid #17263C1A", fontSize: 13 }}
              />
              <Area type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2.5} fill="url(#fill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-xs text-brand-muted">
          Шаг графика: {report.unit === "day" ? "день" : report.unit === "week" ? "неделя" : "месяц"}
        </div>
      </WsCard>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <WsCard>
          <div className="font-semibold">Обучение: начато и завершено</div>
          <div className="mt-5 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#17263C14" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5A6B82" }} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5A6B82" }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #17263C1A", fontSize: 13 }} />
                <Bar dataKey="startedCourses" name="Начато" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completedCourses" name="Завершено" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WsCard>
        <WsCard>
          <div className="font-semibold">Платформа целиком</div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {[
              ["Пользователей", t.users],
              ["Подтвердили email", t.verifiedUsers],
              ["Учеников", t.learners],
              ["Согласны на рассылку", t.marketingConsents],
              ["Обучений на сайте", `${t.publishedCourses} из ${t.courses}`],
              ["Платных обучений", t.paidCourses],
              ["Уроков", t.lessons],
              ["Авторов", t.authors],
              ["Оплат всего", t.payments],
              ["Выручка всего", rub(t.revenue)],
              ["Выдано доступов", t.accessGrants],
              ["Администраторов", t.admins],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-brand-muted">{label}</dt>
                <dd className="mt-0.5 font-display text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </WsCard>
      </div>

      <WsCard className="mt-6 p-0">
        <div className="border-b border-brand-ink/[0.08] px-6 py-4 font-semibold">По обучениям за период</div>
        {report.courses.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-brand-muted">
                <tr>
                  <th className="px-6 py-3 font-medium">Обучение</th>
                  <th className="px-3 py-3 text-right font-medium">Начали</th>
                  <th className="px-3 py-3 text-right font-medium">Завершили</th>
                  <th className="px-3 py-3 text-right font-medium">Учеников всего</th>
                  <th className="px-3 py-3 text-right font-medium">Средний прогресс</th>
                  <th className="px-3 py-3 text-right font-medium">Оплаты</th>
                  <th className="px-6 py-3 text-right font-medium">Выручка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/[0.06]">
                {report.courses.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-3.5">
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-brand-muted">{r.access === "paid" ? "Платное" : "Бесплатное"}</div>
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{r.started}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{r.completed}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{r.learners}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{r.avgPercent}%</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{r.payments}</td>
                    <td className="px-6 py-3.5 text-right tabular-nums">{rub(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="GraduationCap" title="Обучений пока нет" text="Статистика появится, когда вы добавите обучения." />
        )}
      </WsCard>

      <p className="mt-4 flex items-start gap-2 text-xs text-brand-muted">
        <Icon name="Info" size={14} className="mt-px shrink-0" />
        Оплаты и выручка начнут считаться автоматически после подключения приёма платежей. Действия администраторов в статистику учеников не входят.
      </p>
    </>
  );
}
