import { useState } from "react";
import { Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { rub, type Overview } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import StatTile from "./StatTile";

export default function OverviewBlock({ data }: { data: Overview }) {
  const [range, setRange] = useState<"week" | "month">("week");
  const p = data[range];
  const t = data.totals;
  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Статистика</h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-brand-surface p-1">
            {(["week", "month"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn("rounded-md px-3 py-1.5 text-sm", range === r ? "bg-white font-medium text-brand-ink shadow-sm" : "text-brand-muted")}
              >
                {r === "week" ? "Неделя" : "Месяц"}
              </button>
            ))}
          </div>
          <Link to="/admin/analytics" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:underline">
            Вся аналитика <Icon name="ArrowRight" size={15} />
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Новые пользователи" value={p.newUsers} icon="UserPlus" hint={`всего ${t.users}`} />
        <StatTile label="Начато обучений" value={p.startedCourses} icon="PlayCircle" hint={`всего ${t.startedCourses}`} />
        <StatTile label="Завершено обучений" value={p.completedCourses} icon="Award" hint={`всего ${t.completedCourses}`} />
        <StatTile label="Пройдено уроков" value={p.lessonsCompleted} icon="CheckCircle2" hint={`активных учеников: ${p.activeLearners}`} />
        <StatTile label="Оплаты" value={p.payments} icon="CreditCard" hint={`всего ${t.payments}`} />
        <StatTile label="Выручка" value={rub(p.revenue)} icon="Wallet" hint={`всего ${rub(t.revenue)}`} />
        <StatTile label="Выдано доступов" value={p.accessGranted} icon="KeyRound" hint={`всего ${t.accessGrants}`} />
        <StatTile label="Обучений на сайте" value={t.publishedCourses} icon="GraduationCap" hint={`уроков: ${t.lessons}`} />
      </div>
    </section>
  );
}
