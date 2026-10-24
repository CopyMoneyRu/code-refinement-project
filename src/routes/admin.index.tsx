import { createFileRoute, Link } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

const SECTIONS = [
  { to: "/admin/users", label: "Пользователи", icon: "Users", text: "Аккаунты, роли и подтверждение email" },
  { to: "/admin/courses", label: "Курсы", icon: "GraduationCap", text: "Категории, цены, бесплатные и платные курсы" },
  { to: "/admin/lessons", label: "Уроки", icon: "PlayCircle", text: "Модули, видео и дополнительные файлы" },
  { to: "/admin/teachers", label: "Преподаватели", icon: "UserRound", text: "Профили авторов курсов" },
  { to: "/admin/purchases", label: "Покупки", icon: "Receipt", text: "Платежи и их статусы" },
  { to: "/admin/access", label: "Доступы", icon: "KeyRound", text: "Выдача и отзыв доступа к курсам" },
];

function AdminHome() {
  return (
    <>
      <WsTitle title="Административная панель" text="Управление пользователями, обучением и доступами платформы." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} className="group">
            <WsCard className="h-full transition-colors group-hover:border-brand-blue/40">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-surface text-brand-blue">
                <Icon name={s.icon} size={20} />
              </div>
              <div className="mt-5 font-display text-lg font-semibold">{s.label}</div>
              <p className="mt-1.5 text-sm text-brand-muted">{s.text}</p>
            </WsCard>
          </Link>
        ))}
      </div>
    </>
  );
}
