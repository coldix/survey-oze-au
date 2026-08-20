import { PIE_COLORS, PIE_LABELS, PICK_PARTIES, type PieKey, type PieShares } from '../lib/issues-math';

const ORDER: PieKey[] = [...PICK_PARTIES, 'nopick'];

function slices(shares: PieShares) {
  const total = ORDER.reduce((sum, key) => sum + shares[key], 0) || 1;
  let angle = -90;
  return ORDER.map((key) => {
    const value = shares[key];
    const sweep = (value / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return { key, value, start, end, sweep, color: PIE_COLORS[key], label: PIE_LABELS[key] };
  }).filter((slice) => slice.sweep > 0.4);
}

function arc(cx: number, cy: number, r: number, start: number, end: number) {
  const to = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };
  const [x1, y1] = to(start);
  const [x2, y2] = to(end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

export default function IssuesPicksPie({ shares, title }: { shares: PieShares; title: string }) {
  const items = slices(shares);
  return (
    <div className="chart-grid">
      <svg className="pie-svg" viewBox="0 0 240 240" role="img" aria-label={title}>
        {items.map((slice) => (
          <path
            key={slice.key}
            d={arc(120, 120, 104, slice.start, slice.end)}
            fill={slice.color}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.2"
            style={{ transition: 'd 400ms ease' }}
          />
        ))}
      </svg>
      <ul className="chart-legend">
        {ORDER.map((key) => (
          <li key={key}>
            <span className="swatch" style={{ background: PIE_COLORS[key] }} />
            <span>{PIE_LABELS[key]}</span>
            <span className="mono">{Math.round(shares[key] * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
