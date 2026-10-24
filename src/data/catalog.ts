// Справочные данные для макетов первого этапа.
// На следующем этапе каталог будет загружаться с сервера из базы данных.

export type Strategy = {
  id: string;
  name: string;
  focus: string;
  horizon: string;
  icon: string;
  description: string;
};

export const STRATEGIES: Strategy[] = [
  { id: "s1", name: "Консервативная", focus: "Сохранение капитала", horizon: "Долгосрочно", icon: "Shield", description: "Акцент на устойчивость портфеля и контроль рисков." },
  { id: "s2", name: "Сбалансированная", focus: "Диверсификация", horizon: "Среднесрочно", icon: "Scale", description: "Распределение капитала между классами активов." },
  { id: "s3", name: "Динамичная", focus: "Рост капитала", horizon: "Среднесрочно", icon: "TrendingUp", description: "Активное управление с адаптацией к рынку." },
  { id: "s4", name: "Алгоритмическая", focus: "Системные правила", horizon: "Гибко", icon: "Cpu", description: "Решения на основе формализованных алгоритмов." },
  { id: "s5", name: "Квантовая аналитика", focus: "Модели данных", horizon: "Среднесрочно", icon: "BrainCircuit", description: "Количественные модели и анализ рыночных данных." },
  { id: "s6", name: "Дивидендная", focus: "Денежный поток", horizon: "Долгосрочно", icon: "Landmark", description: "Компании с устойчивой дивидендной политикой." },
  { id: "s7", name: "Глобальная", focus: "Мировые рынки", horizon: "Долгосрочно", icon: "Globe", description: "Географическая диверсификация портфеля." },
  { id: "s8", name: "Технологическая", focus: "Сектор технологий", horizon: "Долгосрочно", icon: "CircuitBoard", description: "Компании, формирующие технологическую повестку." },
  { id: "s9", name: "Защитная", focus: "Управление рисками", horizon: "Гибко", icon: "LockKeyhole", description: "Инструменты хеджирования и защиты капитала." },
];

export type Lesson = { id: string; title: string; duration: string; hasFiles?: boolean };
export type CourseModule = { id: string; title: string; lessons: Lesson[] };
export type Course = {
  slug: string;
  title: string;
  short: string;
  category: string;
  level: string;
  access: "free" | "paid";
  teacher: { name: string; role: string };
  modules: CourseModule[];
};

export const CATEGORIES = ["Все", "Основы", "Инструменты", "Аналитика", "Управление рисками"] as const;

const m = (prefix: string, titles: [string, string[]][]): CourseModule[] =>
  titles.map(([title, lessons], i) => ({
    id: `${prefix}-m${i + 1}`,
    title,
    lessons: lessons.map((l, j) => ({
      id: `${prefix}-m${i + 1}-l${j + 1}`,
      title: l,
      duration: `${12 + ((i + j) % 4) * 5} мин`,
      hasFiles: j === 0,
    })),
  }));

export const COURSES: Course[] = [
  {
    slug: "osnovy-investiciy",
    title: "Основы инвестиций",
    short: "Базовые понятия, классы активов и принципы формирования портфеля.",
    category: "Основы",
    level: "Начальный",
    access: "free",
    teacher: { name: "Преподаватель JETRA", role: "Эксперт по инвестициям" },
    modules: m("c1", [
      ["Введение", ["Как устроен финансовый рынок", "Классы активов", "Риск и доходность"]],
      ["Портфель", ["Диверсификация", "Горизонт инвестирования"]],
    ]),
  },
  {
    slug: "finansovye-instrumenty",
    title: "Финансовые инструменты",
    short: "Акции, облигации, фонды и производные инструменты на практике.",
    category: "Инструменты",
    level: "Средний",
    access: "paid",
    teacher: { name: "Преподаватель JETRA", role: "Портфельный аналитик" },
    modules: m("c2", [
      ["Долевые инструменты", ["Акции", "Фонды"]],
      ["Долговые инструменты", ["Облигации", "Кривая доходности"]],
      ["Производные", ["Фьючерсы и опционы"]],
    ]),
  },
  {
    slug: "analitika-rynka",
    title: "Аналитика рынка",
    short: "Фундаментальный и количественный анализ для принятия решений.",
    category: "Аналитика",
    level: "Средний",
    access: "paid",
    teacher: { name: "Преподаватель JETRA", role: "Аналитик данных" },
    modules: m("c3", [
      ["Фундаментальный анализ", ["Отчётность компаний", "Мультипликаторы"]],
      ["Количественный подход", ["Работа с данными", "Модели и проверка гипотез"]],
    ]),
  },
  {
    slug: "upravlenie-riskami",
    title: "Управление рисками",
    short: "Как оценивать, ограничивать и контролировать риски портфеля.",
    category: "Управление рисками",
    level: "Продвинутый",
    access: "paid",
    teacher: { name: "Преподаватель JETRA", role: "Риск-менеджер" },
    modules: m("c4", [
      ["Оценка риска", ["Виды рисков", "Метрики риска"]],
      ["Контроль", ["Лимиты и правила", "Хеджирование"]],
    ]),
  },
  {
    slug: "tehnologii-v-investiciyah",
    title: "Технологии в инвестициях",
    short: "Алгоритмы, автоматизация и данные в управлении капиталом.",
    category: "Аналитика",
    level: "Средний",
    access: "free",
    teacher: { name: "Преподаватель JETRA", role: "Инженер-аналитик" },
    modules: m("c5", [["Обзор", ["Автоматизация решений", "Данные и инфраструктура"]]]),
  },
  {
    slug: "lichnyy-finansovyy-plan",
    title: "Личный финансовый план",
    short: "Цели, бюджет и структура капитала для долгосрочного плана.",
    category: "Основы",
    level: "Начальный",
    access: "free",
    teacher: { name: "Преподаватель JETRA", role: "Финансовый консультант" },
    modules: m("c6", [["План", ["Постановка целей", "Резерв и структура"]]]),
  },
];

export const lessonsCount = (c: Course) => c.modules.reduce((n, mod) => n + mod.lessons.length, 0);
