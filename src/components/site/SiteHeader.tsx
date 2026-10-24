import { useState } from "react";
import { Link } from "@tanstack/react-router";
import Logo from "@/components/brand/Logo";
import Icon from "@/components/ui/icon";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/strategies", label: "Стратегии" },
  { to: "/university", label: "Университет" },
] as const;

const CLUB_URL = "https://club-capitalist.ru/";

const navLink = "text-[17px] font-medium text-brand-muted transition-colors hover:text-brand-ink";

export default function SiteHeader(_props: { tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-brand-light/95 backdrop-blur supports-[backdrop-filter]:bg-brand-light/85">
      <div className="container-x">
        <div className="relative flex h-[80px] items-center justify-between border-b border-brand-ink/10 md:h-[88px]">
          <Logo />

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 md:flex lg:gap-12">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} className={navLink} activeProps={{ className: "!text-brand-ink" }}>
                {item.label}
              </Link>
            ))}
            <a href={CLUB_URL} target="_blank" rel="noopener noreferrer" className={navLink}>
              Клуб
            </a>
          </nav>

          <Link
            to="/login"
            className="hidden items-center gap-2.5 rounded-lg px-3 py-2 text-[16px] font-medium text-brand-ink transition-colors hover:bg-brand-surface md:inline-flex"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-ink/15">
              <Icon name="User" size={18} />
            </span>
            Вход
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Открыть меню"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-brand-ink hover:bg-brand-surface md:hidden"
              >
                <Icon name="Menu" size={22} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] border-brand-ink/10 bg-brand-light text-brand-ink">
              <SheetTitle className="sr-only">Меню</SheetTitle>
              <div className="mt-2">
                <Logo size={32} />
              </div>
              <nav className="mt-10 flex flex-col">
                {[{ to: "/", label: "Главная" }, ...NAV].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="border-b border-brand-ink/10 py-4 text-lg text-brand-ink/85 hover:text-brand-ink"
                  >
                    {item.label}
                  </Link>
                ))}
                <a
                  href={CLUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-b border-brand-ink/10 py-4 text-lg text-brand-ink/85 hover:text-brand-ink"
                >
                  Клуб <Icon name="ArrowUpRight" size={18} className="text-brand-muted" />
                </a>
              </nav>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="mt-8 flex items-center justify-center gap-2 rounded-lg bg-brand-blue py-3 font-medium text-white"
              >
                <Icon name="User" size={18} /> Вход
              </Link>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
