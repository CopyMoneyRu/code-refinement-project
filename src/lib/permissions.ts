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

export type SectionPerm = Permission | "any";

export type StaffGrant = { permission: string; strategyId: number | null };

type PermUser = { role: Role; permissions: Permission[]; grants?: StaffGrant[] };

const hasStrategyGrant = (u: PermUser) => (u.grants ?? []).some((g) => g.permission.startsWith("strategies.") || g.permission.startsWith("trades."));

export const can = (u: PermUser, p: SectionPerm) =>
  u.role === "superadmin" ||
  (u.role === "admin" && (p === "any" || u.permissions.includes(p) || (p === "strategies" && hasStrategyGrant(u))));

export const hasGrant = (u: PermUser, perm: string, strategyId?: number) =>
  u.role === "superadmin" ||
  (u.role === "admin" && (u.grants ?? []).some((g) => g.permission === perm && (g.strategyId === null || g.strategyId === strategyId)));

export const STAFF_PERMISSION_GROUPS: { title: string; items: string[] }[] = [
  { title: "Стратегии", items: ["strategies.create", "strategies.edit", "strategies.publish", "strategies.tariffs", "strategies.access"] },
  { title: "Торговля", items: ["trades.create", "trades.edit", "trades.close", "risk.override"] },
  { title: "Платформа", items: ["analytics.view", "finance.manage", "users.manage", "staff.manage", "settings.global"] },
  { title: "Только супер администратор", items: ["emergency.close", "trading.live"] },
];
