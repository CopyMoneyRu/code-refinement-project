import { useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import Logo from "@/components/brand/Logo";
import Icon from "@/components/ui/icon";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logoutFn, type AuthUser } from "@/lib/auth";
import { isStaff, ROLE_LABEL } from "@/lib/permissions";

export type NavItem = { to: string; label: string; icon: string; exact?: boolean };

function SideNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => (
        <Link
          key={it.to}
          to={it.to}
          onClick={onNavigate}
          activeOptions={{ exact: it.exact ?? false }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-ink"
          activeProps={{ className: "!bg-brand-surface !text-brand-ink" }}
        >
          <Icon name={it.icon} size={18} />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

export default function WorkspaceLayout({
  section,
  items,
  user,
  children,
}: {
  section: string;
  items: NavItem[];
  user: AuthUser;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const logout = async () => {
    await logoutFn();
    await router.invalidate();
    router.navigate({ to: "/login" });
  };

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <Logo />
      <div className="mt-10 px-3 text-xs uppercase tracking-[0.16em] text-brand-ink/50">{section}</div>
      <div className="mt-3">
        <SideNav items={items} onNavigate={onNavigate} />
      </div>
      <div className="mt-auto space-y-1 border-t border-brand-ink/10 pt-5">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-brand-muted hover:text-brand-ink">
          <Icon name="Globe" size={17} /> На сайт
        </Link>
        {isStaff(user.role) && (
          <Link
            to={section === "Администрирование" ? "/cabinet" : "/admin"}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-brand-muted hover:text-brand-ink"
          >
            <Icon name={section === "Администрирование" ? "UserRound" : "ShieldCheck"} size={17} />
            {section === "Администрирование" ? "Личный кабинет" : "Администрирование"}
          </Link>
        )}
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-brand-muted hover:text-brand-ink">
          <Icon name="LogOut" size={17} /> Выйти
        </button>
      </div>
    </div>
  );

  return (
    <div className="theme-light min-h-screen bg-brand-light text-brand-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-[260px] border-r border-brand-ink/10 bg-white p-6 lg:block">{sidebar()}</aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-brand-ink/10 bg-brand-light/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button aria-label="Меню" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-brand-surface lg:hidden">
                  <Icon name="Menu" size={20} />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] border-0 bg-brand-light p-6 text-brand-ink">
                <SheetTitle className="sr-only">Навигация</SheetTitle>
                {sidebar(() => setOpen(false))}
              </SheetContent>
            </Sheet>
            <span className="text-sm text-brand-muted">{section}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium leading-tight">{user.name}</div>
              <div className="text-xs text-brand-muted">{user.role === "user" ? user.email : ROLE_LABEL[user.role]}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-sm font-semibold text-white">
              {user.name.trim().charAt(0).toUpperCase() || "?"}
            </div>
          </div>
        </header>
        <main className="px-5 py-8 sm:px-8 md:py-10">
          <div className="mx-auto max-w-[1120px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function WsTitle({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="font-display text-[28px] font-bold leading-tight md:text-[34px]">{title}</h1>
        {text && <p className="mt-2 max-w-xl text-brand-muted">{text}</p>}
      </div>
      {action}
    </div>
  );
}

export function WsCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-brand-ink/[0.08] bg-white p-6 ${className}`}>{children}</div>;
}

export function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-brand-blue">
        <Icon name={icon} size={26} />
      </div>
      <div className="mt-5 font-display text-lg font-semibold">{title}</div>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-brand-muted">{text}</p>
    </div>
  );
}
