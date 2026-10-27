import Logo from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const LOGO_RATIO = 1286 / 337;
const WORD_START = 416 / 1286;

export default function BrandLockup({ size = 34, className }: { size?: number; className?: string }) {
  const width = size * LOGO_RATIO;
  return (
    <div className={cn("inline-flex flex-col items-start", className)}>
      <Logo size={size} />
      <span
        className="whitespace-nowrap font-medium uppercase leading-none text-brand-muted/80"
        style={{
          marginLeft: width * WORD_START + 1,
          marginTop: Math.round(size * 0.1),
          fontSize: Math.max(8, Math.round(size * 0.27)),
          letterSpacing: "0.16em",
        }}
      >
        Smart Capital
      </span>
    </div>
  );
}
