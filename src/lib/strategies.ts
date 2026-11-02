import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";

export type StrategyStatus = "draft" | "active" | "paused" | "archived";
export type StrategyKind = "generic" | "copytrading";
export type RiskStyle = "stars" | "bars";
export type YieldMode = "none" | "fixed" | "range";
export type Exchange = "binance" | "bybit";

export type StrategyCategory = { id: number; slug: string; name: string; icon: string };
export type StrategyLabel = { id: number; name: string; color: string; used?: number };
export type CardMetric = { label: string; value: string };
export type CardOptions = { showRisk: boolean; showYield: boolean; showPrice: boolean; showExchanges: boolean };
export type CopySettings = {
  marginPercent: number;
  maxLeverage: number;
  maxRiskPercent: number;
  maxPositions: number;
  entryWaitMinutes: number;
  priceDeviationPercent: number;
};

export type Strategy = {
  id: number;
  slug: string;
  title: string;
  short: string;
  kind: StrategyKind;
  coverUrl: string;
  status: StrategyStatus;
  category: StrategyCategory | null;
  risk: { level: number; style: RiskStyle };
  yield: { mode: YieldMode; basis: "forecast" | "actual"; from: number | null; to: number | null; period: string };
  priceLabel: string;
  exchanges: Exchange[];
  metrics: CardMetric[];
  cardOptions: CardOptions;
  labels: StrategyLabel[];
  accessNote: string;
};

export type AdminStrategy = Strategy & {
  settings: Partial<CopySettings>;
  sort: number;
  updatedAt: string;
  createdAt: string;
  contentPublishedAt: string | null;
  removedAt: string | null;
};

export type BlockType = "heading" | "text" | "callout" | "image" | "video" | "pdf" | "list" | "table" | "stats" | "chart" | "faq" | "documents";
export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
export type JsonObj = { [k: string]: Json };
export type Block = { type: BlockType; data: JsonObj };
export type HistoryItem = { action: string; details: JsonObj; at: string; actor: string | null };

export const STATUS_META: Record<StrategyStatus, { label: string; cls: string; text: string }> = {
  draft: { label: "Черновик", cls: "bg-brand-surface text-brand-muted", text: "Скрыта с сайта" },
  active: { label: "Активна", cls: "bg-emerald-50 text-emerald-700", text: "Видна в каталоге, подключение открыто" },
  paused: { label: "Приостановлена", cls: "bg-amber-50 text-amber-700", text: "Видна в каталоге, новые подключения закрыты" },
  archived: { label: "Архив", cls: "bg-slate-100 text-slate-600", text: "Скрыта с сайта, история сохранена" },
};

export const LABEL_COLORS: Record<string, string> = {
  blue: "bg-brand-blue/10 text-brand-blue",
  navy: "bg-brand-ink text-white",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  violet: "bg-violet-50 text-violet-700",
  gray: "bg-slate-100 text-slate-600",
};

export const EXCHANGE_LABEL: Record<Exchange, string> = { binance: "Binance", bybit: "Bybit" };

export const COPY_DEFAULTS: CopySettings = {
  marginPercent: 3,
  maxLeverage: 10,
  maxRiskPercent: 2,
  maxPositions: 5,
  entryWaitMinutes: 5,
  priceDeviationPercent: 2,
};

const pct = (n: number) => `${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%`;

export const yieldText = (y: Strategy["yield"]) => {
  if (y.mode === "fixed" && y.from !== null) return pct(y.from);
  if (y.mode === "range" && y.from !== null && y.to !== null) return `${pct(y.from)} – ${pct(y.to)}`;
  return "";
};

type Fail = { ok: false; error: string; message: string };
const obj = (i: unknown) => (i && typeof i === "object" ? (i as Record<string, unknown>) : {});
const num = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

async function call<T>(action: string, data: object = {}): Promise<({ ok: true } & T) | Fail> {
  const { callStrategies } = await import("./strategies.server");
  const r = await callStrategies<T>(action, data as Record<string, unknown>);
  return r.ok ? r : { ok: false, error: r.error, message: r.message };
}

export const strategiesCatalogFn = createServerFn({ method: "GET" }).handler(async () => {
  const r = await call<{ strategies: Strategy[]; categories: StrategyCategory[] }>("catalog");
  return r.ok ? { strategies: r.strategies, categories: r.categories } : { strategies: [] as Strategy[], categories: [] as StrategyCategory[] };
});

export const strategyBySlugFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => ({ slug: String(obj(i).slug ?? "").slice(0, 120) }))
  .handler(async ({ data }) => {
    const r = await call<{ strategy: Strategy; blocks: Block[] }>("get", { slug: data.slug });
    if (!r.ok) throw notFound();
    return { strategy: r.strategy, blocks: r.blocks };
  });

