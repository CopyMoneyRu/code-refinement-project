import type { SectionPerm } from "./permissions";

export type AdminSection = { to: string; label: string; icon: string; perm: SectionPerm; text: string };

export const ADMIN_SECTIONS: AdminSection[] = [
  { to: "/admin/analytics", label: "Аналитика", icon: "BarChart3", perm: "any", text: "Пользователи, обучения, оплаты и выручка за любой период" },
  { to: "/admin/users", label: "Пользователи", icon: "Users", perm: "users", text: "Аккаунты, роли и права администраторов" },
  { to: "/admin/strategies", label: "Стратегии", icon: "LineChart", perm: "strategies", text: "Каталог стратегий и разделы" },
  { to: "/admin/courses", label: "Обучения", icon: "GraduationCap", perm: "courses", text: "Категории, цены, бесплатные и платные обучения" },
  { to: "/admin/categories", label: "Категории", icon: "Tags", perm: "courses", text: "Категории обучений университета" },
  { to: "/admin/lessons", label: "Уроки", icon: "PlayCircle", perm: "lessons", text: "Модули, видео и дополнительные файлы" },
  { to: "/admin/teachers", label: "Авторы", icon: "UserRound", perm: "authors", text: "Профили авторов обучений" },
  { to: "/admin/purchases", label: "Покупки", icon: "Receipt", perm: "purchases", text: "Платежи и их статусы" },
  { to: "/admin/access", label: "Доступы", icon: "KeyRound", perm: "access", text: "Выдача и отзыв доступа к обучениям" },
  { to: "/admin/archive", label: "Архив", icon: "Archive", perm: "any", text: "Удалённые записи: восстановить или удалить навсегда" },
];
