import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "@/components/ui/icon";
import VideoPlayer from "@/components/learning/VideoPlayer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { Block } from "@/lib/strategies";

type D = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const list = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);
const paras = (t: string) => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

function Title({ text }: { text: string }) {
  return text ? <h3 className="mb-4 font-display text-xl font-semibold text-brand-ink">{text}</h3> : null;
}

const TONES: Record<string, { cls: string; icon: string }> = {
  info: { cls: "border-brand-blue/20 bg-brand-blue/5", icon: "Info" },
  warning: { cls: "border-amber-200 bg-amber-50", icon: "TriangleAlert" },
  success: { cls: "border-emerald-200 bg-emerald-50", icon: "CircleCheck" },
};

function ChartBlock({ d }: { d: D }) {
  const pts = list<{ label: string; value: number }>(d.points);
  const suffix = str(d.suffix);
  const kind = str(d.kind) || "line";
  const fmt = (v: number) => `${v.toLocaleString("ru-RU")}${suffix}`;
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#17263C14" vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5A6B82" }} tickLine={false} axisLine={false} />
      <YAxis tick={{ fontSize: 12, fill: "#5A6B82" }} tickLine={false} axisLine={false} width={56} tickFormatter={fmt} />
      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 8, border: "1px solid #17263C1A", fontSize: 13 }} />
    </>
  );
  return (
    <div className="rounded-xl border border-brand-ink/10 bg-white p-5">
      <Title text={str(d.title)} />
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "bar" ? (
            <BarChart data={pts}>
              {common}
              <Bar dataKey="value" fill="#397FC4" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : kind === "area" ? (
            <AreaChart data={pts}>
              {common}
              <Area dataKey="value" stroke="#397FC4" fill="#397FC4" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          ) : (
            <LineChart data={pts}>
              {common}
              <Line dataKey="value" stroke="#397FC4" strokeWidth={2} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      {str(d.note) && <p className="mt-3 text-xs text-brand-muted">{str(d.note)}</p>}
    </div>
  );
}

export function BlockView({ b }: { b: Block }) {
  const d = b.data as D;
  switch (b.type) {
    case "heading":
      return d.level === 3 ? (
        <h3 className="font-display text-xl font-semibold text-brand-ink">{str(d.text)}</h3>
      ) : (
        <h2 className="font-display text-2xl font-semibold text-brand-ink md:text-[28px]">{str(d.text)}</h2>
      );
    case "text":
      return (
        <div className="space-y-4 text-[16px] leading-relaxed text-brand-ink/80">
          {paras(str(d.text)).map((p, i) => (
            <p key={i} className="whitespace-pre-line">{p}</p>
          ))}
        </div>
      );
    case "callout": {
      const tone = TONES[str(d.tone)] ?? TONES.info;
      return (
        <div className={cn("flex gap-3 rounded-xl border p-5", tone.cls)}>
          <Icon name={tone.icon} size={20} className="mt-0.5 shrink-0 text-brand-ink/70" />
          <div>
            {str(d.title) && <div className="font-semibold text-brand-ink">{str(d.title)}</div>}
            {str(d.text) && <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-brand-ink/80">{str(d.text)}</p>}
          </div>
        </div>
      );
    }
    case "image":
      return (
        <figure>
          <img src={str(d.url)} alt={str(d.caption)} loading="lazy" className="w-full rounded-xl bg-brand-surface object-cover" />
          {str(d.caption) && <figcaption className="mt-2 text-center text-sm text-brand-muted">{str(d.caption)}</figcaption>}
        </figure>
      );
    case "video":
      return (
        <div>
          {str(d.title) && <div className="mb-2.5 font-semibold text-brand-ink">{str(d.title)}</div>}
          <VideoPlayer type={d.kind === "file" ? "file" : "link"} url={str(d.url)} title={str(d.title) || "Видео"} />
        </div>
      );
    case "pdf":
      return (
        <div className="overflow-hidden rounded-xl border border-brand-ink/10 bg-white">
          <a href={str(d.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 hover:bg-brand-light">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <Icon name="FileText" size={20} />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-brand-ink">{str(d.title) || "PDF-документ"}</span>
            <span className="text-sm text-brand-blue">Открыть</span>
          </a>
          {d.embed !== false && <iframe src={str(d.url)} title={str(d.title) || "PDF"} className="hidden h-[560px] w-full border-t border-brand-ink/10 md:block" />}
        </div>
      );
    case "list": {
      const items = list<string>(d.items);
      const Tag = d.ordered ? "ol" : "ul";
      return (
        <div>
          <Title text={str(d.title)} />
          <Tag className="space-y-2.5">
            {items.map((it, i) => (
              <li key={i} className="flex gap-3 text-[16px] leading-relaxed text-brand-ink/80">
                {d.ordered ? (
                  <span className="w-6 shrink-0 font-display text-sm font-semibold tabular-nums text-brand-blue">{i + 1}.</span>
                ) : (
                  <Icon name="Check" size={18} className="mt-1 shrink-0 text-brand-blue" />
                )}
                <span>{it}</span>
              </li>
            ))}
          </Tag>
        </div>
      );
    }
    case "table": {
      const headers = list<string>(d.headers);
      const rows = list<string[]>(d.rows);
      return (
        <div>
          <Title text={str(d.title)} />
          <div className="overflow-x-auto rounded-xl border border-brand-ink/10 bg-white">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-brand-light text-brand-muted">
                <tr>{headers.map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/[0.06]">
                {rows.map((r, i) => (
                  <tr key={i}>{r.map((c, j) => <td key={j} className="px-4 py-3 text-brand-ink/85">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    case "stats": {
      const items = list<{ value: string; label: string; hint: string }>(d.items);
      return (
        <div>
          <Title text={str(d.title)} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {items.map((it, i) => (
              <div key={i} className="rounded-xl border border-brand-ink/10 bg-white p-4">
                <div className="font-display text-2xl font-semibold text-brand-ink">{it.value}</div>
                <div className="mt-1 text-sm text-brand-muted">{it.label}</div>
                {it.hint && <div className="mt-1 text-xs text-brand-ink/40">{it.hint}</div>}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "chart":
      return <ChartBlock d={d} />;
    case "faq": {
      const items = list<{ q: string; a: string }>(d.items);
      return (
        <div>
          <Title text={str(d.title)} />
          <Accordion type="multiple" className="space-y-2">
            {items.map((it, i) => (
              <AccordionItem key={i} value={`q${i}`} className="rounded-xl border border-brand-ink/10 bg-white px-5">
                <AccordionTrigger className="py-4 text-left font-medium text-brand-ink hover:no-underline">{it.q}</AccordionTrigger>
                <AccordionContent className="whitespace-pre-line text-[15px] leading-relaxed text-brand-ink/75">{it.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      );
    }
    case "documents": {
      const items = list<{ title: string; url: string; note: string }>(d.items);
      return (
        <div>
          <Title text={str(d.title)} />
          <ul className="divide-y divide-brand-ink/[0.07] rounded-xl border border-brand-ink/10 bg-white">
            {items.map((it, i) => (
              <li key={i}>
                <a href={it.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3.5 hover:bg-brand-light">
                  <Icon name="FileCheck2" size={18} className="shrink-0 text-brand-blue" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-brand-ink">{it.title}</span>
                    {it.note && <span className="block text-xs text-brand-muted">{it.note}</span>}
                  </span>
                  <Icon name="ExternalLink" size={15} className="shrink-0 text-brand-muted" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    default:
      return null;
  }
}

export default function BlockRenderer({ blocks }: { blocks: Block[] }) {
  if (!blocks.length) return <p className="text-brand-muted">Подробное описание стратегии скоро появится.</p>;
  return (
    <div className="space-y-8">
      {blocks.map((b, i) => (
        <BlockView key={i} b={b} />
      ))}
    </div>
  );
}
