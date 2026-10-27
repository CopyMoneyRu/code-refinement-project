import Logo from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const LOGO_RATIO = 1286 / 337;
const WORD_START = 416 / 1286;
const WORD_END = 1282 / 1286;
const TAGLINE = "SMART CAPITAL";

export default function BrandLockup({ size = 34, className }: { size?: number; className?: string }) {
  const width = size * LOGO_RATIO;
  return (
    <div className={cn("inline-flex flex-col items-start", className)}>
      <Logo size={size} />
      <span
        aria-label={TAGLINE}
        className="mt-1 flex justify-between font-semibold leading-none text-brand-muted"
        style={{
          marginLeft: width * WORD_START,
          width: width * (WORD_END - WORD_START),
          fontSize: Math.max(9, Math.round(size * 0.29)),
        }}
      >
        {TAGLINE.split("").map((ch, i) => (
          <span key={i} aria-hidden="true">
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
      </span>
    </div>
  );
}
