/* ===========================================================================
   FOOD PERSONALITIES

   Eight types, each claimed by whichever dimension a person scores most
   extremely on — not most highly. Someone at 8% heat is as distinctive as
   someone at 92%, and a quiz that can only tell you what you like a LOT is
   useless to half the people who take it.

   The characters are drawn here as inline SVG rather than shipped as image
   files: about 1KB each, sharp at any size, and every colour comes from the
   app's own palette so a reveal cannot clash with the page it lands on.

   Style is flat vector — a friendly silhouette, a limited palette, one clear
   prop that says what the type is. Drawn from scratch; nothing is traced.
   =========================================================================== */

import { DIMENSIONS } from "./questions";
import PERSONALITY_DATA from "./personalities.data.json";

/* Each type: which dimension claims it, at which end, and how it reads. */
/* Data lives in JSON so the build script that generates /type/<slug> landing
   pages reads the SAME source as the app. Duplicating it would guarantee the
   marketing pages and the product eventually disagree about what a type says. */
export const PERSONALITIES = PERSONALITY_DATA;

/* Which type a score set produces.

   Distance from the middle, not raw height — a 12% is as loud a statement as
   an 88%, and only some dimensions have a meaningful low end worth naming.
   Ties break toward whichever dimension has been answered most, so a strong
   signal from a completed day beats a fluke from a half-finished one. */
const CLAIMS = [
  { dim: "heat",      end: "high", type: "heat_high" },
  { dim: "heat",      end: "low",  type: "heat_low" },
  { dim: "sweet",     end: "high", type: "sweet_high" },
  { dim: "value",     end: "high", type: "value_high" },
  { dim: "value",     end: "low",  type: "value_low" },
  { dim: "adventure", end: "high", type: "adventure_high" },
  { dim: "lateNight", end: "high", type: "lateNight_high" },
  { dim: "discovery", end: "high", type: "discovery_high" },
];

export function personalityFor(scores, answeredPerDim = {}) {
  let best = null;
  for (const claim of CLAIMS) {
    const v = scores[claim.dim];
    if (typeof v !== "number") continue;
    const strength = claim.end === "high" ? v - 50 : 50 - v;
    if (strength <= 0) continue;
    const depth = answeredPerDim[claim.dim] || 0;
    if (!best || strength > best.strength || (strength === best.strength && depth > best.depth)) {
      best = { type: claim.type, strength, depth };
    }
  }
  // Everything dead centre is a real result, not an error: someone genuinely
  // moderate gets the type that says so rather than a random pick.
  if (!best) return PERSONALITIES.heat_low;
  return PERSONALITIES[best.type];
}

/* ---------------------------------------------------------------------------
   The characters.

   One component, one `prop` switch. A blob body, a face that is always the
   same friendly geometry, and a single object that identifies the type — so
   eight characters read as one family rather than eight unrelated drawings.
   --------------------------------------------------------------------------- */

function Prop({ prop, color }) {
  switch (prop) {
    case "flame":
      return (
        <path d="M100 34c10 16 18 26 18 38a18 18 0 0 1-36 0c0-8 6-14 10-22 3 8 8 10 8 16 4-10 0-20 0-32z"
              fill={color} opacity="0.95" />
      );
    case "leaf":
      return (
        <path d="M82 60c16-22 40-24 40-24s2 26-14 40-32 8-32 8 0-14 6-24z"
              fill={color} opacity="0.95" />
      );
    case "cherry":
      return (
        <g fill={color}>
          <circle cx="88" cy="58" r="11" />
          <circle cx="112" cy="64" r="9" />
          <path d="M88 47c4-14 16-18 24-14" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
    case "coin":
      return (
        <g>
          <circle cx="100" cy="58" r="18" fill={color} />
          <circle cx="100" cy="58" r="11" fill="none" stroke="#0C0912" strokeWidth="3" opacity="0.35" />
        </g>
      );
    case "glass":
      return (
        <g fill={color}>
          <path d="M84 40h32l-13 20v18h8v6H89v-6h8V60z" />
        </g>
      );
    case "compass":
      return (
        <g>
          <circle cx="100" cy="58" r="19" fill="none" stroke={color} strokeWidth="5" />
          <path d="M108 50l-5 14-11 4 5-14z" fill={color} />
        </g>
      );
    case "moon":
      return (
        <path d="M112 40a20 20 0 1 0 6 34 24 24 0 0 1-6-34z" fill={color} />
      );
    case "gem":
      return (
        <g fill={color}>
          <path d="M100 38l20 14-20 26-20-26z" />
          <path d="M80 52h40" stroke="#0C0912" strokeWidth="3" opacity="0.3" />
        </g>
      );
    default:
      return null;
  }
}

export function PersonalityCharacter({ personality, size = 176 }) {
  const p = personality;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={p.name}>
      <defs>
        <linearGradient id={`body-${p.id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={p.color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={p.color} stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {/* body — a soft blob, so the type reads from the prop and colour
          rather than from a face we would have to draw eight ways */}
      <path
        d="M100 84c30 0 50 20 50 46 0 24-20 38-50 38s-50-14-50-38c0-26 20-46 50-46z"
        fill={`url(#body-${p.id})`}
      />
      {/* feet */}
      <ellipse cx="84" cy="170" rx="11" ry="6" fill={p.color} opacity="0.5" />
      <ellipse cx="116" cy="170" rx="11" ry="6" fill={p.color} opacity="0.5" />
      {/* face */}
      <circle cx="88" cy="116" r="5.5" fill="#0C0912" />
      <circle cx="112" cy="116" r="5.5" fill="#0C0912" />
      <circle cx="89.6" cy="114" r="1.9" fill="#FDF8F2" />
      <circle cx="113.6" cy="114" r="1.9" fill="#FDF8F2" />
      <path d="M90 131q10 9 20 0" stroke="#0C0912" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <ellipse cx="74" cy="128" rx="6" ry="4" fill="#FF4081" opacity="0.28" />
      <ellipse cx="126" cy="128" rx="6" ry="4" fill="#FF4081" opacity="0.28" />

      <Prop prop={p.prop} color={p.color} />
    </svg>
  );
}

export { DIMENSIONS };
