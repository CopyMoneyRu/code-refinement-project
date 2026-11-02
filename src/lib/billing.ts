import { createServerFn } from "@tanstack/react-start";

export type TariffKind = "free" | "one_time" | "subscription";
export type PeriodUnit = "day" | "month";

export type Tariff = {
  id: number;
  name: string;
  description: string;
  kind: TariffKind;
  price: number;
  periodValue: number;
  periodUnit: PeriodUnit;
  periodLabel: string;
  trialDays: number;
  autoRenew: boolean;
  isActive: boolean;
  position: number;
};

export type AccessState = {
  active: boolean;
  source: "payment" | "trial" | "free" | "grant" | "upgrade" | null;
  tariffId: number | null;
  tariffName: string | null;
  currentEndsAt: string | null;
  endsAt: string | null;
  lastEndedAt: string | null;
  queued: { startsAt: string; endsAt: string; tariffName: string | null }[];
  trialUsed: boolean;
  everHad: boolean;
  autoRenew: boolean;
  autoRenewAvailable: boolean;
};

export type OfferTariff = Tariff & { trialAvailable: boolean; upgrade?: { credit: number; toPay: number } | null };
export type Offer = {
  strategyId: number;
  status: string;
  tariffs: OfferTariff[];
  access: AccessState;
  payments: { mode: "test" | "robokassa" | "off"; test: boolean; recurring: boolean };
};

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled" | "expired" | "refunded" | "partially_refunded";
export type Order = {
  id: number;
  productType: "strategy" | "course";
  title: string;
  purpose: "new" | "renewal" | "upgrade" | "free" | "auto_renewal";
  amount: number;
  credit: number;
  refundedAmount: number;
  currency: string;
  status: OrderStatus;
  provider: "test" | "robokassa" | "free" | "internal";
  isTest: boolean;
  autoRenew: boolean;
  createdAt: string;
  paidAt: string | null;
  failureReason: string | null;
  strategyId: number | null;
  strategySlug: string | null;
  tariffId: number | null;
  courseId: number | null;
  user?: { id: number; name: string; email: string };
  strategyTitle?: string | null;
  access?: { startsAt: string; endsAt: string } | null;
};

export const ORDER_STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  pending: { label: "Ожидает оплаты", cls: "bg-amber-50 text-amber-700" },
  paid: { label: "Оплачен", cls: "bg-emerald-50 text-emerald-700" },
  failed: { label: "Ошибка оплаты", cls: "bg-red-50 text-red-700" },
  cancelled: { label: "Отменён", cls: "bg-slate-100 text-slate-600" },
  expired: { label: "Истёк", cls: "bg-slate-100 text-slate-600" },
  refunded: { label: "Возврат", cls: "bg-violet-50 text-violet-700" },
  partially_refunded: { label: "Частичный возврат", cls: "bg-violet-50 text-violet-700" },
};

export const PURPOSE_LABEL: Record<Order["purpose"], string> = {
  new: "Подключение",
  renewal: "Продление",
  upgrade: "Переход на тариф",
  free: "Бесплатный тариф",
  auto_renewal: "Автопродление",
};

export const SOURCE_LABEL: Record<string, string> = {
  payment: "Оплата",
  upgrade: "Переход с доплатой",
  trial: "Пробный период",
  free: "Бесплатный тариф",
  grant: "Выдан администратором",
};

export const rub = (v: number) => `${Number(v).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`;
export const fmtDate = (d: string | null | undefined, time = false) =>
  d ? new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }) : "—";

type Fail = { ok: false; error: string; message: string };
const obj = (i: unknown) => (i && typeof i === "object" ? (i as Record<string, unknown>) : {});
const num = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
const str = (v: unknown, n = 200) => String(v ?? "").slice(0, n);

async function call<T>(action: string, data: object = {}): Promise<({ ok: true } & T) | Fail> {
  const { callStrategies } = await import("./strategies.server");
  const r = await callStrategies<T>(action, data as Record<string, unknown>);
  return r.ok ? r : { ok: false, error: r.error, message: r.message };
}

export const offerFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => ({ slug: str(obj(i).slug, 120) }))
  .handler(({ data }) => call<Offer>("offer", data));

export const checkoutFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => {
    const o = obj(i);
    const intent = o.intent === "trial" || o.intent === "upgrade" ? o.intent : "buy";
    return { strategyId: num(o.strategyId), tariffId: num(o.tariffId), intent, autoRenew: !!o.autoRenew, acceptTerms: !!o.acceptTerms };
  })
  .handler(({ data }) => call<{ result: "granted" | "pay"; orderId?: number; redirect?: string; endsAt?: string }>("checkout", data));

export const orderFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => ({ id: num(obj(i).id) }))
  .handler(({ data }) => call<{ order: Order & { snapshot: Record<string, string | number> } }>("order", data));

export const cancelOrderFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => ({ id: num(obj(i).id) }))
  .handler(({ data }) => call<object>("cancel_order", data));

export const testPayFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => ({ id: num(obj(i).id), outcome: obj(i).outcome === "fail" ? "fail" : "success", externalId: str(obj(i).externalId, 100) }))
  .handler(({ data }) => call<{ status: "paid" | "failed"; duplicate?: boolean }>("test_pay", data));

export const myOrdersFn = createServerFn({ method: "GET" }).handler(() => call<{ orders: Order[] }>("my_orders"));

export type MyStrategy = {
  id: number;
  slug: string;
  title: string;
  coverUrl: string;
  status: string;
  kind: string;
  access: AccessState;
  periods: { source: string; startsAt: string; endsAt: string; revoked: boolean; tariff: string | null }[];
};
export const myStrategiesFn = createServerFn({ method: "GET" }).handler(() => call<{ strategies: MyStrategy[] }>("my_strategies"));

