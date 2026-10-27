const NAVY = "#17263C";
const BLUE = "#397FC4";
const SKY = "#8EC3F0";

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F4F8FD" />
        <stop offset="100%" stopColor="#DCE8F5" />
      </linearGradient>
      <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6FAEE6" />
        <stop offset="100%" stopColor={BLUE} />
      </linearGradient>
      <linearGradient id={`${id}-navy`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2D4A72" />
        <stop offset="100%" stopColor={NAVY} />
      </linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.55" />
      </linearGradient>
      <filter id={`${id}-sh`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor={NAVY} floodOpacity="0.16" />
      </filter>
    </defs>
  );
}

function Coin({ x, y, w, fill, id }: { x: number; y: number; w: number; fill: string; id: string }) {
  const h = w * 0.3;
  return (
    <g filter={`url(#${id}-sh)`}>
      <ellipse cx={x} cy={y + 12} rx={w / 2} ry={h / 2} fill={fill} opacity="0.85" />
      <rect x={x - w / 2} y={y} width={w} height={12} fill={fill} />
      <ellipse cx={x} cy={y} rx={w / 2} ry={h / 2} fill="#fff" opacity="0.9" />
      <ellipse cx={x} cy={y} rx={w / 2 - 8} ry={h / 2 - 3} fill="none" stroke={fill} strokeOpacity="0.35" />
    </g>
  );
}

export function HeroArt({ className }: { className?: string }) {
  const id = "hero";
  const bars = [
    { x: 120, h: 110 },
    { x: 190, h: 160 },
    { x: 260, h: 215 },
    { x: 330, h: 280 },
    { x: 400, h: 345 },
  ];
  const base = 470;
  return (
    <svg viewBox="0 0 560 560" className={className} role="img" aria-label="Рост капитала">
      <Defs id={id} />
      <rect width="560" height="560" rx="36" fill={`url(#${id}-bg)`} />
      <circle cx="430" cy="130" r="150" fill={SKY} opacity="0.18" />
      <circle cx="110" cy="440" r="120" fill={BLUE} opacity="0.08" />
      <g stroke={NAVY} strokeOpacity="0.07">
        {[170, 250, 330, 410].map((y) => (
          <line key={y} x1="70" x2="490" y1={y} y2={y} />
        ))}
      </g>
      {bars.map((b, i) => (
        <g key={b.x} filter={`url(#${id}-sh)`}>
          <rect x={b.x - 24} y={base - b.h} width="48" height={b.h} rx="14" fill={i % 2 ? `url(#${id}-navy)` : `url(#${id}-blue)`} />
          <rect x={b.x - 24} y={base - b.h} width="48" height="22" rx="11" fill="#fff" opacity="0.18" />
        </g>
      ))}
      <path d="M96 380 C 170 360, 210 320, 260 280 S 360 170, 430 110" fill="none" stroke={BLUE} strokeWidth="4" strokeLinecap="round" />
      {[
        [96, 380],
        [260, 280],
        [430, 110],
      ].map(([cx, cy]) => (
        <g key={cx}>
          <circle cx={cx} cy={cy} r="14" fill="#fff" filter={`url(#${id}-sh)`} />
          <circle cx={cx} cy={cy} r="6" fill={BLUE} />
        </g>
      ))}
      <Coin id={id} x={140} y={492} w={110} fill={BLUE} />
      <Coin id={id} x={140} y={474} w={110} fill={NAVY} />
      <Coin id={id} x={140} y={456} w={110} fill={BLUE} />
      <g filter={`url(#${id}-sh)`}>
        <rect x="350" y="400" width="150" height="96" rx="20" fill={`url(#${id}-glass)`} stroke="#fff" />
        <circle cx="384" cy="436" r="14" fill={BLUE} opacity="0.15" />
        <path d="M377 440 l5 -6 l5 4 l6 -9" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="408" y="428" width="70" height="8" rx="4" fill={NAVY} opacity="0.75" />
        <rect x="408" y="442" width="46" height="6" rx="3" fill={NAVY} opacity="0.2" />
        <rect x="370" y="466" width="110" height="8" rx="4" fill={SKY} opacity="0.5" />
        <rect x="370" y="466" width="72" height="8" rx="4" fill={BLUE} />
      </g>
    </svg>
  );
}

