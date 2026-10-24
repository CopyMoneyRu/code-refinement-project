import type { Permission } from "./permissions";

export type AdminSection = { to: string; label: string; icon: string; perm: Permission; text: string };

export const ADMIN_SECTIONS: AdminSection[] = [
  { to: "/admin/users", label: "Пользователи", icon: "Users", perm: "users", text: "Аккаунты, роли и права администраторов" },
  { to: "/admin/strategies", label: "Стратегии", icon: "LineChart", perm: "strategies", text: "Каталог стратегий и разделы" },
  { to: "/admin/courses", label: "Курсы", icon: "GraduationCap", perm: "courses", text: "Категории, цены, бесплатные и платные курсы" },
  { to: "/admin/lessons", label: "Уроки", icon: "PlayCircle", perm: "lessons", text: "Модули, видео и дополнительные файлы" },
  { to: "/admin/teachers", label: "Авторы", icon: "UserRound", perm: "authors", text: "Профили авторов курсов" },
  { to: "/admin/purchases", label: "Покупки", icon: "Receipt", perm: "purchases", text: "Платежи и их статусы" },
  { to: "/admin/access", label: "Доступы", icon: "KeyRound", perm: "access", text: "Выдача и отзыв доступа к курсам" },
];
