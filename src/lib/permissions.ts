export type Role = "user" | "admin" | "superadmin";

export type Permission = "users" | "strategies" | "courses" | "lessons" | "authors" | "purchases" | "access";

export const PERMISSIONS: { id: Permission; label: string; text: string }[] = [
  { id: "users", label: "Пользователи", text: "Просмотр и удаление пользователей" },
  { id: "strategies", label: "Стратегии", text: "Добавление и редактирование стратегий" },
  { id: "courses", label: "Обучения", text: "Обучения, категории и цены" },
  { id: "lessons", label: "Уроки", text: "Модули, видео и файлы" },
  { id: "authors", label: "Авторы", text: "Профили авторов и преподавателей" },
  { id: "purchases", label: "Покупки", text: "Платежи и их статусы" },
  { id: "access", label: "Доступы", text: "Выдача и отзыв доступа к обучениям" },
];

export const ROLE_LABEL: Record<Role, string> = {
  user: "Пользователь",
  admin: "Администратор",
  superadmin: "Супер администратор",
};

export const isStaff = (role: Role) => role === "admin" || role === "superadmin";

export const can = (u: { role: Role; permissions: Permission[] }, p: Permission) =>
  u.role === "superadmin" || (u.role === "admin" && u.permissions.includes(p));