export const adminStrategiesFn = createServerFn({ method: "GET" }).handler(async () => {
  const r = await call<{ strategies: AdminStrategy[]; removed: AdminStrategy[]; categories: StrategyCategory[]; labels: StrategyLabel[]; canCreate: boolean }>("admin_list");
  return r.ok
    ? r
    : { ok: false as const, strategies: [] as AdminStrategy[], removed: [] as AdminStrategy[], categories: [] as StrategyCategory[], labels: [] as StrategyLabel[], canCreate: false, message: r.message };
});

export type AdminStrategyDetail = {
  strategy: AdminStrategy;
  blocks: Block[];
  hasUnpublished: boolean;
  categories: StrategyCategory[];
  labels: StrategyLabel[];
  canPublish: boolean;
  history: HistoryItem[];
};

export const adminStrategyFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => ({ id: num(obj(i).id) }))
  .handler(({ data }) => call<AdminStrategyDetail>("admin_get", data));

export const previewStrategyFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => ({ id: num(obj(i).id) }))
  .handler(({ data }) => call<{ strategy: Strategy; blocks: Block[] }>("preview", data));

export type StrategyInput = {
  id?: number;
  title: string;
  short: string;
  kind: StrategyKind;
  categoryId: number | null;
  coverUrl: string;
  risk: { level: number; style: RiskStyle };
  yield: { mode: YieldMode; basis: "forecast" | "actual"; from: string; to: string; period: string };
  priceLabel: string;
  exchanges: Exchange[];
  metrics: CardMetric[];
  cardOptions: CardOptions;
  labelIds: number[];
  accessNote: string;
  settings: { [K in keyof CopySettings]?: string | number };
  sort: number;
};

export const saveStrategyFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => obj(i) as unknown as StrategyInput)
  .handler(({ data }) => call<{ strategy: AdminStrategy; created: boolean }>("save", data as unknown as JsonObj));

export const saveBlocksFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => {
    const o = obj(i);
    return { id: num(o.id), blocks: (Array.isArray(o.blocks) ? o.blocks.slice(0, 120) : []) as Block[] };
  })
  .handler(({ data }) => call<{ blocks: Block[]; hasUnpublished: boolean }>("save_blocks", data));

const idOnly = (i: unknown) => ({ id: num(obj(i).id) });

export const publishContentFn = createServerFn({ method: "POST" })
  .validator(idOnly)
  .handler(({ data }) => call<{ hasUnpublished: boolean }>("publish_content", data));

export const setStrategyStatusFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => ({ id: num(obj(i).id), status: String(obj(i).status ?? "") }))
  .handler(({ data }) => call<{ strategy: AdminStrategy }>("set_status", data));

export const removeStrategyFn = createServerFn({ method: "POST" })
  .validator(idOnly)
  .handler(({ data }) => call<{ title: string }>("remove", data));

export const restoreStrategyFn = createServerFn({ method: "POST" })
  .validator(idOnly)
  .handler(({ data }) => call<{ title: string }>("restore", data));

export const saveLabelFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => {
    const o = obj(i);
    return { id: num(o.id), name: String(o.name ?? "").slice(0, 40), color: String(o.color ?? "blue").slice(0, 12) };
  })
  .handler(({ data }) => call<{ labels: StrategyLabel[] }>("label_save", data));

export const archiveLabelFn = createServerFn({ method: "POST" })
  .validator(idOnly)
  .handler(({ data }) => call<{ labels: StrategyLabel[] }>("label_archive", data));

export const uploadStrategyImageFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => {
    const o = obj(i);
    return { contentType: String(o.contentType ?? "").slice(0, 40), data: String(o.data ?? "").slice(0, 7_200_000) };
  })
  .handler(({ data }) => call<{ url: string }>("upload_image", data));

export type StaffMember = { id: number; name: string; email: string; role: "admin" | "superadmin" };
export type GrantRow = { id: number; userId: number; permission: string; strategyId: number | null; createdAt: string; grantedBy: string | null };
export type PermissionDef = { id: string; label: string; perStrategy: boolean; superOnly: boolean };
export type StaffData = {
  staff: StaffMember[];
  grants: GrantRow[];
  strategies: { id: number; title: string }[];
  permissions: PermissionDef[];
  log: HistoryItem[];
};

export const staffListFn = createServerFn({ method: "GET" }).handler(() => call<StaffData>("staff_list"));

export const staffGrantFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => {
    const o = obj(i);
    return { userId: num(o.userId), permission: String(o.permission ?? "").slice(0, 40), strategyId: num(o.strategyId) || null };
  })
  .handler(({ data }) => call<StaffData>("staff_grant", data));

export const staffRevokeFn = createServerFn({ method: "POST" })
  .validator(idOnly)
  .handler(({ data }) => call<StaffData>("staff_revoke", data));
