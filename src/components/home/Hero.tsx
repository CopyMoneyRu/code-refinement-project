import { Link } from "@tanstack/react-router";

function CapitalVisual() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-brand-surface p-6 sm:p-8">
      <svg viewBox="0 0 400 380" className="mx-auto block w-full max-w-[420px]" aria-hidden>
        <g stroke="#17263C" strokeOpacity="0.14" fill="none">
          <circle cx="200" cy="200" r="150" />
          <circle cx="200" cy="200" r="100" />
          <circle cx="200" cy="200" r="50" />
          <line x1="0" y1="200" x2="400" y2="200" />
          <line x1="200" y1="10" x2="200" y2="380" />
        </g>
        <path
          className="orbit-arc"
          d="M350 192 A150 150 0 0 1 262 337"
          stroke="#397FC4"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <g className="orbit-needle">
          <line x1="200" y1="200" x2="300" y2="88" stroke="#397FC4" strokeWidth="1.6" />
        </g>
        <circle cx="350" cy="192" r="5" fill="#397FC4" />
        <circle cx="150" cy="200" r="4" fill="#5A6B82" />
        <circle cx="200" cy="300" r="4" fill="#5A6B82" />
        <circle cx="200" cy="200" r="7" fill="#17263C" />
      </svg>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-brand-ink/15 pt-5 text-[13px] sm:gap-6 sm:text-sm">
        <div>
          <div className="font-semibold text-brand-ink">9 стратегий</div>
          <div className="mt-1 text-brand-muted">Скоро в доступе</div>
        </div>
        <div>
          <div className="font-semibold text-brand-ink">University</div>
          <div className="mt-1 text-brand-muted">Курсы и модули</div>
        </div>
        <div>
          <div className="font-semibold text-brand-ink">Контроль</div>
          <div className="mt-1 text-brand-muted">Прозрачный доступ</div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="bg-brand-light text-brand-ink">
      <div className="container-x grid items-center gap-12 py-16 md:py-20 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:py-24">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="font-display text-[44px] font-light leading-[1.08] tracking-[-0.02em] sm:text-[56px] lg:text-[66px]">
            Капитал
            <br />
            под <span className="font-extrabold">управлением</span>
            <br />
            технологий
          </h1>
          <p className="mt-7 max-w-[440px] text-[17px] leading-relaxed text-brand-muted">
            Инвестиционные стратегии и обучение JETRA University на одной платформе.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              to="/university"
              className="rounded-lg bg-brand-blue px-8 py-4 text-[16px] font-medium text-white transition-colors hover:bg-[#3271B0]"
            >
              Начать обучение
            </Link>
            <Link
              to="/strategies"
              className="border-b border-brand-ink/25 pb-1 text-[16px] text-brand-muted transition-colors hover:border-brand-blue hover:text-brand-ink"
            >
              Смотреть стратегии
            </Link>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <CapitalVisual />
        </div>
      </div>
    </section>
  );
}
