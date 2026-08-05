import React, { useMemo } from "react";

/* ===========================================================================
   THE TASTE MAP — a living identity network, not geography

   Design brief, and the reasoning behind each part.

   FOG OF WAR.
   Unexplored families are not omitted, they are SHROUDED — named, counted,
   and visibly locked. That distinction is the whole mechanic. An absent
   thing creates no tension; a named thing you cannot see inside creates a
   great deal of it. This is the Zeigarnik effect pointed at the self: people
   tolerate an unfinished task poorly, and an unfinished picture OF THEMSELVES
   worst of all. "Raw & Cold — 13 hidden" is a far stronger reason to come
   back tomorrow than any progress bar, because the missing information is
   about them.

   Crucially the labels are honest. The fog hides real families from the real
   deck with real counts. Inventing a mysterious cluster to bait curiosity
   would work exactly once, and would poison the one thing this product sells.

   CONSTELLATION GROWTH.
   Nodes attach to family hubs, hubs attach to the core, and the core is the
   user. Every answer adds a vertex and an edge, so density IS progression:
   a day-one map is three lonely dots, a month-in map is an illuminated web.
   That accumulated structure is what makes leaving expensive — not because a
   streak counter punishes you, but because you can SEE what you built. The
   IKEA effect: we value what we assemble ourselves far beyond its objective
   worth.

   LIVING MOTION.
   The core breathes (98%–102%), signal particles run the hub edges, and a
   freshly-won node sparks and draws its edge in rather than appearing. Motion
   is what separates "a chart of my data" from "a readout of me". It is also
   strictly ornamental to comprehension — every value here is legible with
   animation disabled, which is what makes honouring prefers-reduced-motion
   costless.

   HUE follows the house rule without exception: the core is COOL because the
   core is you; everything orbiting is WARM because it is the world. Affinity
   is encoded as warmth and brightness, confidence as size, and recency as
   opacity — three independent channels, no legend required.
   =========================================================================== */

const SIZE = 720;
const C = SIZE / 2;
const HUB_R = 162;        // ring the explored family hubs sit on
const MEMBER_MIN = 26;    // members ring their own hub, tightly, so each
const MEMBER_MAX = 46;    // cluster reads as one object rather than a smear
const LABEL_OUT = 66;     // label sits beyond the member ring, radially out
const LOCK_R = 288;       // ring the fogged clusters sit on
const MAX_CLUSTERS = 8;   // beyond this the web turns to soup
const MAX_LOCKED = 7;

