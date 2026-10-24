import { useState } from "react";
import { Link } from "@tanstack/react-router";
import Logo from "@/components/brand/Logo";
import Icon from "@/components/ui/icon";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/strategies", label: "Стратегии" },
  { to: "/university", label: "Университет" },
] as const;

export default function SiteHeader({ tone = "dark" }: { tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const light = tone === "light";

  return (
    <header className={cn("relative z-30", light ? "bg-brand-light" : "bg-brand-light")}>
      <div className="container-x">
        <div
          className={cn(
            "flex h-[88px] items-center justify-between border-b",
            light ? "border-brand-ink/10" : "border-brand-ink/10",
          )}
        >
          <div className="flex items-center gap-10 lg:gap-12">
            <Logo tone={tone} />
            <nav className="hidden items-center gap-9 md:flex">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "text-[15px] transition-colors",
                    light ? "text-brand-muted hover:text-brand-ink" : "text-brand-muted hover:text-brand-ink",
                  )}
                  activeProps={{ className: light ? "!text-brand-ink" : "!text-brand-ink" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className={cn(
                "rounded-lg px-4 py-2.5 text-[15px] font-medium transition-colors",
                light ? "text-brand-ink hover:bg-brand-surface" : "text-brand-ink hover:bg-brand-surface",
              )}
            >
              Войти
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-brand-blue px-5 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-[#3271B0]"
            >
              Регистрация
            </Link>
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Открыть меню"
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg md:hidden",
                  light ? "text-brand-ink hover:bg-brand-surface" : "text-brand-ink hover:bg-brand-surface",
                )}
              >
                <Icon name="Menu" size={22} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] border-brand-ink/10 bg-brand-light text-brand-ink">
              <SheetTitle className="sr-only">Меню</SheetTitle>
              <div className="mt-2">
                <Logo />
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
              </nav>
              <div className="mt-8 flex flex-col gap-3">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-brand-ink/10 py-3 text-center font-medium"
                >
                  Войти
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-brand-blue py-3 text-center font-medium text-white"
                >
                  Регистрация
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
