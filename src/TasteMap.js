import React, { useMemo } from "react";

/* ===========================================================================
   THE CLIMB — daylight ascent

   Built to the brief, point by point.

   WHOLE MOUNTAIN, ONE SCREEN. No scrolling. The trail is a fixed canvas and
   the stops distribute along it, so a beginner and a veteran both see their
   entire climb at a glance. You cannot feel ownership over something you have
   to scroll to assemble in your head.

   LIGHT, NOT DARK. Dark fog is a contradiction — real mist is bright, and on
   a dark canvas "hidden" and "empty" look identical. On a luminous sky, fog
   becomes the most visible object on screen, which is exactly right: it is
   the thing meant to nag at you.

   TWO GRADIENTS, NO MORE.
     INDIGO -> CYAN   is you. The climber, and the rings breathing off it.
     MAGENTA -> EMBER is the world you have crossed: trail and earned markers.
   Nothing else gets a hue. Flat fills, neon, and a third gradient are all
   ways to make a screen louder and less legible at the same time.

   SELF-EXPLANATORY. Nothing here needs a key: "YOU ARE HERE" is written on
   the climber, the fog says UNDISCOVERED across it, the base says where you
   started, and the summit is drawn as a peak. Up is progress — the one
   spatial metaphor nobody has to be taught.

   MOTION AS DOPAMINE, per the brief: the climber breathes 98%-102%, rings
   pulse outward off it, a spark runs the earned trail, the next marker
   glows because near-completion is the strongest pull in the stack, and the
   mist drifts so the hidden regions keep catching the eye.
   =========================================================================== */

const W = 380;
const H = 560;
const TOP = 128;      // first stop sits clear of the summit signage
const BASE = 508;     // where the trail starts
const SWAY = 66;

const ZONES = [
  { at: 0,   name: "Base camp",    note: "You've barely started." },
  { at: 12,  name: "The treeline", note: "Shapes are appearing." },
  { at: 40,  name: "The ridge",    note: "Your outline is holding." },
  { at: 90,  name: "The fog line", note: "This is where it gets interesting." },
  { at: 180, name: "High ground",  note: "Few people get this far." },
  { at: 320, name: "The summit",   note: "Almost nothing left hidden." },
];

export function zoneFor(discovered) {
  let z = ZONES[0];
  for (const c of ZONES) if (discovered >= c.at) z = c;
  return z;
}
export const metresFor = (d) => Math.round((d || 0) * 40);

