import React, { useMemo, useRef, useEffect } from "react";

/* ===========================================================================
   THE CLIMB — the star of the app

   A vertical ascent, not a constellation. The change is not cosmetic; it is
   the difference between a picture that needs decoding and one that needs
   none.

   WHY VERTICAL BEATS RADIAL HERE

   A node web asks two questions before it says anything: what does a line
   mean, and where am I supposed to look? A trail going up answers both before
   you have finished looking at it. Up is progress. Fog is unknown. The
   pulsing dot is you. Nobody has ever needed that explained.

   It also recruits something a constellation cannot: GRAVITY. Height is a
   possession. Stopping does not merely pause a counter, it abandons a climb —
   and losses loom about twice as large as equivalent gains (Kahneman &
   Tversky, 1979). This is the same reason a Duolingo path outperforms a bare
   streak number: the progress is spatial, so quitting has a direction.

   FOG OF WAR carries the curiosity load. Unclimbed ground is not omitted, it
   is shrouded, named, and counted — "Raw & Cold, 13 hidden". An absent thing
   creates no tension; a named thing you cannot see inside creates a lot, and
   pointed at the self it creates the most. The labels stay honest: real
   families, real counts. Inventing a mysterious zone would work exactly once.

   DENSITY IS THE RECEIPT. A day-one climber sits at base camp with one lit
   marker. A month-in climber has a trail of them running off the bottom of
   the screen. That accumulated distance is what makes leaving expensive — not
   a punishment, but the IKEA effect: we overvalue what we assembled.

   COLOUR follows the house rule exactly. The climber is COOL because the
   climber is you. The trail, the markers, the terrain are WARM because they
   are the world you moved through. Fog is a desaturated violet-black so it
   reads as absence of information rather than as another material.
   =========================================================================== */

const W = 360;                 // viewBox width; height is derived from stops
const STEP = 118;              // vertical distance between markers
const BOTTOM_PAD = 90;
const TOP_PAD = 150;
const SWAY = 74;               // how far the trail wanders off centre

/* Named bands of the ascent. Thresholds are counts of cards actually mapped,
   so the label is a description rather than a flourish. */
const ZONES = [
  { at: 0,   name: "Base camp",     note: "You've barely started." },
  { at: 12,  name: "The treeline",  note: "Shapes are appearing." },
  { at: 40,  name: "The ridge",     note: "Your outline is holding." },
  { at: 90,  name: "The fog line",  note: "This is where it gets interesting." },
  { at: 180, name: "High ground",   note: "Few people get here." },
  { at: 320, name: "The summit",    note: "Almost nothing left hidden." },
];

export function zoneFor(discovered) {
  let z = ZONES[0];
  for (const cand of ZONES) if (discovered >= cand.at) z = cand;
  return z;
}

/* Elevation is a presentation of real progress, not an invented number:
   forty metres per card actually mapped. */
export const metresFor = (discovered) => Math.round((discovered || 0) * 40);

function hashUnit(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i += 1) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/* Markers run bottom-to-top: climbed ground below, the live one at the
   climber, fogged ground above. */
