import React, { useMemo } from "react";
import { familyLabel } from "./labels";

/* ===========================================================================
   THE CLIMB — daylight ascent

   WORDS. Every label on this map is the phrase a person would actually say.
   The deck's own family names are an internal taxonomy — "Handheld", "Feel",
   "Room", "Constraint" — and a map covered in words the reader has to decode
   is a quiz, not a map. Names come from labels.js so the map, the collection
   strip and the measuring line can never drift apart.

   LAYOUT. Markers carry a CARD, not floating text: name, count, and a filled
   bar showing how far into that region you are. Floating text left the canvas
   mostly air and said very little per pixel; a card has visual mass, fills
   the width the trail leaves empty, and shows progress per region instead of
   just naming it.

   ONE SCREEN, NO SCROLLING. A beginner and a veteran both see their whole
   climb at once. You cannot feel ownership over something you have to scroll
   to assemble in your head.

   LIGHT, NOT DARK. Real mist is bright. On a dark canvas "shrouded" and
   "empty" render identically, which made the one object meant to nag at you
   the hardest thing to see.

   TWO GRADIENTS, NO MORE.
     INDIGO -> CYAN    you. The climber, and the rings breathing off it.
     MAGENTA -> EMBER  the world you crossed: trail and earned markers.
   Everything else is desaturated atmosphere.

   MOTION IS THE DOPAMINE LAYER: the climber breathes 98%-102%, rings pulse
   outward, a spark runs the earned trail, the next marker pings because
   near-completion pulls hardest, and the mist drifts so hidden regions keep
   re-catching the eye.
   =========================================================================== */

const W = 380;
const H = 540;
const TOP = 130;      // clears the summit signage; cards used to sit on it
const BASE = 484;
const NODE_DX = 24;   // gentler switchback buys width for the cards
const CARD_W = 142;   // leaves a 12px margin each side of the canvas
const CARD_H = 38;

/* Named bands of the ascent. The label carries the flavour; the note is plain
   so it explains rather than decorates. */
const ZONES = [
  { at: 0,   name: "Base camp",    note: "Just getting started." },
  { at: 12,  name: "The treeline", note: "We're learning your taste." },
  { at: 40,  name: "The ridge",    note: "Your taste is taking shape." },
  { at: 90,  name: "The fog line", note: "We know you pretty well now." },
  { at: 180, name: "High ground",  note: "Few people map this much." },
  { at: 320, name: "The summit",   note: "Almost nothing left to learn." },
];

export function zoneFor(discovered) {
  let z = ZONES[0];
  for (const c of ZONES) if (discovered >= c.at) z = c;
  return z;
}

function hashUnit(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/* Everything fits one canvas, so the list is capped and the remainder is
   summarised at the base rather than silently dropped. */
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

  /* A strict zigzag rather than a sine wave. A sine of any period can put two
     consecutive stops on the same side, and two cards stacked on one side is
     exactly where they collided. Switchbacks are also what a real trail on a
     steep face looks like. */
  const placed = stops.map((s, i) => {
    const right = i % 2 === 0;
    const y = BASE - i * gap;
    return {
      ...s, i, y,
      x: W / 2 + (right ? NODE_DX : -NODE_DX),
      side: right ? "right" : "left",
      cardX: right ? W / 2 + NODE_DX + 12 : W / 2 - NODE_DX - 12 - CARD_W,
      jitter: hashUnit(s.family),
    };
  });

  const climbedCount = climbed.length;

  /* On day one nothing is climbed, and Math.max(0, -1) resolved to placed[0]
     — which is then a FOGGED stop, so a new user stood inside locked ground.
     With nothing earned the climber belongs at the trailhead. */
  const you = climbedCount > 0 ? placed[climbedCount - 1] : { x: W / 2, y: BASE + 16 };
  const fogEdge = placed[climbedCount] ? (placed[climbedCount].y + you.y) / 2 : you.y - 26;

  return { placed, you, fogEdge, climbedCount, belowCount, hiddenTotal, hiddenRegions: hiddenAll.length };
}

