export const COMPANY = {
  name: "Индивидуальный предприниматель Степаненко Вениамин Евгеньевич",
  short: "ИП Степаненко Вениамин Евгеньевич",
  inn: "540141631953",
  ogrnip: "319547600083076",
  email: "info.jetra@gmail.com",
  site: "https://jetra.ru",
  support: "https://t.me/copymoney_support",
};

export const SOCIALS = [
  { key: "vk", label: "ВКонтакте", url: "https://vk.ru/jetra_capital" },
  { key: "youtube", label: "YouTube", url: "https://youtube.com/@jetra-capital?si=FDSXwaYbWY617Na2" },
  { key: "telegram", label: "Telegram", url: "https://t.me/jetra_capital/" },
  { key: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@jetra.ru?_r=1&_t=ZS-98DkrmRWKeb" },
] as const;

export const LEGAL_DOCS = [
  { to: "/privacy", label: "Политика конфиденциальности" },
  { to: "/terms", label: "Пользовательское соглашение" },
  { to: "/personal-data-consent", label: "Согласие на обработку персональных данных" },
  { to: "/disclaimer", label: "Отказ от финансовых гарантий" },
] as const;

export const DOC_VERSION = "2026-10-25";
export const DOC_DATE = "25 октября 2026 г.";