function buildTrail(regions) {
  const all = regions || [];
  const climbed = all
    .filter((r) => r.seen > 0)
    .sort((a, b) => a.seen - b.seen);          // least explored nearest the top
  const locked = all
    .filter((r) => r.seen === 0 && r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const stops = [
    ...climbed.map((r) => ({ ...r, state: "climbed" })),
    ...locked.map((r) => ({ ...r, state: "fogged" })),
  ];

  const height = BOTTOM_PAD + TOP_PAD + Math.max(1, stops.length - 1) * STEP;

  const placed = stops.map((s, i) => {
    const y = height - BOTTOM_PAD - i * STEP;
    // A steady serpentine, nudged per-family so it never looks machined.
    const x = W / 2 + Math.sin(i * 0.85) * SWAY * (0.72 + hashUnit(s.family) * 0.4);
    return { ...s, x, y, i };
  });

  // The climber stands on the last climbed marker.
  const climbedCount = climbed.length;
  const you = placed[Math.max(0, climbedCount - 1)] || { x: W / 2, y: height - BOTTOM_PAD };
  const fogTop = placed[climbedCount] ? placed[climbedCount].y + STEP * 0.55 : you.y - 40;

  return { placed, height, you, fogTop, climbedCount };
}

/* Smooth serpentine through the markers. Straight segments read as a chart;
   a curve reads as terrain. */
function trailPath(placed, height) {
  if (placed.length === 0) return "";
  let d = `M ${W / 2} ${height - 20} L ${placed[0].x} ${placed[0].y}`;
  for (let i = 1; i < placed.length; i += 1) {
    const a = placed[i - 1];
    const b = placed[i];
    const my = (a.y + b.y) / 2;
    d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
  }
  return d;
}

export default function TasteMap({ regions, discovered = 0, totalCards = 1446, recentIds = [] }) {
  const scroller = useRef(null);
  const { placed, height, you, fogTop, climbedCount } = useMemo(() => buildTrail(regions), [regions]);
  const recent = useMemo(() => new Set(recentIds || []), [recentIds]);
  const zone = zoneFor(discovered);

  /* Open on the climber, the way a map app opens on your position. Seeing the
     ground you already covered running off the bottom of the screen is the
     whole reward. */
  /* The SVG scales to the container width, so its laid-out height is not known
     on the first commit. A fixed retry window guessed wrong — the height
     settled after the retries had expired and the view stayed pinned to the
     top, which is the one place the climber never is. Observing the element
     removes the guess: reposition whenever it actually gets a height, then
     stop watching.

     Note the assignment is direct. scrollTo({behavior:"smooth"}) is silently a
     no-op in some engines, and a CSS scroll-behavior of smooth on the
     container swallows the assignment the same way. Opening straight at your
     position is the right behaviour regardless — map apps do not animate to
     your location, they start there. */
  useEffect(() => {
    const box = scroller.current;
    if (!box) return undefined;

    let done = false;
    const place = () => {
      if (done || !scroller.current) return;
      const el = scroller.current;
      if (el.scrollHeight <= el.clientHeight + 4) return;
      el.scrollTop = Math.max(0, (you.y / height) * el.scrollHeight - el.clientHeight * 0.58);
      done = true;
      observer?.disconnect();
    };

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    observer?.observe(box);
    place();
    const t = setTimeout(place, 400); // belt and braces where RO is unavailable

    return () => { clearTimeout(t); observer?.disconnect(); };
  }, [you.y, height, climbedCount]);

  if (placed.length === 0) {
    return (
      <div className="climb climb--empty">
        <span className="climb-you-dot" />
        <p className="climb-empty-t">Base camp.</p>
        <p className="climb-empty-s">Answer today's call and the trail starts.</p>
      </div>
    );
  }

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

      <div className="climb-scroll" ref={scroller}>
        <svg className="climb-svg" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMidYMin meet"
             role="img" aria-label={`Climb: ${discovered} of ${totalCards} mapped, at ${zone.name}, ${placed.length - climbedCount} regions still in fog`}>
          <defs>
            <linearGradient id="clSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#140f1e" />
              <stop offset="55%" stopColor="#0f0b16" />
              <stop offset="100%" stopColor="#0a0810" />
            </linearGradient>
            <linearGradient id="clFog" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#0d0b14" stopOpacity="0" />
              <stop offset="26%" stopColor="#0d0b14" stopOpacity="0.72" />
              <stop offset="60%" stopColor="#0d0b14" stopOpacity="0.93" />
              <stop offset="100%" stopColor="#0d0b14" stopOpacity="0.985" />
            </linearGradient>
            <radialGradient id="clGlow">
              <stop offset="0%" stopColor="#7ef5df" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#2ee6d6" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="clWarm">
              <stop offset="0%" stopColor="#ff8a3d" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#ff5f1f" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width={W} height={height} fill="url(#clSky)" />

          {/* ---- terrain: three silhouette layers, far to near ---- */}
          {[
            { op: 0.16, amp: 46, freq: 0.9, off: 0, fill: "#211a2e" },
            { op: 0.26, amp: 66, freq: 0.62, off: 40, fill: "#1a1426" },
            { op: 0.4,  amp: 92, freq: 0.44, off: 96, fill: "#141020" },
          ].map((layer, li) => {
            const pts = [];
            const rows = Math.ceil(height / 60) + 2;
            for (let i = 0; i <= rows; i += 1) {
              const y = height - i * 60;
              const x = (li % 2 ? 1 : -1) * Math.sin(i * layer.freq + li) * layer.amp
                + (li === 0 ? W * 0.28 : li === 1 ? W * 0.74 : W * 0.14) + layer.off * 0.2;
              pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
            }
            const edge = li === 1 ? W + 60 : -60;
            return (
              <polygon key={li} className="climb-ridge"
                       points={`${edge},${height} ${pts.join(" ")} ${edge},0`}
                       fill={layer.fill} opacity={layer.op} />
            );
          })}

          {/* ---- the trail ---- */}
          <path className="climb-trail" d={trailPath(placed, height)} />
          <path className="climb-trail-lit" d={trailPath(placed.slice(0, climbedCount), height)} />

          {/* a signal running the climbed section, so the path reads as live */}
          {climbedCount > 1 && (
            <>
              <path id="clLit" d={trailPath(placed.slice(0, climbedCount), height)} fill="none" />
              <circle className="climb-spark" r="3">
                <animateMotion dur="6s" repeatCount="indefinite">
                  <mpath href="#clLit" />
                </animateMotion>
              </circle>
            </>
          )}

          {/* ---- markers ---- */}
          {placed.map((s) => {
            const isNext = s.i === climbedCount;
            const isNew = s.nodes?.some((n) => recent.has(n.id));
            if (s.state === "fogged") {
              return (
                <g className="climb-stop climb-stop--fog" key={s.family}
                   style={{ animationDelay: `${(s.i % 4) * 0.8}s` }}>
                  <circle className="climb-ring-fog" cx={s.x} cy={s.y} r="17" />
                  <text className="climb-q" x={s.x} y={s.y + 5} textAnchor="middle">?</text>
                  <text className="climb-name climb-name--fog" x={s.x} y={s.y + 36} textAnchor="middle">{s.family}</text>
                  <text className="climb-sub climb-sub--fog" x={s.x} y={s.y + 52} textAnchor="middle">{s.total} hidden</text>
                </g>
              );
            }
            return (
              <g className={`climb-stop${isNext ? " climb-stop--next" : ""}${isNew ? " climb-stop--new" : ""}`} key={s.family}>
                <circle className="climb-halo" cx={s.x} cy={s.y} r="30" fill="url(#clWarm)" />
                <circle className="climb-ring" cx={s.x} cy={s.y} r="15" />
                <circle className="climb-core" cx={s.x} cy={s.y} r="6" />
                <text className="climb-name" x={s.x} y={s.y + 34} textAnchor="middle">{s.family}</text>
                <text className="climb-sub" x={s.x} y={s.y + 50} textAnchor="middle">{s.seen}/{s.total}</text>
              </g>
            );
          })}

          {/* ---- fog sheet over everything not yet climbed ---- */}
          <rect className="climb-fog" x="0" y="0" width={W} height={Math.max(0, fogTop)} fill="url(#clFog)" />

          {/* ---- the climber, drawn last so nothing covers you ---- */}
          <g className="climb-you">
            <circle cx={you.x} cy={you.y} r="34" fill="url(#clGlow)" />
            <circle className="climb-you-core" cx={you.x} cy={you.y} r="8" />
          </g>
        </svg>
      </div>

      <div className="climb-foot">
        {nextStop ? (
          <p className="climb-next">
            Next: <strong>{nextStop.family}</strong>
            {nextStop.state === "fogged" ? " — still in the fog" : ` — ${nextStop.total - nextStop.seen} left`}
          </p>
        ) : (
          <p className="climb-next">Everything in range is mapped.</p>
        )}
        <p className="climb-legend">
          <span className="climb-legend-i" /> you
          <span className="climb-legend-sep" />
          <strong>{discovered}</strong> of {totalCards} mapped
        </p>
      </div>
    </div>
  );
}
