import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import Icon from "@/components/ui/icon";
import ConfirmDelete from "@/components/workspace/ConfirmDelete";
import { EmptyState, WsCard, WsTitle } from "@/components/workspace/WorkspaceLayout";
import { requirePermission } from "@/lib/adminGuard";
import { accessGrantFn, accessListFn, accessRevokeFn, type AccessGrant } from "@/lib/learning";

export const Route = createFileRoute("/admin/access")({
  beforeLoad: ({ context }) => requirePermission(context, "access"),
  loader: () => accessListFn(),
  component: AccessAdmin,
});

function AccessAdmin() {
  const { grants, courses } = Route.useLoaderData();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [courseId, setCourseId] = useState<number>(0);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [toRevoke, setToRevoke] = useState<AccessGrant | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s
      ? grants.filter((g) => g.user.email.toLowerCase().includes(s) || g.user.name.toLowerCase().includes(s) || g.course.title.toLowerCase().includes(s))
      : grants;
  }, [grants, q]);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Введите email пользователя");
    if (!courseId) return setError("Выберите курс");
    setBusy(true);
    const r = await accessGrantFn({ data: { email: email.trim(), courseId } });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setNotice(r.created ? `Доступ к курсу «${r.courseTitle}» выдан: ${r.userName}` : `У пользователя ${r.userName} уже есть доступ к «${r.courseTitle}»`);
    setEmail("");
    router.invalidate();
  };

  const revoke = async () => {
    if (!toRevoke) return;
    const g = toRevoke;
    setBusy(true);
    setError("");
    setNotice("");
    const r = await accessRevokeFn({ data: { id: g.id } });
    setBusy(false);
    setToRevoke(null);
    if (!r.ok) return setError(r.message);
    setNotice(`Доступ ${g.user.name} к курсу «${g.course.title}» отозван`);
    router.invalidate();
  };

  return (
    <>
      <WsTitle title="Доступы" text="Платные курсы открываются только тем, кому выдан доступ. Бесплатные курсы доступны всем зарегистрированным." />
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <WsCard className="mb-6">
        <div className="font-semibold">Выдать доступ</div>
        {courses.length ? (
          <form onSubmit={grant} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email пользователя"
              className="h-11 rounded-lg border border-brand-ink/15 px-3.5 text-[15px] focus:border-brand-blue focus:outline-none"
            />
            <select
              value={courseId}
              onChange={(e) => setCourseId(Number(e.target.value))}
              className="h-11 rounded-lg border border-brand-ink/15 bg-white px-3.5 text-[15px] focus:border-brand-blue focus:outline-none"
            >
              <option value={0}>Выберите платный курс</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}{c.published ? "" : " (скрыт)"}
                </option>
              ))}
            </select>
            <button disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 text-sm font-medium text-white hover:bg-[#3271B0] disabled:opacity-60">
              <Icon name="KeyRound" size={16} /> Выдать
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-brand-muted">Платных курсов пока нет. Сделайте курс платным в разделе «Курсы».</p>
        )}
        <p className="mt-3 text-xs text-brand-muted">Пользователь должен быть зарегистрирован. После подключения оплаты доступ будет выдаваться автоматически.</p>
      </WsCard>

      <WsCard className="p-0">
        <div className="flex flex-col gap-3 border-b border-brand-ink/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative flex-1">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по пользователю или курсу"
              className="h-10 w-full rounded-lg border border-brand-ink/15 pl-9 pr-3 text-sm focus:border-brand-blue focus:outline-none sm:max-w-xs"
            />
          </label>
          <span className="text-sm text-brand-muted">Выдано: {grants.length}</span>
        </div>
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-brand-ink/[0.08] bg-brand-light/60 text-brand-muted">
                <tr>
                  {["Пользователь", "Курс", "Выдал", "Дата", ""].map((c) => (
                    <th key={c} className="px-5 py-3.5 font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/[0.06]">
                {list.map((g) => (
                  <tr key={g.id}>
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{g.user.name}</div>
                      <div className="text-xs text-brand-muted">{g.user.email}</div>
                    </td>
                    <td className="px-5 py-3.5">{g.course.title}</td>
                    <td className="px-5 py-3.5 text-brand-muted">{g.grantedBy ?? "—"}</td>
                    <td className="px-5 py-3.5 text-brand-muted">{new Date(g.createdAt).toLocaleDateString("ru-RU")}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        disabled={busy}
                        onClick={() => setToRevoke(g)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Отозвать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="KeyRound" title={grants.length ? "Ничего не найдено" : "Выданных доступов нет"} text={grants.length ? "Измените условия поиска." : "Выдайте доступ к платному курсу через форму выше."} />
        )}
      </WsCard>

      <ConfirmDelete open={!!toRevoke} title="Отозвать доступ?" busy={busy} onCancel={() => setToRevoke(null)} onConfirm={revoke} confirmLabel="Отозвать доступ">
        <p>
          {toRevoke?.user.name} ({toRevoke?.user.email}) потеряет доступ к курсу <span className="font-medium text-brand-ink">«{toRevoke?.course.title}»</span>.
          Прогресс сохранится — если выдать доступ снова, ученик продолжит с того же места.
        </p>
      </ConfirmDelete>
    </>
  );
}
