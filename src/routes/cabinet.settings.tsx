import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { Switch } from "@/components/ui/switch";
import { StageNotice } from "@/components/auth/AuthLayout";

export const Route = createFileRoute("/cabinet/settings")({
  component: SettingsPage,
});

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...props}
        className="mt-2 h-11 w-full rounded-lg border border-brand-ink/15 bg-white px-3.5 text-[15px] placeholder:text-brand-muted/60 focus:border-brand-blue focus:outline-none"
      />
    </label>
  );
}

function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [notify, setNotify] = useState(true);
  return (
    <>
      <WsTitle title="Профиль и настройки" text="Личные данные, пароль и уведомления." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
        className="grid gap-6 lg:grid-cols-2"
      >
        <WsCard>
          <div className="font-semibold">Профиль</div>
          <div className="mt-5 space-y-4">
            <Field label="Имя" placeholder="Ваше имя" />
            <Field label="Email" type="email" placeholder="name@example.com" />
          </div>
        </WsCard>
        <WsCard>
          <div className="font-semibold">Смена пароля</div>
          <div className="mt-5 space-y-4">
            <Field label="Текущий пароль" type="password" autoComplete="current-password" />
            <Field label="Новый пароль" type="password" autoComplete="new-password" />
          </div>
        </WsCard>
        <WsCard className="lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">Уведомления по email</div>
              <p className="mt-1 text-sm text-brand-muted">Новые уроки, курсы и статусы оплат</p>
            </div>
            <Switch checked={notify} onCheckedChange={setNotify} />
          </div>
        </WsCard>
        <div className="space-y-4 lg:col-span-2">
          <button type="submit" className="rounded-lg bg-brand-blue px-6 py-3 text-sm font-medium text-white hover:bg-[#3271B0]">
            Сохранить изменения
          </button>
          {saved && <StageNotice>Сохранение профиля станет доступно после подключения серверной авторизации.</StageNotice>}
        </div>
      </form>
    </>
  );
}
