import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import AuthLayout, { AuthField, FormAlert, SubmitButton } from "@/components/auth/AuthLayout";
import VerifyCodeStep from "@/components/auth/VerifyCodeStep";
import { getMe, loginFn, resendFn } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Вход — JETRA" }, { name: "description", content: "Вход в личный кабинет JETRA." }] }),
  beforeLoad: async () => {
    const user = await getMe();
    if (user) throw redirect({ to: user.role !== "user" ? "/admin" : "/cabinet" });
  },
  component: LoginPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<{ code: string; text: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [verifyFor, setVerifyFor] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = "Введите корректный email";
    if (!password) next.password = "Введите пароль";
    setErrors(next);
    setFormError(null);
    setNotice("");
    if (Object.keys(next).length) return;
    setLoading(true);
    const r = await loginFn({ data: { email: email.trim(), password } });
    setLoading(false);
    if (!r.ok) {
      setFormError({ code: r.error, text: r.message });
      return;
    }
    navigate({ to: r.role && r.role !== "user" ? "/admin" : "/cabinet" });
  };

  const resend = async () => {
    setLoading(true);
    await resendFn({ data: { email: email.trim() } });
    setLoading(false);
    setFormError(null);
    setVerifyFor(email.trim());
  };

  if (verifyFor) return <VerifyCodeStep email={verifyFor} onBack={() => setVerifyFor("")} />;

  return (
    <AuthLayout title="Вход" subtitle="Войдите в личный кабинет JETRA">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <AuthField label="Email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <AuthField label="Пароль" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-brand-blue hover:underline">Забыли пароль?</Link>
        </div>
        {formError && (
          <FormAlert tone="error">
            {formError.text}
            {formError.code === "email_not_verified" && (
              <>
                {" "}
                <button type="button" onClick={resend} className="font-medium underline">
                  Получить код подтверждения
                </button>
              </>
            )}
          </FormAlert>
        )}
        {notice && <FormAlert tone="success">{notice}</FormAlert>}
        <SubmitButton loading={loading}>Войти</SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-brand-muted">
        Нет аккаунта? <Link to="/register" className="font-medium text-brand-blue hover:underline">Зарегистрироваться</Link>
      </p>
    </AuthLayout>
  );
}
