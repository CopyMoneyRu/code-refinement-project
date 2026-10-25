import { createFileRoute } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";

export const Route = createFileRoute("/cabinet/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  return (
    <>
      <WsTitle title="Прогресс обучения" text="Пройденные уроки и модули по каждому обучению." />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Общий прогресс", "Target"],
          ["Время обучения", "Clock"],
          ["Завершено обучений", "Award"],
        ].map(([label, icon]) => (
          <WsCard key={label}>
            <div className="flex items-center gap-2 text-sm text-brand-muted">
              <Icon name={icon} size={16} className="text-brand-blue" />
              {label}
            </div>
            <div className="mt-4 h-2 rounded-full bg-brand-surface" />
            <div className="mt-3 text-sm text-brand-muted">Нет данных</div>
          </WsCard>
        ))}
      </div>
      <WsCard className="mt-6">
        <EmptyState
          icon="BarChart3"
          title="Прогресс появится после первого урока"
          text="Отметки о прохождении уроков сохраняются на сервере и доступны с любого устройства."
        />
      </WsCard>
    </>
  );
}
