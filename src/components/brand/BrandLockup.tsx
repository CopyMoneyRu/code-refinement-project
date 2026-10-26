import Logo from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

export default function BrandLockup({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("inline-flex flex-col items-stretch", className)}>
      <Logo size={size} />
      <span
        className="mt-1 whitespace-nowrap text-right font-medium uppercase leading-none text-brand-muted"
        style={{ fontSize: Math.round(size * 0.27), letterSpacing: "0.06em" }}
      >
        Надежные инвестиции
      </span>
    </div>
  );
}
