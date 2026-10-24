import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  size?: number;
  withWordmark?: boolean;
  tone?: "light" | "dark";
};

/** Оригинальный знак JETRA — квадратное изображение, пропорции 1:1 не меняются. */
export default function Logo({ className, size = 36, withWordmark = true, tone = "dark" }: LogoProps) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-3", className)} aria-label="JETRA — на главную">
      <img
        src="/brand/jetra-logo.png"
        alt="JETRA"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-md object-contain"
      />
      {withWordmark && (
        <span
          className={cn(
            "font-display text-[17px] font-bold tracking-[0.22em]",
            tone === "light" ? "text-brand-ink" : "text-brand-ink",
          )}
        >
          JETRA
        </span>
      )}
    </Link>
  );
}