function pathThrough(pts, fromBase) {
  if (!pts.length) return "";
  let d = fromBase ? `M ${W / 2} ${BASE + 22} L ${pts[0].x} ${pts[0].y}` : `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1], b = pts[i];
    const my = (a.y + b.y) / 2;
    d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
  }
  return d;
}

/* Tiny conifers on the near ridge. Pure scale cue — they make the terrain
   read as land rather than as an abstract band, and they occupy width the
   trail leaves empty. Same desaturated indigo as the ridge so they never
   compete with the two real gradients. */
const TREES = [22, 54, 78, 112, 268, 300, 322, 352].map((x, i) => ({
  x, h: 13 + (i % 3) * 4, y: 432 + ((i * 7) % 11),
}));

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
        <div className="climb-score">
          <span className="climb-score-n">{discovered.toLocaleString()}</span>
          <span className="climb-score-k">foods rated</span>
        </div>
      </div>

      <svg className="climb-svg" viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Your climb: ${discovered} of ${totalCards} foods rated, currently at ${zone.name}. ${hiddenRegions} areas still hidden.`}>
        <defs>
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
          <linearGradient id="clPath" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ff2e88" />
            <stop offset="100%" stopColor="#ff7a2f" />
          </linearGradient>
          <linearGradient id="clBar" x1="0" y1="0" x2="1" y2="0">
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

          <linearGradient id="clFog" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="22%" stopColor="#fbfcff" stopOpacity="0.8" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.94" />
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
        <path className="climb-ridge" d="M -20 540 L -20 236 C 62 176, 112 254, 172 200 C 234 144, 302 236, 400 182 L 400 540 Z"
              fill="#c5d0ec" opacity="0.55" />
        <path className="climb-ridge" d="M -20 540 L -20 312 C 72 250, 130 322, 198 278 C 270 230, 332 314, 400 264 L 400 540 Z"
              fill="#aebbe0" opacity="0.6" />
        <path className="climb-ridge" d="M -20 540 L -20 424 C 82 372, 152 436, 216 402 C 290 364, 338 426, 400 394 L 400 540 Z"
              fill="#94a3d1" opacity="0.55" />

        {TREES.map((t, i) => (
          <path key={i} className="climb-tree"
                d={`M ${t.x} ${t.y} L ${t.x + t.h * 0.42} ${t.y + t.h} L ${t.x - t.h * 0.42} ${t.y + t.h} Z`} />
        ))}

        {/* ---- trail ---- */}
        <path className="climb-ahead" d={pathThrough(aheadPts, false)} />
        <path className="climb-earned" d={pathThrough(climbedPts, true)} />
        <path id="clEarned" d={pathThrough(climbedPts, true)} fill="none" stroke="none" />
        {climbedCount > 1 && (
          <circle className="climb-spark" r="3.2">
            <animateMotion dur="5.5s" repeatCount="indefinite"><mpath href="#clEarned" /></animateMotion>
          </circle>
        )}

        {/* ---- earned stops: marker + card ---- */}
        {placed.filter((s) => s.state === "climbed").map((s) => {
          const isNew = s.nodes?.some((n) => recent.has(n.id));
          const cy = s.y - CARD_H / 2;
          const pct = s.total ? Math.min(1, s.seen / s.total) : 0;
          return (
            <g className={`climb-stop${isNew ? " climb-stop--new" : ""}`} key={s.family}>
              <line className="climb-tick" x1={s.x} y1={s.y}
                    x2={s.side === "right" ? s.cardX : s.cardX + CARD_W} y2={s.y} />
              <rect className="climb-card" x={s.cardX} y={cy} width={CARD_W} height={CARD_H} rx="9" />
              <text className="climb-card-name" x={s.cardX + 10} y={cy + 15}>
                {clip(familyLabel(s.family), 21)}
              </text>
              <rect className="climb-bar-bg" x={s.cardX + 10} y={cy + 23} width={CARD_W - 56} height="4" rx="2" />
              <rect className="climb-bar" x={s.cardX + 10} y={cy + 23}
                    width={Math.max(3, (CARD_W - 56) * pct)} height="4" rx="2" />
              <text className="climb-card-n" x={s.cardX + CARD_W - 10} y={cy + 28} textAnchor="end">
                {s.seen}/{s.total}
              </text>

              <circle className="climb-node-glow" cx={s.x} cy={s.y} r="24" fill="url(#clNodeGlow)" />
              <circle className="climb-node" cx={s.x} cy={s.y} r="9" fill="url(#clNode)" />
              <circle className="climb-node-ring" cx={s.x} cy={s.y} r="14" />
            </g>
          );
        })}

        {/* ---- mist, with drifting puffs so it reads as weather ---- */}
        <g className="climb-mist">
          <rect x="0" y="0" width={W} height={Math.max(0, fogEdge)} fill="url(#clFog)" />
          {[
            { cx: 84,  cy: 0.34, r: 74, d: "0s",   dur: "17s" },
            { cx: 288, cy: 0.5,  r: 90, d: "-6s",  dur: "21s" },
            { cx: 176, cy: 0.7,  r: 66, d: "-11s", dur: "15s" },
            { cx: 320, cy: 0.18, r: 58, d: "-3s",  dur: "19s" },
          ].map((p, i) => (
            <circle key={i} className="climb-puff" cx={p.cx} cy={Math.max(0, fogEdge) * p.cy}
                    r={p.r} fill="url(#clPuff)"
                    style={{ animationDelay: p.d, animationDuration: p.dur }} />
          ))}
        </g>

        {/* ---- locked stops: drawn ON the mist so they stay readable ---- */}
        {placed.filter((s) => s.state === "fog").map((s) => {
          const cy = s.y - CARD_H / 2;
          return (
            <g className="climb-locked" key={s.family} style={{ animationDelay: `${(s.i % 3) * 0.9}s` }}>
              <line className="climb-tick climb-tick--locked" x1={s.x} y1={s.y}
                    x2={s.side === "right" ? s.cardX : s.cardX + CARD_W} y2={s.y} />
              <rect className="climb-card climb-card--locked" x={s.cardX} y={cy} width={CARD_W} height={CARD_H} rx="9" />
              <text className="climb-card-name climb-card-name--locked" x={s.cardX + 10} y={cy + 15}>
                {clip(familyLabel(s.family), 21)}
              </text>
              <rect className="climb-bar-locked" x={s.cardX + 10} y={cy + 23} width={CARD_W - 56} height="4" rx="2" />
              <text className="climb-card-n climb-card-n--locked" x={s.cardX + CARD_W - 10} y={cy + 28} textAnchor="end">
                0/{s.total}
              </text>

              <circle className="climb-locked-halo" cx={s.x} cy={s.y} r="17" />
              <circle className="climb-locked-ring" cx={s.x} cy={s.y} r="11" />
              <text className="climb-lock" x={s.x} y={s.y + 4} textAnchor="middle">?</text>
            </g>
          );
        })}

        {/* ---- the summit, drawn ON the mist so it breaks through the cloud
             rather than being buried by it ---- */}
        <path className="climb-peak" d={`M ${W / 2} 10 L ${W / 2 + 50} 58 L ${W / 2 - 50} 58 Z`} />
        <path className="climb-peak-cap"
              d={`M ${W / 2} 10 L ${W / 2 + 19} 29 L ${W / 2 + 7} 23 L ${W / 2 - 9} 33 L ${W / 2 - 19} 29 Z`} />

        {/* ---- signposts, so nothing needs a legend ---- */}
        <text className="climb-tag climb-tag--fog" x={W / 2} y={76} textAnchor="middle">
          HAVEN&apos;T TRIED THESE YET
        </text>
        {hiddenTotal > 0 && (
          <text className="climb-tag-sub" x={W / 2} y={92} textAnchor="middle">
            {hiddenTotal.toLocaleString()} foods waiting up here
          </text>
        )}
        <text className="climb-tag climb-tag--base" x={W / 2} y={H - 8} textAnchor="middle">
          {belowCount > 0 ? `WHERE YOU BEGAN · ${belowCount} more behind you` : "WHERE YOU BEGAN"}
        </text>

        {/* ---- the next marker pings: near-completion pulls hardest ---- */}
        {nextStop && nextStop.state === "climbed" && (
          <circle className="climb-next-ping" cx={nextStop.x} cy={nextStop.y} r="16" />
        )}

        {/* ---- the climber, last so nothing covers you ---- */}
        <g className="climb-you">
          <circle cx={you.x} cy={you.y} r="38" fill="url(#clYouGlow)" />
          <circle className="climb-ping" cx={you.x} cy={you.y} r="15" />
          <circle className="climb-ping climb-ping--b" cx={you.x} cy={you.y} r="15" />
          <circle className="climb-you-core" cx={you.x} cy={you.y} r="10" fill="url(#clYou)" />
          <text className="climb-youtag" x={you.x} y={you.y - 24} textAnchor="middle">YOU&apos;RE HERE</text>
        </g>
      </svg>

      <div className="climb-foot">
        <p className="climb-next">
          {nextStop
            ? <>Up next: <strong>{familyLabel(nextStop.family)}</strong>{nextStop.state === "fog"
                ? " — nothing rated here yet" : ` — ${nextStop.total - nextStop.seen} left to try`}</>
            : <>You&apos;ve rated something in every area.</>}
        </p>
        <p className="climb-legend">
          <span className="climb-legend-you" /> you
          <span className="climb-legend-sep" />
          <span className="climb-legend-done" /> rated
          <span className="climb-legend-sep" />
          <span className="climb-legend-fog" /> not yet
          <span className="climb-legend-sep" />
          <strong>{discovered}</strong> of {totalCards.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
