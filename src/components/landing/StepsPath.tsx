import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Зарегистрируйтесь", text: "Создайте личный кабинет JETRA.", icon: "UserPlus" },
  { title: "Изучите возможности", text: "Выберите интересующие вас стратегии и направления.", icon: "LineChart" },
  { title: "Развивайте свой капитал", text: "Используйте доступные инструменты и расширяйте свои инвестиционные возможности.", icon: "Sprout" },
];

const STEP_MS = 1400;

export default function StepsPath() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(STEPS.length - 1);
      return;
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        let t = 0;
        setActive(0);
        timer = setInterval(() => {
          t = (t + 1) % (STEPS.length + 1);
          setActive(Math.min(t, STEPS.length - 1));
        }, STEP_MS);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearInterval(timer);
    };
  }, []);

  const progress = active <= 0 ? 0 : active / (STEPS.length - 1);

  return (
    <div ref={ref} className="relative mx-auto mt-12 max-w-5xl md:mt-16">
      <div aria-hidden className="absolute left-[16.66%] right-[16.66%] top-[31px] hidden h-[2px] rounded-full bg-brand-ink/[0.08] md:block" />
      <div
        aria-hidden
        className="absolute left-[16.66%] top-[31px] hidden h-[2px] rounded-full bg-gradient-to-r from-brand-blue to-[#6FAEE6] transition-[width] ease-in-out motion-reduce:transition-none md:block"
        style={{ width: `calc(66.66% * ${progress})`, transitionDuration: `${STEP_MS}ms` }}
      />

      <ol className="relative grid gap-9 md:grid-cols-3 md:gap-6">
        {STEPS.map((s, i) => {
          const on = i <= active;
          const current = i === active;
          return (
            <li key={s.title} className="relative flex items-start gap-5 md:flex-col md:items-center md:gap-0 md:text-center">
              {i < STEPS.length - 1 && (
                <span aria-hidden className="absolute -bottom-9 left-[23px] top-12 w-[2px] overflow-hidden rounded-full bg-brand-ink/[0.08] md:hidden">
                  <span
                    className="block w-full rounded-full bg-gradient-to-b from-brand-blue to-[#6FAEE6] transition-[height] ease-in-out motion-reduce:transition-none"
                    style={{ height: i < active ? "100%" : "0%", transitionDuration: `${STEP_MS}ms` }}
                  />
                </span>
              )}
              <span className="relative shrink-0">
                {current && <span aria-hidden className="absolute inset-0 animate-ping rounded-2xl bg-brand-blue/25 [animation-duration:1.8s] md:rounded-[20px]" />}
                <span
                  className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-500 md:h-16 md:w-16 md:rounded-[20px]",
                    on
                      ? "border-transparent bg-brand-blue text-white shadow-[0_14px_30px_-12px_rgba(57,127,196,0.9)]"
                      : "border-brand-ink/10 bg-white text-brand-muted/60",
                  )}
                >
                  <Icon name={s.icon} size={22} className="md:hidden" />
                  <Icon name={s.icon} size={26} className="hidden md:block" />
                </span>
                <span
                  className={cn(
                    "absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ring-2 ring-white transition-colors duration-500 md:-right-2 md:-top-2 md:h-6 md:w-6 md:text-xs",
                    on ? "bg-brand-ink text-white" : "bg-brand-surface text-brand-muted",
                  )}
                >
                  {i + 1}
                </span>
              </span>
              <span className={cn("block pt-1 transition-opacity duration-500 md:mt-6 md:pt-0", on ? "opacity-100" : "opacity-45")}>
                <span className="block font-display text-lg font-semibold text-brand-ink md:text-xl">{s.title}</span>
                <span className="mt-1.5 block max-w-xs text-[15px] leading-relaxed text-brand-muted md:mx-auto">{s.text}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
