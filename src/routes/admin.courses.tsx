import { createFileRoute } from "@tanstack/react-router";
import AdminTable from "@/components/workspace/AdminTable";

export const Route = createFileRoute("/admin/courses")({
  component: CoursesAdmin,
});

function CoursesAdmin() {
  return (
    <AdminTable
      title="Курсы"
      text="Создание и редактирование курсов JETRA University."
      columns={['Название', 'Категория', 'Тип', 'Цена', 'Модулей', 'Статус']}
      addLabel="Новый курс"
      emptyIcon="GraduationCap"
      emptyTitle="Курсы будут храниться в базе данных"
      emptyText="Сейчас каталог показан в ознакомительном режиме. Управление курсами откроется после подключения сервера."
    />
  );
}
