export const PROGRESS_TONES = {
  todo: {
    label: "Не начато",
    icon: "CircleDashed",
    box: "border-rose-200/70 bg-rose-50/70",
    text: "text-rose-700/90",
    iconCls: "text-rose-400",
    meta: "text-rose-700/60",
    track: "bg-rose-100",
    bar: "bg-rose-300",
  },
  active: {
    label: "Обучение начато",
    icon: "PlayCircle",
    box: "border-amber-200/80 bg-amber-50/80",
    text: "text-amber-800",
    iconCls: "text-amber-500",
    meta: "text-amber-800/60",
    track: "bg-amber-100",
    bar: "bg-amber-400",
  },
  done: {
    label: "Обучение пройдено",
    icon: "CheckCircle2",
    box: "border-emerald-200/80 bg-emerald-50/80",
    text: "text-emerald-700",
    iconCls: "text-emerald-500",
    meta: "text-emerald-700/60",
    track: "bg-emerald-100",
    bar: "bg-emerald-500",
  },
} as const;

export type ProgressTone = (typeof PROGRESS_TONES)[keyof typeof PROGRESS_TONES];

export function progressTone(p: { done: number; total: number }): ProgressTone {
  if (p.total > 0 && p.done >= p.total) return PROGRESS_TONES.done;
  if (p.done === 0) return PROGRESS_TONES.todo;
  return PROGRESS_TONES.active;
}
