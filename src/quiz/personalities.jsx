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

/* Each type: which dimension claims it, at which end, and how it reads. */
export const PERSONALITIES = {
  heat_high: {
    id: "heat_high",
    name: "The Firewalker",
    tagline: "You chase the burn, and you finish the plate.",
    blurb:
      "Heat isn't a challenge you tolerate — it's the reason you ordered. You read a chilli symbol as a recommendation, and the meals you remember are the ones that fought back.",
    color: "#FF3D00",
    glow: "linear-gradient(135deg, #FF3D00, #FF9E1F)",
    prop: "flame",
  },
  heat_low: {
    id: "heat_low",
    name: "The Purist",
    tagline: "You want to taste the food, not the fire.",
    blurb:
      "You're not avoiding flavour — you're protecting it. Heat that buries the dish is heat that wasted it, and you'd rather know what the cook actually made.",
    color: "#2EE6D6",
    glow: "linear-gradient(135deg, #2EE6D6, #5B9BFF)",
    prop: "leaf",
  },
  sweet_high: {
    id: "sweet_high",
    name: "The Sweet Tooth",
    tagline: "There is always room. You've checked.",
    blurb:
      "Dessert isn't the end of the meal, it's a reason to have one. You'd cross town for a pastry and you've never once regretted ordering the sweet thing.",
    color: "#FF4081",
    glow: "linear-gradient(135deg, #FF4081, #FFC857)",
    prop: "cherry",
  },
  value_high: {
    id: "value_high",
    name: "The Bargain Hunter",
    tagline: "Plastic chairs, perfect food, half the price.",
    blurb:
      "You've worked out that the room has almost nothing to do with the cooking. Give you a handwritten menu and a queue of locals and you're exactly where you want to be.",
    color: "#00C853",
    glow: "linear-gradient(135deg, #00C853, #B2FF59)",
    prop: "coin",
  },
  value_low: {
    id: "value_low",
    name: "The Occasion Maker",
    tagline: "You're paying for the evening, not just the food.",
    blurb:
      "A meal is a place to be, not just fuel. You'll happily spend more for a room worth sitting in — and you think the people counting pennies are missing the point.",
    color: "#FFC857",
    glow: "linear-gradient(135deg, #FFC857, #FF5F1F)",
    prop: "glass",
  },
  adventure_high: {
    id: "adventure_high",
    name: "The Blind Orderer",
    tagline: "You order the thing you can't identify.",
    blurb:
      "The unfamiliar dish is the interesting one, and letting the kitchen decide is a feature, not a risk. You've eaten some disasters. You'd do it again tomorrow.",
    color: "#8B5CF6",
    glow: "linear-gradient(135deg, #8B5CF6, #FF4081)",
    prop: "compass",
  },
  lateNight_high: {
    id: "lateNight_high",
    name: "The Night Owl",
    tagline: "The best food happens after dark.",
    blurb:
      "Rooms get better when they get busy, and the meal that ends the night beats the one that starts it. Breakfast at 9pm is a legitimate dinner and you'll defend that.",
    color: "#5B9BFF",
    glow: "linear-gradient(135deg, #5B9BFF, #8B5CF6)",
    prop: "moon",
  },
  discovery_high: {
    id: "discovery_high",
    name: "The Gem Finder",
    tagline: "Thirty reviews beats three thousand.",
    blurb:
      "You trust a place people haven't discovered yet over one everybody agrees about. No website and a phone number reads as promising, not risky — and you're usually right.",
    color: "#FF6D00",
    glow: "linear-gradient(135deg, #FF6D00, #FFC857)",
    prop: "gem",
  },
};

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
