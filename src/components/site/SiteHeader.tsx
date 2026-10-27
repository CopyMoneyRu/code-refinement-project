import { getRouteApi, Link } from "@tanstack/react-router";
import BrandLockup from "@/components/brand/BrandLockup";
import Logo from "@/components/brand/Logo";
import ClubLink from "@/components/site/ClubLink";
import Icon from "@/components/ui/icon";

const NAV = [
  { to: "/", label: "Главная", icon: "Home" },
  { to: "/strategies", label: "Стратегии", icon: "LineChart" },
  { to: "/university", label: "Университет", icon: "GraduationCap" },
] as const;

const rootApi = getRouteApi("__root__");

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

const navLink = "text-[17px] font-medium text-brand-muted transition-colors hover:text-brand-ink";

export default function SiteHeader(_props: { tone?: "light" | "dark" }) {
  const user = rootApi.useLoaderData();

  return (
    <header className="sticky top-0 z-40 bg-brand-light/95 backdrop-blur supports-[backdrop-filter]:bg-brand-light/85">
      <div className="container-x">
        <div className="relative flex h-[64px] items-center justify-between gap-2 border-b border-brand-ink/10 md:h-[88px]">
          <Logo withWordmark={false} size={34} className="shrink-0 md:hidden" />
          <BrandLockup size={34} className="hidden md:inline-flex" />

          <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                title={item.label}
                activeOptions={{ exact: item.to === "/" }}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-brand-muted transition-colors hover:text-brand-ink"
                activeProps={{ className: "!text-brand-blue bg-brand-blue/10" }}
              >
                <Icon name={item.icon} size={20} />
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

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex lg:gap-4">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className={`${navLink} inline-flex items-center gap-2 px-3 py-2 lg:px-4`}
                activeProps={{ className: "!text-brand-blue" }}
              >
                {item.label}
              </Link>
            ))}
            <ClubLink className={`${navLink} px-3 py-2 lg:px-4`}>Клуб</ClubLink>
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