export function PortfolioArt({ className }: { className?: string }) {
  const id = "pf";
  return (
    <svg viewBox="0 0 400 250" className={className} aria-hidden>
      <Defs id={id} />
      <rect width="400" height="250" fill={`url(#${id}-bg)`} />
      <circle cx="320" cy="40" r="90" fill={SKY} opacity="0.2" />
      <g filter={`url(#${id}-sh)`} transform="translate(140 128)">
        <circle r="70" fill={`url(#${id}-navy)`} />
        <path d="M0 0 L0 -70 A70 70 0 0 1 66.6 -21.6 Z" fill={`url(#${id}-blue)`} />
        <path d="M0 0 L66.6 -21.6 A70 70 0 0 1 41 56.6 Z" fill={SKY} />
        <circle r="30" fill="#F4F8FD" />
      </g>
      {[
        { x: 252, h: 50 },
        { x: 284, h: 78 },
        { x: 316, h: 108 },
      ].map((b, i) => (
        <rect key={b.x} x={b.x} y={196 - b.h} width="22" height={b.h} rx="8" fill={i === 2 ? `url(#${id}-blue)` : `url(#${id}-navy)`} filter={`url(#${id}-sh)`} />
      ))}
    </svg>
  );
}

export function EducationArt({ className }: { className?: string }) {
  const id = "ed";
  return (
    <svg viewBox="0 0 400 250" className={className} aria-hidden>
      <Defs id={id} />
      <rect width="400" height="250" fill={`url(#${id}-bg)`} />
      <circle cx="80" cy="50" r="90" fill={SKY} opacity="0.2" />
      <g filter={`url(#${id}-sh)`}>
        <rect x="110" y="172" width="180" height="26" rx="8" fill={`url(#${id}-navy)`} />
        <rect x="124" y="148" width="160" height="26" rx="8" fill={`url(#${id}-blue)`} />
        <rect x="116" y="124" width="170" height="26" rx="8" fill="#fff" />
        <rect x="128" y="133" width="90" height="6" rx="3" fill={NAVY} opacity="0.15" />
      </g>
      <g filter={`url(#${id}-sh)`}>
        <path d="M200 58 L282 90 L200 122 L118 90 Z" fill={`url(#${id}-navy)`} />
        <path d="M160 106 L160 128 C 160 140, 240 140, 240 128 L240 106 L200 122 Z" fill="#22385A" />
        <path d="M282 90 L282 128" stroke={BLUE} strokeWidth="3" strokeLinecap="round" />
        <circle cx="282" cy="132" r="6" fill={BLUE} />
      </g>
      <path d="M300 110 l18 -20 l14 10 l22 -30" fill="none" stroke={BLUE} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CommunityArt({ className }: { className?: string }) {
  const id = "cm";
  const nodes = [
    [90, 80, 22, "blue"],
    [310, 70, 20, "navy"],
    [80, 185, 18, "navy"],
    [320, 180, 24, "blue"],
    [200, 40, 14, "sky"],
  ] as const;
  const fill = (c: string) => (c === "blue" ? `url(#${id}-blue)` : c === "navy" ? `url(#${id}-navy)` : SKY);
  return (
    <svg viewBox="0 0 400 250" className={className} aria-hidden>
      <Defs id={id} />
      <rect width="400" height="250" fill={`url(#${id}-bg)`} />
      <circle cx="200" cy="125" r="110" fill={SKY} opacity="0.15" />
      <g stroke={BLUE} strokeOpacity="0.45" strokeWidth="2" strokeDasharray="4 6">
        {nodes.map(([x, y]) => (
          <line key={`${x}-${y}`} x1="200" y1="125" x2={x} y2={y} />
        ))}
      </g>
      {nodes.map(([x, y, r, c]) => (
        <g key={`n${x}`} filter={`url(#${id}-sh)`}>
          <circle cx={x} cy={y} r={r} fill={fill(c)} />
          <circle cx={x} cy={y - r * 0.25} r={r * 0.32} fill="#fff" opacity="0.85" />
          <path d={`M${x - r * 0.5} ${y + r * 0.55} a${r * 0.5} ${r * 0.42} 0 0 1 ${r} 0`} fill="#fff" opacity="0.85" />
        </g>
      ))}
      <g filter={`url(#${id}-sh)`}>
        <circle cx="200" cy="125" r="40" fill={`url(#${id}-glass)`} stroke="#fff" strokeWidth="2" />
        <circle cx="200" cy="125" r="18" fill={`url(#${id}-blue)`} />
      </g>
    </svg>
  );
}
