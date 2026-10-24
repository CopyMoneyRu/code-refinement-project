import { useState } from "react";
import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import { WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { FormAlert } from "@/components/auth/AuthLayout";
import { changePasswordFn, updateProfileFn } from "@/lib/auth";

export const Route = createFileRoute("/cabinet/settings")({
  component: SettingsPage,
});

const cabinetApi = getRouteApi("/cabinet");

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...props}
        className="mt-2 h-11 w-full rounded-lg border border-brand-ink/15 bg-white px-3.5 text-[15px] placeholder:text-brand-muted/60 focus:border-brand-blue focus:outline-none disabled:bg-brand-light disabled:text-brand-muted"
      />
    </label>
  );
}

type Msg = { tone: "error" | "success"; text: string } | null;

const btn = "rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3271B0] disabled:opacity-60";

function SettingsPage() {
  const { user } = cabinetApi.useRouteContext();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<"profile" | "password" | null>(null);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setProfileMsg({ tone: "error", text: "Укажите имя" });
    setBusy("profile");
    const r = await updateProfileFn({ data: { name: name.trim() } });
    setBusy(null);
    if (!r.ok) return setProfileMsg({ tone: "error", text: r.message });
    setProfileMsg({ tone: "success", text: "Профиль сохранён" });
    router.invalidate();
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 8 || !/[A-Za-zА-Яа-я]/.test(pw.next) || !/\d/.test(pw.next))
      return setPwMsg({ tone: "error", text: "Новый пароль: не менее 8 символов, буквы и цифры" });
    if (pw.next !== pw.confirm) return setPwMsg({ tone: "error", text: "Пароли не совпадают" });
    setBusy("password");
    const r = await changePasswordFn({ data: { current: pw.current, password: pw.next } });
    setBusy(null);
    if (!r.ok) return setPwMsg({ tone: "error", text: r.message });
    setPw({ current: "", next: "", confirm: "" });
    setPwMsg({ tone: "success", text: "Пароль изменён. На других устройствах выполнен выход." });
  };

  return (
    <>
      <WsTitle title="Профиль и настройки" text="Личные данные и пароль." />
      <div className="grid gap-6 lg:grid-cols-2">
        <WsCard>
          <form onSubmit={saveProfile} noValidate>
            <div className="font-semibold">Профиль</div>
            <div className="mt-5 space-y-4">
              <Field label="Имя" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              <Field label="Email" type="email" value={user.email} disabled />
            </div>
            {profileMsg && <div className="mt-4"><FormAlert tone={profileMsg.tone}>{profileMsg.text}</FormAlert></div>}
            <button type="submit" disabled={busy === "profile"} className={`mt-5 ${btn}`}>Сохранить</button>
          </form>
        </WsCard>
        <WsCard>
          <form onSubmit={savePassword} noValidate>
            <div className="font-semibold">{user.hasPassword ? "Смена пароля" : "Пароль для входа по email"}</div>
            <div className="mt-5 space-y-4">
              {user.hasPassword ? (
                <Field label="Текущий пароль" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              ) : (
                <p className="text-sm text-brand-muted">Вы вошли через Google. Задайте пароль, чтобы входить и по email.</p>
              )}
              <Field label="Новый пароль" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              <Field label="Повторите новый пароль" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </div>
            {pwMsg && <div className="mt-4"><FormAlert tone={pwMsg.tone}>{pwMsg.text}</FormAlert></div>}
            <button type="submit" disabled={busy === "password"} className={`mt-5 ${btn}`}>Изменить пароль</button>
          </form>
        </WsCard>
      </div>
    </>
  );
}
