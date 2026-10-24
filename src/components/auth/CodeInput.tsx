import { useRef } from "react";
import { cn } from "@/lib/utils";

const LEN = 6;

export default function CodeInput({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LEN }, (_, i) => value[i] ?? "");

  const setAt = (i: number, ch: string) => {
    const arr = digits.slice();
    arr[i] = ch;
    onChange(arr.join("").slice(0, LEN));
  };

  const handleChange = (i: number, raw: string) => {
    const only = raw.replace(/\D/g, "");
    if (!only) {
      setAt(i, "");
      return;
    }
    if (only.length > 1) {
      const merged = (digits.slice(0, i).join("") + only).slice(0, LEN);
      onChange(merged);
      refs.current[Math.min(merged.length, LEN - 1)]?.focus();
      return;
    }
    setAt(i, only);
    if (i < LEN - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={LEN}
          aria-label={`Цифра ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < LEN - 1) refs.current[i + 1]?.focus();
          }}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-14 w-full min-w-0 rounded-lg border bg-white text-center font-display text-2xl font-semibold text-brand-ink focus:outline-none focus:ring-2 sm:h-16",
            error ? "border-red-400 focus:ring-red-200" : "border-brand-ink/15 focus:border-brand-blue focus:ring-brand-blue/15",
          )}
        />
      ))}
    </div>
  );
}
