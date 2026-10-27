import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const MARK_RATIO = 332 / 341;
const WORD_RATIO = 866 / 155;

export default function BrandLockup({ size = 34, className }: { size?: number; className?: string }) {
  const h = Math.round(size * 1.15);
  const wordH = Math.round(h * 0.52);
  const tagSize = Math.max(8, Math.round(h * 0.25));
  return (
    <Link to="/" aria-label="JETRA Smart Capital — на главную" className={cn("inline-flex items-stretch", className)} style={{ height: h, gap: Math.round(h * 0.28) }}>
      <img src="/brand/jetra-mark.png" alt="" width={Math.round(h * MARK_RATIO)} height={h} style={{ height: h, width: "auto" }} className="object-contain" />
      <span className="flex flex-col justify-between" style={{ width: Math.round(wordH * WORD_RATIO) }}>
        <img src="/brand/jetra-wordmark.png" alt="JETRA" width={Math.round(wordH * WORD_RATIO)} height={wordH} style={{ height: wordH, width: "auto" }} />
        <span
          className="flex justify-between whitespace-nowrap font-semibold uppercase text-brand-muted/85"
          style={{ fontSize: tagSize, lineHeight: 0.74 }}
        >
          {"Smart\u00A0Capital".split("").map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </span>
      </span>
    </Link>
  );
}
