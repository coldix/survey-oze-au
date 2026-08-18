import { useState } from 'react';
import { PARTY_COLORS, PARTY_KEYS, PARTY_LABELS } from '../lib/poll-math';
import type { ContestPies } from '../lib/poll-results';

type Slice = { key: string; label: string; short?: string; color: string; value: number; start: number; end: number; sweep: number };

function buildSlices(items: { key: string; label: string; short?: string; color: string; value: number }[]): Slice[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!(total > 0)) return [];
  let angle = -90;
  return items
    .filter((item) => item.value > 0)
    .map((item) => {
      const sweep = (item.value / total) * 360;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      return { ...item, start, end, sweep };
    });
}

function ellipsePoint(cx: number, cy: number, rx: number, ry: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + rx * Math.cos(rad), y: cy + ry * Math.sin(rad) };
}

function pie3d(slices: Slice[]) {
  const rx = 150;
  const ry = 78;
  const depth = 22;
  const cx = 180;
  const cy = 100;
  const sides: { d: string; color: string; mid: number }[] = [];
  for (const slice of slices) {
    const steps = Math.max(4, Math.ceil(slice.sweep / 6));
    const ptsTop: { x: number; y: number }[] = [];
    const ptsBot: { x: number; y: number }[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const a = slice.start + (slice.sweep * i) / steps;
      const p = ellipsePoint(cx, cy, rx, ry, a);
      if (p.y >= cy - 1) {
        ptsTop.push(p);
        ptsBot.push({ x: p.x, y: p.y + depth });
      }
    }
    if (ptsTop.length >= 2) {
      const topLine = ptsTop.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      const botLine = [...ptsBot].reverse().map((p) => `L ${p.x} ${p.y}`).join(' ');
      sides.push({ d: `${topLine} ${botLine} Z`, color: slice.color, mid: (slice.start + slice.end) / 2 });
    }
  }
  sides.sort((a, b) => Math.sin((a.mid * Math.PI) / 180) - Math.sin((b.mid * Math.PI) / 180));
  const tops = slices.map((slice) => {
    const s = ellipsePoint(cx, cy, rx, ry, slice.start);
    const e = ellipsePoint(cx, cy, rx, ry, slice.end);
    const large = slice.end - slice.start > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${s.x} ${s.y} A ${rx} ${ry} 0 ${large} 1 ${e.x} ${e.y} Z`;
    const mid = (slice.start + slice.end) / 2;
    const lp = ellipsePoint(cx, cy, rx * 0.42, ry * 0.5, mid);
    return { ...slice, d, labelX: lp.x, labelY: lp.y, showLabel: slice.sweep >= 18 };
  });
  return { sides, tops, width: 360, height: 210, cx, cy };
}

function fmt(n: number) {
  return n.toFixed(1);
}

function Pie({ slices, uid }: { slices: Slice[]; uid: string }) {
  const pie = pie3d(slices);
  return (
    <svg className="pie-svg" viewBox={`0 0 ${pie.width} ${pie.height}`} role="img">
      <g>
        {pie.sides.map((side) => (
          <path key={`${uid}-s-${side.mid}`} d={side.d} fill={side.color} opacity="0.78" />
        ))}
        {pie.tops.map((top) => (
          <path key={`${uid}-t-${top.key}`} d={top.d} fill={top.color} stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
        ))}
      </g>
      {pie.tops.map((top) =>
        top.showLabel ? (
          <text key={`${uid}-l-${top.key}`} x={top.labelX} y={top.labelY} textAnchor="middle" dominantBaseline="middle" className="pie-label">
            {fmt(top.value)}%
          </text>
        ) : null,
      )}
    </svg>
  );
}

function Legend({ slices }: { slices: Slice[] }) {
  return (
    <ul className="chart-legend">
      {slices.map((slice) => (
        <li key={slice.key}>
          <span className="swatch" style={{ background: slice.color }} />
          <span>{slice.short ? <><strong>{slice.short}</strong><span className="muted"> {slice.label}</span></> : slice.label}</span>
          <span className="mono">{fmt(slice.value)}%</span>
        </li>
      ))}
    </ul>
  );
}

export default function PollPies({ title, contest, prefix }: { title: string; contest: ContestPies; prefix: string }) {
  const primaryItems = PARTY_KEYS.map((key) => ({
    key,
    label: PARTY_LABELS[key],
    color: PARTY_COLORS[key],
    value: contest.primaries[key],
  }));
  const primary = buildSlices(primaryItems);
  const three = buildSlices([
    { key: 'left', label: 'Labor + Greens', short: 'Left bloc', color: '#B01E3A', value: contest.blocs.core.left },
    { key: 'right', label: 'Coalition + One Nation', short: 'Right bloc', color: '#1A4A8C', value: contest.blocs.core.right },
    { key: 'other', label: 'Others', short: 'Others', color: '#6E6E7A', value: contest.blocs.core.other },
  ]);
  const two = buildSlices([
    { key: 'left', label: 'Labor + Greens', short: 'Left bloc', color: '#B01E3A', value: contest.blocs.other_split_proportional.left },
    { key: 'right', label: 'Coalition + One Nation', short: 'Right bloc', color: '#1A4A8C', value: contest.blocs.other_split_proportional.right },
  ]);

  if (contest.n === 0) {
    return (
      <section className="glass">
        <h2>{title}</h2>
        <p className="lede">No enrolled responses in this slice yet.</p>
      </section>
    );
  }

  const [view, setView] = useState<'p' | '3' | '2'>('p');
  return (
    <section className="glass poll-block">
      <h2>{title}</h2>
      <p className="lede">{contest.n} enrolled {contest.n === 1 ? 'response' : 'responses'}. Primary vote only — not a 2PP or a forecast.</p>
      <div className="chart-tabs">
        <button type="button" className={view === 'p' ? 'chart-tab on' : 'chart-tab'} onClick={() => setView('p')}>Primary vote</button>
        <button type="button" className={view === '3' ? 'chart-tab on' : 'chart-tab'} onClick={() => setView('3')}>Left / Right + Others</button>
        <button type="button" className={view === '2' ? 'chart-tab on' : 'chart-tab'} onClick={() => setView('2')}>Left / Right (Others split)</button>
      </div>
      {view === 'p' && (
        <div className="chart-grid">
          <Pie slices={primary} uid={`${prefix}-p`} />
          <Legend slices={primary} />
        </div>
      )}
      {view === '3' && (
        <div className="chart-grid">
          <Pie slices={three} uid={`${prefix}-3`} />
          <div>
            <Legend slices={three} />
            <p className="muted">Left = Labor + Greens. Right = Coalition + One Nation. Others stay unallocated.</p>
          </div>
        </div>
      )}
      {view === '2' && (
        <div className="chart-grid">
          <Pie slices={two} uid={`${prefix}-2`} />
          <div>
            <Legend slices={two} />
            <p className="muted">
              Others ({fmt(contest.blocs.core.other)}%) split in proportion to the two blocs — not preference flows.
              Left +{fmt(contest.blocs.other_split_proportional.left_from_other)} pp · Right +{fmt(contest.blocs.other_split_proportional.right_from_other)} pp.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
