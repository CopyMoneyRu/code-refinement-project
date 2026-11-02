import Icon from "@/components/ui/icon";
import { EmptyState, WsCard } from "@/components/workspace/WorkspaceLayout";
import { STATUS_META, type HistoryItem, type StrategyStatus } from "@/lib/strategies";

const FIELD: Record<string, string> = {
  title: "название", short: "описание", category_id: "категория", kind: "тип", cover_url: "изображение",
  risk_level: "риск", risk_style: "вид риска", yield_mode: "доходность", yield_basis: "тип доходности",
  yield_from: "доходность", yield_to: "доходность", yield_period: "период", price_label: "стоимость",
  exchanges: "биржи", access_note: "условия доступа", sort: "порядок",
};

export function describe(h: HistoryItem): { icon: string; text: string } {
  const d = h.details as Record<string, unknown>;
  switch (h.action) {
    case "strategy.create":
      return { icon: "Plus", text: "Стратегия создана" };
    case "strategy.update": {
      const f = [...new Set(((d.fields as string[]) ?? []).map((x) => FIELD[x]).filter(Boolean))];
      return { icon: "Pencil", text: f.length ? `Изменены настройки: ${f.join(", ")}` : "Сохранены настройки" };
    }
    case "strategy.publish_content":
      return { icon: "Send", text: `Опубликовано содержимое страницы (${d.blocks} бл.)` };
    case "strategy.status":
      return {
        icon: "ArrowRightLeft",
        text: `Статус: ${STATUS_META[d.from as StrategyStatus]?.label ?? d.from} → ${STATUS_META[d.to as StrategyStatus]?.label ?? d.to}`,
      };
    case "strategy.remove":
      return { icon: "Trash2", text: "Стратегия удалена" };
    case "strategy.restore":
      return { icon: "RotateCcw", text: "Стратегия восстановлена" };
    case "tariff.create":
      return { icon: "Wallet", text: `Добавлен тариф «${d.name}» — ${d.price} ₽` };
    case "tariff.update":
      return { icon: "Wallet", text: `Изменён тариф «${d.name}»${d.oldPrice !== d.price ? `: ${d.oldPrice} → ${d.price} ₽` : ""}` };
    case "tariff.archive":
      return { icon: "Wallet", text: `Убран тариф «${d.name}»` };
    case "access.grant":
      return { icon: "Gift", text: `Выдан доступ ${d.email} на ${d.days} дн.` };
    case "access.revoke":
      return { icon: "KeyRound", text: `Отозван доступ: ${d.reason}` };
    case "access.trial":
      return { icon: "Sparkles", text: `Клиент начал пробный период (${d.days} дн.)` };
    default:
      return { icon: "Dot", text: h.action };
  }
}

export default function StrategyHistory({ items }: { items: HistoryItem[] }) {
  if (!items.length) return <WsCard><EmptyState icon="History" title="История пуста" text="Здесь появятся все изменения стратегии." /></WsCard>;
  return (
    <WsCard className="p-0">
      <ul className="divide-y divide-brand-ink/[0.06]">
        {items.map((h, i) => {
          const x = describe(h);
          return (
            <li key={i} className="flex items-start gap-3 px-5 py-3.5 text-sm">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand-blue">
                <Icon name={x.icon} size={14} fallback="Dot" />
              </span>
              <div className="min-w-0 flex-1">
                <div>{x.text}</div>
                <div className="text-xs text-brand-muted">
                  {h.actor ?? "Система"} · {new Date(h.at).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </WsCard>
  );
}