export const setAutoRenewFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => ({ strategyId: num(obj(i).strategyId), enabled: !!obj(i).enabled }))
  .handler(({ data }) => call<{ autoRenew: boolean }>("set_auto_renew", data));

export type Notification = { id: number; level: "info" | "success" | "warning" | "critical"; kind: string; title: string; body: string; link: string; read_at: string | null; created_at: string };
export const notificationsFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => ({ markRead: !!obj(i).markRead }))
  .handler(({ data }) => call<{ items: Notification[]; unread: number }>("notifications", data));

export const adminTariffsFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => ({ strategyId: num(obj(i).strategyId) }))
  .handler(({ data }) => call<{ tariffs: Tariff[]; canEdit: boolean }>("admin_tariffs", data));

export type TariffInput = {
  id?: number;
  strategyId: number;
  name: string;
  description: string;
  kind: TariffKind;
  price: string;
  periodValue: number;
  periodUnit: PeriodUnit;
  trialDays: number;
  autoRenew: boolean;
  isActive: boolean;
  position: number;
};
export const tariffSaveFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => obj(i) as unknown as TariffInput)
  .handler(({ data }) => call<{ tariffs: Tariff[]; canEdit: boolean }>("tariff_save", data));

export const tariffArchiveFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => ({ strategyId: num(obj(i).strategyId), id: num(obj(i).id) }))
  .handler(({ data }) => call<{ tariffs: Tariff[]; canEdit: boolean }>("tariff_archive", data));

export type AccessRow = {
  id: number;
  user: { id: number; name: string; email: string };
  source: string;
  tariff: string | null;
  startsAt: string;
  endsAt: string;
  note: string;
  revokedAt: string | null;
  revokeReason: string | null;
  grantedBy: string | null;
  orderId: number | null;
};
export const adminAccessFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => ({ strategyId: num(obj(i).strategyId) }))
  .handler(({ data }) => call<{ items: AccessRow[] }>("admin_access", data));

export const accessGrantFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => {
    const o = obj(i);
    return { strategyId: num(o.strategyId), email: str(o.email, 255), days: num(o.days), note: str(o.note, 300), afterCurrent: !!o.afterCurrent };
  })
  .handler(({ data }) => call<{ userName: string; endsAt: string }>("access_grant", data));

export const accessRevokeFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => ({ id: num(obj(i).id), reason: str(obj(i).reason, 300) }))
  .handler(({ data }) => call<object>("access_revoke", data));

export type FinanceSummary = { count: number; gross: number; refunded: number; net: number };
export type FinanceData = {
  orders: Order[];
  summary: { strategy: FinanceSummary; course: FinanceSummary };
  subscriptions: { paid: number; trial: number; granted: number; free: number; autoRenew: number; expiringWeek: number };
  refunds: { id: number; orderId: number; title: string; email: string; amount: number; reason: string; accessAction: string; createdAt: string; by: string | null }[];
};
export type FinanceFilter = { status?: string; product?: string; includeTest?: boolean; q?: string; from?: string; to?: string };
export const financeFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => {
    const o = obj(i);
    return { status: str(o.status, 30), product: str(o.product, 20), includeTest: !!o.includeTest, q: str(o.q, 120), from: str(o.from, 10), to: str(o.to, 10) };
  })
  .handler(({ data }) => call<FinanceData>("finance", data));

export type FinanceOrder = {
  order: Order & { snapshot: Record<string, string | number> };
  payments: { id: number; provider: string; external_id: string; amount: number; status: string; is_test: boolean; note: string | null; created_at: string }[];
  refunds: { id: number; amount: number; reason: string; access_action: string; created_at: string }[];
  access: { starts_at: string; ends_at: string; revoked_at: string | null; revoke_reason: string | null } | null;
};
export const financeOrderFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => ({ id: num(obj(i).id) }))
  .handler(({ data }) => call<FinanceOrder>("finance_order", data));

export const refundFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => {
    const o = obj(i);
    return { orderId: num(o.orderId), amount: str(o.amount, 20), reason: str(o.reason, 500), revokeAccess: !!o.revokeAccess, confirm: str(o.confirm, 40) };
  })
  .handler(({ data }) => call<{ status: OrderStatus }>("refund", data));

export type RobokassaCfg = { login: string; hashAlg: string; fiscal: boolean; sno: string; tax: string; recurring: boolean };
export type PaymentSettings = {
  settings: { mode: "test" | "robokassa" | "off"; robokassaTest?: boolean; robokassa: RobokassaCfg };
  robokassa: { missingLive: string[]; missingTest: string[]; resultUrl: string; successUrl: string; failUrl: string };
  canEnableLive: boolean;
};
export const paymentSettingsFn = createServerFn({ method: "GET" }).handler(() => call<PaymentSettings>("payment_settings"));

export const savePaymentSettingsFn = createServerFn({ method: "POST" })
  .validator((i: unknown) => {
    const o = obj(i);
    const rk = obj(o.robokassa);
    return {
      mode: str(o.mode, 20),
      robokassaTest: o.robokassaTest !== false,
      confirm: str(o.confirm, 40),
      robokassa: {
        login: str(rk.login, 60),
        hashAlg: str(rk.hashAlg, 10),
        fiscal: !!rk.fiscal,
        sno: str(rk.sno, 30),
        tax: str(rk.tax, 10),
        recurring: !!rk.recurring,
      },
    };
  })
  .handler(({ data }) => call<PaymentSettings>("save_payment_settings", data));

export const runRenewalsFn = createServerFn({ method: "POST" }).handler(() =>
  call<{ stats: { reminders: number; charges: number; expired: number; skipped: number } }>("run_renewals"),
);
