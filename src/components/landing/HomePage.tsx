import type { ReactNode } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import PublicLayout from "@/components/site/PublicLayout";
import ClubLink from "@/components/site/ClubLink";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import CapitalCalculator from "./CapitalCalculator";
import PortfolioShowcase from "./PortfolioShowcase";
import { HeroArt } from "./Illustrations";
import EcosystemShowcase from "./EcosystemShowcase";
import StepsPath from "./StepsPath";

const rootApi = getRouteApi("__root__");


const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-6 py-3.5 text-[16px] font-medium text-white shadow-[0_12px_30px_-12px_rgba(57,127,196,0.8)] transition-colors hover:bg-[#3271B0]";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-brand-ink/15 bg-white/70 px-6 py-3.5 text-[16px] font-medium text-brand-ink transition-colors hover:border-brand-blue/40";

function StartLink({ className, children }: { className: string; children: ReactNode }) {
  const user = rootApi.useLoaderData();
  return (
    <Link to={user ? "/cabinet" : "/register"} className={className}>
      {children}
    </Link>
  );
}

function SectionHead({ title, text, center, wide }: { title: ReactNode; text?: string; center?: boolean; wide?: boolean }) {
  return (
    <div className={cn(center ? "mx-auto max-w-2xl text-center" : "max-w-2xl", wide && "max-w-none")}>
      <h2 className="font-display text-3xl font-semibold leading-[1.12] tracking-[-0.02em] text-brand-ink md:text-[44px]">{title}</h2>
      {text && <p className="mt-4 text-[17px] leading-relaxed text-brand-muted">{text}</p>}
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="container-x relative grid items-center gap-10 pb-16 pt-10 md:pb-24 md:pt-16 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] text-brand-ink sm:text-5xl lg:text-[64px]">
            <img src="/brand/jetra-wordmark.png" alt="JETRA" width={866} height={155} className="inline-block h-[0.72em] w-auto align-baseline" /> — экосистема для создания и&nbsp;роста капитала
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-muted">
            Инвестиционные стратегии, финансовое образование и сообщество инвесторов — в одной платформе.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <StartLink className={btnPrimary}>
              Начать <Icon name="ArrowRight" size={18} />
            </StartLink>
            <a
              href="#ecosystem"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("ecosystem")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={btnGhost}
            >
              Узнать больше <Icon name="ArrowDown" size={18} />
            </a>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="absolute inset-6 rounded-[40px] bg-gradient-to-br from-brand-blue/25 to-transparent blur-2xl" />
          <HeroArt className="relative aspect-[4/5] w-full sm:aspect-square rounded-[32px] shadow-[0_40px_90px_-40px_rgba(23,38,60,0.45)]" />
        </div>
      </div>
    </section>
  );
}

function Ecosystem() {
  return (
    <section id="ecosystem" className="scroll-mt-24 py-16 md:py-24">
      <div className="container-x">
        <SectionHead wide title="Всё для капитала в одном месте." />
        <EcosystemShowcase />
      </div>
    </section>
  );
}

function Markets() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container-x">
        <SectionHead
          title={
            <>
              Разные рынки.
              <br />
              Разные возможности.
            </>
          }
          text="Исследуйте инвестиционные направления и находите подходящие решения для своего капитала." />
        <PortfolioShowcase />
      </div>
    </section>
  );
}

function Calculator() {
  return (
    <section id="calculator" className="py-16 md:py-24">
      <div className="container-x">
        <SectionHead center wide title={<span className="lg:whitespace-nowrap">Рассчитайте потенциал вашего капитала</span>} />
        <div className="mt-10 md:mt-12">
          <CapitalCalculator />
        </div>
      </div>
    </section>
  );
}

function Steps() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container-x">
        <SectionHead
          center
          wide
          title={
            <span className="lg:whitespace-nowrap">
              Развивайте свой капитал{" "}
              <span className="whitespace-nowrap">
                вместе с <img src="/brand/jetra-wordmark.png" alt="JETRA" width={866} height={155} className="inline-block h-[0.72em] w-auto align-baseline" />
              </span>
            </span>
          }
        />
        <StepsPath />
        <div className="mx-auto mt-12 flex max-w-sm flex-col gap-3 md:mt-14 lg:max-w-none lg:flex-row lg:justify-center">
          <StartLink className={btnPrimary}>
            Присоединиться к JETRA <Icon name="ArrowRight" size={18} />
          </StartLink>
          <Link to="/strategies" className={btnGhost}>
            <Icon name="LineChart" size={18} /> Посмотреть стратегии
          </Link>
          <Link to="/university" className={btnGhost}>
            <Icon name="GraduationCap" size={18} /> Начать обучение
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <PublicLayout>
      <Hero />
      <Ecosystem />
      <Markets />
      <Calculator />
      <Steps />
    </PublicLayout>
  );
}