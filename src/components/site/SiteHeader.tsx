import { getRouteApi, Link, useRouterState } from "@tanstack/react-router";
import Logo from "@/components/brand/Logo";
import ClubLink from "@/components/site/ClubLink";
import Icon from "@/components/ui/icon";

const NAV = [
  { to: "/strategies", label: "Стратегии", icon: "LineChart" },
  { to: "/university", label: "Университет", icon: "GraduationCap" },
] as const;

const rootApi = getRouteApi("__root__");

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

const navLink = "text-[17px] font-medium text-brand-muted transition-colors hover:text-brand-ink";

export default function SiteHeader(_props: { tone?: "light" | "dark" }) {
  const user = rootApi.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 bg-brand-light/95 backdrop-blur supports-[backdrop-filter]:bg-brand-light/85">
      <div className="container-x">
        <div className="relative flex h-[64px] items-center justify-between gap-2 border-b border-brand-ink/10 md:h-[88px]">
          <Logo withWordmark={false} size={34} className="shrink-0 md:hidden" />
          <div className="hidden flex-col items-start md:flex">
            <Logo size={34} />
            <span className="mt-1 pl-0.5 text-[11px] font-medium uppercase tracking-[0.22em] text-brand-muted">
              Надежные инвестиции
            </span>
          </div>

          <nav className="flex min-w-0 items-center gap-1 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-[15px] font-medium text-brand-muted transition-colors hover:text-brand-ink ${isHome && item.to === "/strategies" ? "!text-brand-blue" : ""}`}
                activeProps={{ className: "!text-brand-blue" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            to={user ? "/cabinet" : "/login"}
            aria-label={user ? "Личный кабинет" : "Вход"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-ink/15 text-brand-ink md:hidden"
          >
            {user ? (
              <span className="flex h-full w-full items-center justify-center rounded-full bg-brand-blue text-[15px] font-semibold text-white">{initial(user.name)}</span>
            ) : (
              <Icon name="User" size={19} />
            )}
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-4 md:flex lg:gap-6">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`${navLink} inline-flex items-center gap-2 px-4 py-2 ${isHome && item.to === "/strategies" ? "!text-brand-blue" : ""}`}
                activeProps={{ className: "!text-brand-blue" }}
              >
                {item.label}
              </Link>
            ))}
            <ClubLink className={`${navLink} px-4 py-2`}>Клуб</ClubLink>
          </nav>

          {user ? (
            <Link
              to="/cabinet"
              title="Личный кабинет"
              className="hidden max-w-[240px] items-center gap-3 rounded-full border border-brand-ink/10 bg-white py-1.5 pl-1.5 pr-4 text-brand-ink transition-colors hover:border-brand-blue/40 md:inline-flex"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[15px] font-semibold text-white">
                {initial(user.name)}
              </span>
              <span className="min-w-0 truncate text-[15px] font-medium">{firstName(user.name)}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="hidden items-center gap-2.5 rounded-lg px-3 py-2 text-[16px] font-medium text-brand-ink transition-colors hover:bg-brand-surface md:inline-flex"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-ink/15">
                <Icon name="User" size={18} />
              </span>
              Вход
            </Link>
          )}

        </div>
      </div>
    </header>
  );
}