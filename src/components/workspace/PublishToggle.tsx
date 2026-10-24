import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function PublishToggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      className={cn("inline-flex cursor-pointer items-center gap-2.5", disabled && "cursor-wait opacity-60")}
      onClick={(e) => e.stopPropagation()}
      title={checked ? "Показывается на сайте. Выключите, чтобы скрыть" : "Скрыт. Включите, чтобы показать на сайте"}
    >
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
      <span className={cn("whitespace-nowrap text-xs font-medium", checked ? "text-emerald-700" : "text-brand-muted")}>
        {checked ? "На сайте" : "Скрыт"}
      </span>
    </label>
  );
}
