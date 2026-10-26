import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import BrandIcon from "@/components/site/BrandIcon";
import { COMPANY, DOC_VERSION } from "@/lib/company";
import { cn } from "@/lib/utils";

const COOKIE_KEY = "jetra_cookie_consent";

export default function SiteWidgets() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      setShowBanner(!localStorage.getItem(COOKIE_KEY));
    } catch {
      setShowBanner(true);
    }
  }, []);

  const accept = (value: "all") => {
    try {
      localStorage.setItem(COOKIE_KEY, JSON.stringify({ value, version: DOC_VERSION, at: new Date().toISOString() }));
    } catch {
      /* storage недоступен */
    }
    setShowBanner(false);
  };

  return (
    <>
      <a
        href={COMPANY.support}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Написать в поддержку в Telegram"
        title="Написать в поддержку"
        className={cn(
          "fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#26A5E4] shadow-lg shadow-[#26A5E4]/30 transition-all hover:scale-105 md:right-6",
          showBanner ? "bottom-[172px] sm:bottom-6" : "bottom-4 md:bottom-6",
        )}
      >
        <BrandIcon name="telegram" size={28} color="#fff" />
      </a>

      {showBanner && (
        <div className="fixed inset-x-3 bottom-3 z-50 rounded-xl border border-brand-ink/10 bg-white p-4 text-brand-ink shadow-xl sm:inset-x-auto sm:left-6 sm:bottom-6 sm:max-w-md sm:p-5">
          <p className="text-sm leading-relaxed text-brand-muted">
            Мы используем файлы cookie, чтобы сайт работал корректно и становился удобнее. Подробнее — в{" "}
            <Link to="/privacy" className="text-brand-blue hover:underline">
              Политике конфиденциальности
            </Link>
            .
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => accept("all")}
              className="w-full rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3271B0]"
            >
              Принять
            </button>
          </div>
        </div>
      )}
    </>
  );
}
