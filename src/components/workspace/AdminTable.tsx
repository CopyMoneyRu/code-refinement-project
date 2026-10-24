import Icon from "@/components/ui/icon";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";

export default function AdminTable({
  title,
  text,
  columns,
  addLabel,
  emptyIcon,
  emptyTitle,
  emptyText,
}: {
  title: string;
  text: string;
  columns: string[];
  addLabel?: string;
  emptyIcon: string;
  emptyTitle: string;
  emptyText: string;
}) {
  return (
    <>
      <WsTitle
        title={title}
        text={text}
        action={
          addLabel && (
            <button
              disabled
              title="Будет доступно после подключения сервера"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="Plus" size={16} /> {addLabel}
            </button>
          )
        }
      />
      <WsCard className="p-0">
        <div className="flex flex-col gap-3 border-b border-brand-ink/[0.08] p-4 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input placeholder="Поиск" className="h-10 w-full rounded-lg border border-brand-ink/15 pl-9 pr-3 text-sm focus:border-brand-blue focus:outline-none sm:max-w-xs" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-brand-ink/[0.08] bg-brand-light/60 text-brand-muted">
              <tr>
                {columns.map((c) => (
                  <th key={c} className="px-5 py-3.5 font-medium">{c}</th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <EmptyState icon={emptyIcon} title={emptyTitle} text={emptyText} />
      </WsCard>
    </>
  );
}