function hashUnit(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function tone(affinity) {
  if (affinity == null) return "unknown";
  if (affinity >= 0.7) return "love";
  if (affinity >= 0.5) return "warm";
  if (affinity >= 0.3) return "cool";
  return "cold";
}

/* Deterministic layout. A map that reshuffles between visits is a screensaver,
   not a map — and nothing that rearranges itself can ever feel like yours. */
function layout(regions) {
  const explored = (regions || [])
    .filter((r) => r.seen > 0 && r.nodes?.length)
    .sort((a, b) => b.seen - a.seen)
    .slice(0, MAX_CLUSTERS);

  const locked = (regions || [])
    .filter((r) => r.seen === 0 && r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_LOCKED);

  const step = (Math.PI * 2) / Math.max(1, explored.length);

  const clusters = explored.map((region, i) => {
    const angle = i * step - Math.PI / 2 + (hashUnit(region.family) - 0.5) * 0.18;
    const hx = C + Math.cos(angle) * HUB_R;
    const hy = C + Math.sin(angle) * HUB_R;

    // Members fan out around their hub, biased outward so the web reads as
    // growing away from the centre rather than crowding it.
    const members = region.nodes.slice(0, 9).map((n, j, arr) => {
      const spread = 1.5;
      const a = angle + ((j - (arr.length - 1) / 2) / Math.max(1, arr.length)) * spread;
      const dist = 42 + hashUnit(n.id) * 34;
      return {
        ...n,
        x: hx + Math.cos(a) * dist,
        y: hy + Math.sin(a) * dist,
        r: 3 + (n.confidence || 0) * 4,
      };
    });

    return {
      family: region.family,
      seen: region.seen,
      total: region.total,
      explored: region.explored,
      hidden: Math.max(0, region.total - region.seen),
      angle, hx, hy, members,
      labelAnchor: Math.cos(angle) > 0.3 ? "start" : Math.cos(angle) < -0.3 ? "end" : "middle",
    };
  });

  const lockStep = (Math.PI * 2) / Math.max(1, locked.length);
  const fog = locked.map((region, i) => {
    const angle = i * lockStep - Math.PI / 2 + 0.42;
    return {
      family: region.family,
      total: region.total,
      x: C + Math.cos(angle) * LOCK_R,
      y: C + Math.sin(angle) * LOCK_R,
      anchor: Math.cos(angle) > 0.3 ? "start" : Math.cos(angle) < -0.3 ? "end" : "middle",
      delay: (i * 0.7).toFixed(2),
    };
  });

  return { clusters, fog };
}

export default function TasteMap({ regions, discovered = 0, totalCards = 1446, recentIds = [] }) {
  const { clusters, fog } = useMemo(() => layout(regions), [regions]);
  const recent = useMemo(() => new Set(recentIds || []), [recentIds]);

  if (clusters.length === 0) {
    return (
      <div className="tm-empty">
        <div className="tm-empty-core"><span className="tm-empty-dot" /></div>
        <p className="tm-empty-t">Nothing mapped yet.</p>
        <p className="tm-empty-s">Every call you answer lights a node and pulls back the fog.</p>
      </div>
    );
  }

  const pct = totalCards ? Math.round((discovered / totalCards) * 100) : 0;

  return (
    <div className="tm">
      <svg className="tm-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img"
           aria-label={`Taste map: ${discovered} of ${totalCards} discovered across ${clusters.length} regions, ${fog.length} still fogged`}>
        <defs>
          <radialGradient id="tmCore">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#7ef5df" />
            <stop offset="100%" stopColor="#2ee6d6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="tmHaze">
            <stop offset="0%" stopColor="#2ee6d6" stopOpacity="0.09" />
            <stop offset="65%" stopColor="#8b5cf6" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
          {/* The fog itself — dense at the rim, thinning toward explored space */}
          <radialGradient id="tmFog">
            <stop offset="0%" stopColor="#0d0b14" stopOpacity="0.92" />
            <stop offset="60%" stopColor="#0d0b14" stopOpacity="0.66" />
            <stop offset="100%" stopColor="#0d0b14" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={C} cy={C} r={LOCK_R + 14} fill="url(#tmHaze)" />

        {/* ---- fogged clusters: named, counted, and out of reach ---- */}
        {fog.map((f) => (
          <g className="tm-fog" key={f.family} style={{ animationDelay: `${f.delay}s` }}>
            <circle className="tm-fog-blob" cx={f.x} cy={f.y} r={46} fill="url(#tmFog)" />
            <circle className="tm-fog-ring" cx={f.x} cy={f.y} r={26} />
            {/* unresolved outline nodes beneath the mist */}
            {[0, 1, 2].map((k) => {
              const a = (k / 3) * Math.PI * 2 + hashUnit(f.family) * 3;
              return (
                <circle key={k} className="tm-ghost"
                        cx={f.x + Math.cos(a) * 13} cy={f.y + Math.sin(a) * 13} r={2.4} />
              );
            })}
            <text className="tm-fog-label" x={f.x} y={f.y + 44} textAnchor="middle">
              {f.family}
            </text>
            <text className="tm-fog-count" x={f.x} y={f.y + 60} textAnchor="middle">
              {f.total} hidden
            </text>
          </g>
        ))}

        {/* ---- trunk edges: core to each family hub, with running signal ---- */}
        {clusters.map((cl) => {
          const id = `tmp-${cl.family.replace(/\W/g, "")}`;
          return (
            <g key={`edge-${cl.family}`}>
              <path id={id} className="tm-trunk" d={`M ${C} ${C} L ${cl.hx} ${cl.hy}`} />
              <circle className="tm-signal" r="2.6">
                <animateMotion dur={`${3.2 + hashUnit(cl.family) * 2.4}s`} repeatCount="indefinite">
                  <mpath href={`#${id}`} />
                </animateMotion>
              </circle>
            </g>
          );
        })}

        {/* ---- branches + member nodes ---- */}
        {clusters.map((cl) => (
          <g key={`cl-${cl.family}`}>
            {cl.members.map((m) => (
              <line key={`b-${m.id}`} className={`tm-branch${recent.has(m.id) ? " tm-branch--new" : ""}`}
                    x1={cl.hx} y1={cl.hy} x2={m.x} y2={m.y}
                    style={{ opacity: 0.10 + (1 - (m.staleness || 0)) * 0.22 }} />
            ))}

            {cl.members.map((m) => (
              <g key={m.id}
                 className={`tm-node tm-node--${tone(m.affinity)}${recent.has(m.id) ? " tm-node--new" : ""}`}
                 style={{ opacity: 0.34 + (1 - (m.staleness || 0)) * 0.66 }}>
                <title>{`${m.name} — ${Math.round((m.affinity ?? 0) * 100)}% affinity`}</title>
                {m.rarity >= 3 && <circle className="tm-rare" cx={m.x} cy={m.y} r={m.r + 4} />}
                <circle className="tm-dot" cx={m.x} cy={m.y} r={m.r} />
              </g>
            ))}

            <circle className="tm-hub" cx={cl.hx} cy={cl.hy} r={7} />
            {cl.hidden > 0 && (
              <circle className="tm-hub-lock" cx={cl.hx} cy={cl.hy} r={12} />
            )}
            <text className="tm-hub-label" x={cl.hx + (cl.labelAnchor === "end" ? -16 : cl.labelAnchor === "start" ? 16 : 0)}
                  y={cl.hy - 16} textAnchor={cl.labelAnchor}>
              {cl.family}
            </text>
            <text className="tm-hub-count" x={cl.hx + (cl.labelAnchor === "end" ? -16 : cl.labelAnchor === "start" ? 16 : 0)}
                  y={cl.hy - 2} textAnchor={cl.labelAnchor}>
              {cl.seen}/{cl.total}
            </text>
          </g>
        ))}

        {/* ---- the core is you, and is drawn last so nothing covers it ---- */}
        <circle className="tm-core-glow" cx={C} cy={C} r={46} fill="url(#tmCore)" />
        <circle className="tm-core" cx={C} cy={C} r={8} />
      </svg>

      <div className="tm-legend">
        <span className="tm-legend-i" /> you
        <span className="tm-legend-sep" />
        <strong>{discovered}</strong> of {totalCards} mapped ({pct}%)
        <span className="tm-legend-sep" />
        <span className="tm-legend-fog" /> {fog.length} regions still fogged
      </div>
    </div>
  );
}
