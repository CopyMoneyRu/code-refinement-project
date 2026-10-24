import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import AuthLayout, { AuthField, FormAlert, SubmitButton } from "@/components/auth/AuthLayout";
import CodeInput from "@/components/auth/CodeInput";
import { forgotFn, resetPasswordFn } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Восстановление пароля — JETRA" }, { name: "description", content: "Восстановление доступа к аккаунту JETRA." }] }),
  component: ForgotPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;

function ForgotPage() {
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const ok = EMAIL_RE.test(email.trim());
    setEmailError(ok ? undefined : "Введите корректный email");
    setFormError("");
    if (!ok) return;
    setLoading(true);
    const r = await forgotFn({ data: { email: email.trim() } });
    setLoading(false);
    if (!r.ok) return setFormError(r.message);
    setCode("");
    setWait(RESEND_SECONDS);
    setNotice(step === "code" ? "Новый код отправлен. Предыдущий код больше не действует." : "");
    setStep("code");
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (password.length < 8) next.password = "Минимум 8 символов";
    else if (!/[A-Za-zА-Яа-я]/.test(password) || !/\d/.test(password)) next.password = "Пароль должен содержать буквы и цифры";
    if (confirm !== password) next.confirm = "Пароли не совпадают";
    setErrors(next);
    setNotice("");
    if (code.length !== 6) return setFormError("Введите 6 цифр из письма");
    setFormError("");
    if (Object.keys(next).length) return;
    setLoading(true);
    const r = await resetPasswordFn({ data: { email: email.trim(), code, password } });
    setLoading(false);
    if (!r.ok) {
      setFormError(r.message);
      if (r.error === "too_many_attempts" || r.error === "code_expired") setCode("");
      return;
    }
    setStep("done");
  };

  if (step === "done") {
    return (
      <AuthLayout title="Пароль изменён" subtitle="Теперь войдите с новым паролем">
        <FormAlert tone="success">Пароль успешно обновлён. На всех устройствах выполнен выход.</FormAlert>
        <Link to="/login" className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-brand-blue font-medium text-white">
          Войти
        </Link>
      </AuthLayout>
    );
  }

  if (step === "code") {
    return (
      <AuthLayout title="Новый пароль" subtitle="Введите код из письма и придумайте новый пароль">
        <form onSubmit={reset} className="space-y-5" noValidate>
          <p className="text-sm leading-relaxed text-brand-muted">
            Если аккаунт <span className="font-medium text-brand-ink">{email.trim()}</span> существует, мы отправили на него 6-значный код. Код действует 15 минут.
          </p>
          <CodeInput value={code} onChange={setCode} disabled={loading} />
          <AuthField label="Новый пароль" type="password" autoComplete="new-password" placeholder="Не менее 8 символов, буквы и цифры" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
          <AuthField label="Повторите пароль" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
          {formError && <FormAlert tone="error">{formError}</FormAlert>}
          {notice && <FormAlert tone="success">{notice}</FormAlert>}
          <SubmitButton loading={loading}>Сохранить пароль</SubmitButton>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => { setStep("email"); setFormError(""); }} className="text-brand-muted hover:text-brand-ink">
              Изменить email
            </button>
            {wait > 0 ? (
              <span className="text-brand-muted">Отправить снова через {wait} с</span>
            ) : (
              <button type="button" onClick={() => requestCode()} disabled={loading} className="font-medium text-brand-blue hover:underline disabled:opacity-60">
                Отправить код ещё раз
              </button>
            )}
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Восстановление пароля" subtitle="Укажите email — мы отправим код для смены пароля">
      <form onSubmit={requestCode} className="space-y-5" noValidate>
        <AuthField label="Email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} />
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        <SubmitButton loading={loading}>Получить код</SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-brand-muted">
        <Link to="/login" className="font-medium text-brand-blue hover:underline">Вернуться ко входу</Link>
      </p>
    </AuthLayout>
  );
}
