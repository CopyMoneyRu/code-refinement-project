import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  size?: number;
  withWordmark?: boolean;
  tone?: "light" | "dark";
};

const FULL_RATIO = 1286 / 337;

export default function Logo({ className, size = 40, withWordmark = true }: LogoProps) {
  return (
    <Link to="/" className={cn("inline-flex items-center", className)} aria-label="JETRA — на главную">
      {withWordmark ? (
        <img
          src="/brand/jetra-logo-full.png"
          alt="JETRA"
          width={Math.round(size * FULL_RATIO)}
          height={size}
          style={{ height: size, width: "auto" }}
          className="object-contain"
        />
      ) : (
        <img
          src="/brand/jetra-mark.png"
          alt="JETRA"
          width={size}
          height={size}
          style={{ width: size, height: size }}
          className="object-contain"
        />
      )}
    </Link>
  );
}