function hashUnit(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

/* Everything fits one canvas, so the list is capped and the remainder is
   summarised at the base rather than silently dropped.
   Eleven stops crammed into the canvas put ~37 units between markers and
   produced eleven overlapping labels; eight leaves ~59 and reads cleanly. */
const MAX_CLIMBED = 5;
const MAX_FOG = 3;

function buildTrail(regions) {
  const all = regions || [];
  const climbedAll = all.filter((r) => r.seen > 0).sort((a, b) => a.seen - b.seen);
  const hiddenAll = all.filter((r) => r.seen === 0 && r.total > 0).sort((a, b) => b.total - a.total);

  const climbed = climbedAll.slice(-MAX_CLIMBED);
  const belowCount = climbedAll.length - climbed.length;
  const fog = hiddenAll.slice(0, MAX_FOG);
  const hiddenTotal = hiddenAll.reduce((s, r) => s + r.total, 0);

  const stops = [
    ...climbed.map((r) => ({ ...r, state: "climbed" })),
    ...fog.map((r) => ({ ...r, state: "fog" })),
  ];

  const n = Math.max(1, stops.length);
  const gap = n > 1 ? (BASE - TOP) / (n - 1) : 0;

  /* A strict zigzag, not a sine wave. A sine with any period can put two
     consecutive stops on the same side, and two labels stacked on one side is
     exactly where they collided. Alternating guarantees a label never has a
     neighbour on its own side — and switchbacks are what a real mountain
     trail looks like anyway. */
  const placed = stops.map((s, i) => {
    const y = BASE - i * gap;
    const lean = 0.72 + hashUnit(s.family) * 0.42;
    const right = i % 2 === 0;
    return {
      ...s, i, y,
      x: W / 2 + (right ? SWAY : -SWAY) * lean,
      side: right ? "right" : "left",
    };
  });

  const climbedCount = climbed.length;

  /* On day one there is nothing climbed, and Math.max(0, -1) put the climber
     on placed[0] — which in that case is a FOGGED stop, so a brand-new user
     saw themselves standing inside locked ground. With nothing earned the
     climber belongs at the trailhead. */
  const you = climbedCount > 0
    ? placed[climbedCount - 1]
    : { x: W / 2, y: BASE + 14 };
  const fogEdge = placed[climbedCount] ? (placed[climbedCount].y + you.y) / 2 : you.y - 26;

  return { placed, you, fogEdge, climbedCount, belowCount, hiddenTotal, hiddenRegions: hiddenAll.length };
}

function pathThrough(pts, fromBase) {
  if (!pts.length) return "";
  let d = fromBase ? `M ${W / 2} ${BASE + 14} L ${pts[0].x} ${pts[0].y}` : `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1], b = pts[i];
    const my = (a.y + b.y) / 2;
    d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
  }
  return d;
}

export default function TasteMap({ regions, discovered = 0, totalCards = 1446, recentIds = [] }) {
  const { placed, you, fogEdge, climbedCount, belowCount, hiddenTotal, hiddenRegions } =
    useMemo(() => buildTrail(regions), [regions]);
  const recent = useMemo(() => new Set(recentIds || []), [recentIds]);
  const zone = zoneFor(discovered);

  const climbedPts = placed.slice(0, climbedCount);
  const aheadPts = placed.slice(Math.max(0, climbedCount - 1));
  const nextStop = placed[climbedCount];

  return (
    <div className="climb">
      <div className="climb-hud">
        <div>
          <span className="climb-zone">{zone.name}</span>
          <span className="climb-note">{zone.note}</span>
        </div>
        <div className="climb-elev">
          <span className="climb-elev-n">{metresFor(discovered).toLocaleString()}</span>
          <span className="climb-elev-u">m</span>
        </div>
      </div>

      <svg className="climb-svg" viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Your climb: ${discovered} of ${totalCards} mapped, currently at ${zone.name}. ${hiddenRegions} regions still hidden in fog.`}>
        <defs>
          {/* daylight sky: cool at altitude, warm where you've been */}
          <linearGradient id="clSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbe6fb" />
            <stop offset="46%" stopColor="#eaeefb" />
            <stop offset="78%" stopColor="#fbf1e8" />
            <stop offset="100%" stopColor="#ffeede" />
          </linearGradient>

          {/* GRADIENT 1 — indigo to cyan. You, and nothing else. */}
          <linearGradient id="clYou" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <radialGradient id="clYouGlow">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#4f46e5" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </radialGradient>

          {/* GRADIENT 2 — magenta to ember. The world you crossed. */}
          <linearGradient id="clPath" x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#ff2e88" />
            <stop offset="100%" stopColor="#ff7a2f" />
          </linearGradient>
          <radialGradient id="clNode">
            <stop offset="0%" stopColor="#ff9a4d" />
            <stop offset="55%" stopColor="#ff5f1f" />
            <stop offset="100%" stopColor="#ff2e88" />
          </radialGradient>
          <radialGradient id="clNodeGlow">
            <stop offset="0%" stopColor="#ff7a2f" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#ff2e88" stopOpacity="0" />
          </radialGradient>

          {/* the mist: bright, and the most visible thing on the canvas */}
          <linearGradient id="clFog" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="22%" stopColor="#fbfcff" stopOpacity="0.78" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.93" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.97" />
          </linearGradient>
          <radialGradient id="clPuff">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill="url(#clSky)" />

        {/* ---- layered ridges, far to near ---- */}
        <path className="climb-ridge" d={`M -20 ${H} L -20 250 C 60 190, 110 268, 170 214 C 232 158, 300 250, 400 196 L 400 ${H} Z`}
              fill="#c5d0ec" opacity="0.55" />
        <path className="climb-ridge" d={`M -20 ${H} L -20 320 C 70 258, 128 330, 196 286 C 268 238, 330 322, 400 272 L 400 ${H} Z`}
              fill="#aebbe0" opacity="0.6" />
        <path className="climb-ridge" d={`M -20 ${H} L -20 402 C 80 350, 150 414, 214 380 C 288 342, 336 404, 400 372 L 400 ${H} Z`}
              fill="#94a3d1" opacity="0.55" />

        {/* ---- trail ahead: faint, dashed, unearned ---- */}
        <path className="climb-ahead" d={pathThrough(aheadPts, false)} />

        {/* ---- trail earned: the magenta-to-ember gradient ---- */}
        <path className="climb-earned" d={pathThrough(climbedPts, true)} />
        <path id="clEarned" d={pathThrough(climbedPts, true)} fill="none" stroke="none" />
        {climbedCount > 1 && (
          <circle className="climb-spark" r="3.4">
            <animateMotion dur="5.5s" repeatCount="indefinite">
              <mpath href="#clEarned" />
            </animateMotion>
          </circle>
        )}

        {/* ---- earned markers ---- */}
        {placed.filter((s) => s.state === "climbed").map((s) => {
          const isNew = s.nodes?.some((n) => recent.has(n.id));
          const dx = s.side === "right" ? 26 : -26;
          return (
            <g className={`climb-stop${isNew ? " climb-stop--new" : ""}`} key={s.family}>
              <circle className="climb-node-glow" cx={s.x} cy={s.y} r="26" fill="url(#clNodeGlow)" />
              <circle className="climb-node" cx={s.x} cy={s.y} r="10" fill="url(#clNode)" />
              <circle className="climb-node-ring" cx={s.x} cy={s.y} r="15" />
              <text className="climb-name" x={s.x + dx} y={s.y - 1}
                    textAnchor={s.side === "right" ? "start" : "end"}>{s.family}</text>
              <text className="climb-sub" x={s.x + dx} y={s.y + 17}
                    textAnchor={s.side === "right" ? "start" : "end"}>{s.seen} of {s.total}</text>
            </g>
          );
        })}

        {/* ---- the mist sheet, plus drifting puffs so it reads as weather ---- */}
        <g className="climb-mist">
          <rect x="0" y="0" width={W} height={Math.max(0, fogEdge)} fill="url(#clFog)" />
          {[
            { cx: 90,  cy: 0.34, r: 76, d: "0s",   dur: "17s" },
            { cx: 280, cy: 0.5,  r: 92, d: "-6s",  dur: "21s" },
            { cx: 180, cy: 0.68, r: 68, d: "-11s", dur: "15s" },
            { cx: 320, cy: 0.2,  r: 60, d: "-3s",  dur: "19s" },
          ].map((p, i) => (
            <circle key={i} className="climb-puff" cx={p.cx} cy={Math.max(0, fogEdge) * p.cy}
                    r={p.r} fill="url(#clPuff)"
                    style={{ animationDelay: p.d, animationDuration: p.dur }} />
          ))}
        </g>

        {/* ---- locked regions: drawn ON the mist so they stay readable ---- */}
        {placed.filter((s) => s.state === "fog").map((s) => {
          const dx = s.side === "right" ? 26 : -26;
          return (
            <g className="climb-locked" key={s.family} style={{ animationDelay: `${(s.i % 3) * 0.9}s` }}>
              <circle className="climb-locked-halo" cx={s.x} cy={s.y} r="21" />
              <circle className="climb-locked-ring" cx={s.x} cy={s.y} r="13" />
              <text className="climb-q" x={s.x} y={s.y + 5} textAnchor="middle">?</text>
              <text className="climb-name climb-name--locked" x={s.x + dx} y={s.y - 1}
                    textAnchor={s.side === "right" ? "start" : "end"}>{s.family}</text>
              <text className="climb-sub climb-sub--locked" x={s.x + dx} y={s.y + 17}
                    textAnchor={s.side === "right" ? "start" : "end"}>{s.total} hidden</text>
            </g>
          );
        })}

        {/* ---- the summit, drawn ON the mist so it breaks through the
             cloud rather than being buried by it. A visible goal above the
             weather is worth more than a peak nobody ever sees. ---- */}
        <path className="climb-peak"
              d={`M ${W / 2} 12 L ${W / 2 + 48} 60 L ${W / 2 - 48} 60 Z`} />
        <path className="climb-peak-cap"
              d={`M ${W / 2} 12 L ${W / 2 + 18} 30 L ${W / 2 + 7} 24 L ${W / 2 - 9} 34 L ${W / 2 - 18} 30 Z`} />

        {/* ---- signposting, so nothing needs a legend ---- */}
        <text className="climb-tag climb-tag--fog" x={W / 2} y={80} textAnchor="middle">UNDISCOVERED</text>
        {hiddenTotal > 0 && (
          <text className="climb-tag-sub" x={W / 2} y={96} textAnchor="middle">
            {hiddenTotal.toLocaleString()} still hidden up here
          </text>
        )}
        <text className="climb-tag climb-tag--base" x={W / 2} y={H - 6} textAnchor="middle">
          {belowCount > 0 ? `WHERE YOU STARTED · +${belowCount} more below` : "WHERE YOU STARTED"}
        </text>

        {/* ---- next marker pulses: near-completion is the strongest pull ---- */}
        {nextStop && nextStop.state === "climbed" && (
          <circle className="climb-next-ping" cx={nextStop.x} cy={nextStop.y} r="18" />
        )}

        {/* ---- the climber, last so nothing covers you ---- */}
        <g className="climb-you">
          <circle cx={you.x} cy={you.y} r="42" fill="url(#clYouGlow)" />
          <circle className="climb-ping" cx={you.x} cy={you.y} r="16" />
          <circle className="climb-ping climb-ping--b" cx={you.x} cy={you.y} r="16" />
          <circle className="climb-you-core" cx={you.x} cy={you.y} r="11" fill="url(#clYou)" />
          <text className="climb-youtag" x={you.x} y={you.y - 26} textAnchor="middle">YOU ARE HERE</text>
        </g>
      </svg>

      <div className="climb-foot">
        <p className="climb-next">
          {nextStop
            ? <>Next: <strong>{nextStop.family}</strong>{nextStop.state === "fog"
                ? " — locked in the fog" : ` — ${nextStop.total - nextStop.seen} to go`}</>
            : <>Everything in range is mapped.</>}
        </p>
        <p className="climb-legend">
          <span className="climb-legend-you" /> you
          <span className="climb-legend-sep" />
          <span className="climb-legend-done" /> climbed
          <span className="climb-legend-sep" />
          <span className="climb-legend-fog" /> hidden
          <span className="climb-legend-sep" />
          <strong>{discovered}</strong> of {totalCards}
        </p>
      </div>
    </div>
  );
}
