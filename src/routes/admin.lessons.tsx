import { requirePermission } from "@/lib/adminGuard";
import { createFileRoute } from "@tanstack/react-router";
import AdminTable from "@/components/workspace/AdminTable";

export const Route = createFileRoute("/admin/lessons")({
  beforeLoad: ({ context }) => requirePermission(context, "lessons"),
  component: LessonsAdmin,
});

function LessonsAdmin() {
  return (
    <AdminTable
      title="Уроки"
      text="Модули, уроки, видео и дополнительные файлы."
      columns={['Урок', 'Курс', 'Модуль', 'Видео', 'Файлы', 'Порядок']}
      addLabel="Новый урок"
      emptyIcon="PlayCircle"
      emptyTitle="Уроков пока нет"
      emptyText="Здесь можно будет загружать видео и материалы к урокам."
    />
  );
}
