import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import { renderShareCard, canvasToBlob, buildCaption } from "./shareCard";
import logoFlame from "./assets/logo-flame.png";
import Quiz, { quizStatus } from "./quiz/Quiz";

/* Filenames only — keeps a restaurant called "Joe's #1 BBQ & Grill" from
   producing something the OS share sheet chokes on. */
function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "pick";
}

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://savorscout.onrender.com";
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN; // optional upgrade, never required

/* ===========================================================================
   THE FLAME

   A new tier every 5 days, exactly as asked. Progression follows real flame
   physics — orange, gold, white-hot, blue, violet — which is both physically
   truthful and a legible "this is getting serious" signal. Each tier is
   literally brighter than the last, so the screen gains light as you invest.
   That's a far stronger feedback loop than a badge, because it's felt rather
   than read.
   =========================================================================== */

const FLAME_TIERS = [
  { id: 0, name: "Dormant",  core: "#3a3446", mid: "#2a2536", outer: "#1e1a28", spark: null,      min: 0 },
  { id: 1, name: "Ember",    core: "#ffd08a", mid: "#ff8a3d", outer: "#ff5f1f", spark: null,      min: 1 },
  { id: 2, name: "Flame",    core: "#fff2c4", mid: "#ffc857", outer: "#ff7a2f", spark: null,      min: 5 },
  { id: 3, name: "Blaze",    core: "#ffffff", mid: "#ffe6a8", outer: "#ffa63d", spark: "#ffd98a", min: 10 },
  { id: 4, name: "Inferno",  core: "#ffffff", mid: "#bfe9ff", outer: "#4fc3ff", spark: "#9fdcff", min: 15 },
  { id: 5, name: "Starfire", core: "#ffffff", mid: "#cbb6ff", outer: "#8b5cf6", spark: "#c4b0ff", min: 20 },
  { id: 6, name: "Spectral", core: "#ffffff", mid: "#ffb3d5", outer: "#ff2e88", spark: "#ff85bb", min: 25 },
  { id: 7, name: "Eternal",  core: "#ffffff", mid: "#fff4d6", outer: "#ffd76a", spark: "#ffffff", min: 30 },
];

/* ===========================================================================
   THE MARK

   The ribbon flame artwork, alpha-keyed, mapped to a warm-only palette, and
   set on the deep ember tile. An earlier version redrew it as SVG paths and
   lost the diagonal lean that makes it read as fire — straightened up, it
   looked like an acorn. So this uses the real pixels.

   The recolour is a luminance gradient map, not a hue rotation. The original
   is a rainbow: 37% warm, 20% teal, 16% purple, 19% pink. Rotating those hues
   into a warm arc would have crushed four distinct ribbons into one orange
   smear, because it is hue that separates them there. What actually carries
   the artwork's form is its shading — luminance runs the full 0.11 to 0.97 —
   so each pixel's brightness is used to index a warm ramp instead: crimson
   through ember, orange, amber, gold, to ivory. Every ribbon keeps its place
   in the tonal order it already had; only the hue changes. The dark purple
   dome becomes the deep crimson mass, the bright cyan tip becomes the ivory
   highlight, and the mark reads as molten rather than repainted.

   One correction on top: ribbons that shared a luminance but differed in hue
   would have merged once hue stopped distinguishing them, so cool-hued pixels
   sink slightly on the ramp and warm-hued ones lift, scaled by saturation so
   the shift fades out in the greys and never bands mid-gradient.

   How the keying works, since the asset is generated and not hand-made:

   The art is drawn on paper that measures #f0f0f0, while its own white ribbons
   run 249-255. That gap is what makes this separable at all. A flood fill runs
   inward from the border and takes every near-neutral pixel it can reach, so
   the paper goes transparent and the tile gradient shows through. The artwork's
   white channels are reachable too — they open onto the page rather than being
   enclosed — so they also turn transparent and read as red channels on the
   tile. That is the correct result: on white paper those channels ARE the
   background, so making the background red should make them red.

   Two details that matter. The fill is topological rather than a flat colour
   threshold, so anything genuinely enclosed by ribbons would survive. And the
   mask is built at full 1538x2000 resolution and only then downscaled — canvas
   averages premultiplied alpha, so the downscale anti-aliases the cut edge for
   free and leaves no pale halo, which a threshold at final size would.
   =========================================================================== */

function LogoMark({ size = 46 }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size }} aria-hidden="true">
      <img src={logoFlame} className="logo-flame" alt="" draggable="false" />
    </span>
  );
}

function tierForStreak(days) {
  if (!days || days < 1) return FLAME_TIERS[0];
  return FLAME_TIERS[Math.min(FLAME_TIERS.length - 1, Math.floor(days / 5) + 1)];
}

function nextTierInfo(days) {
  const current = tierForStreak(days);
  const next = FLAME_TIERS.find((t) => t.min > (days || 0));
  if (!next) return { next: null, daysToGo: 0, progress: 1, current };
  const span = next.min - current.min;
  const into = (days || 0) - current.min;
  return {
    next,
    daysToGo: next.min - (days || 0),
    progress: span > 0 ? Math.min(1, Math.max(0, into / span)) : 0,
    current,
  };
}

function Flame({ days = 0, hero = false }) {
  const tier = tierForStreak(days);
  const uid = `fl${tier.id}${hero ? "h" : "s"}`;

  return (
    <div className={`flame flame--t${tier.id}${hero ? " flame--hero" : ""}`}>
      <span className="flame-halo" aria-hidden="true" />
      <svg className="flame-svg" viewBox="0 0 26 32" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}g`} x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor={tier.outer} />
            <stop offset="55%" stopColor={tier.mid} />
            <stop offset="100%" stopColor={tier.core} />
          </linearGradient>
          <radialGradient id={`${uid}c`} cx="50%" cy="72%" r="50%">
            <stop offset="0%" stopColor={tier.core} stopOpacity="0.95" />
            <stop offset="100%" stopColor={tier.mid} stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="flame-body">
          {/* outer body — the classic teardrop, licked to one side */}
          <path
            d="M13 1.5c3.4 4.2 2.1 6.9.6 9.2-1.2 1.9-2.1 3.4-1.5 5.3.5 1.6 2 2.3 3.2 1.6 1.4-.8 1.6-2.6 1-4.3 2.9 2.2 4.7 5.3 4.7 8.6 0 5-4.1 8.6-9 8.6S3 26.9 3 21.9c0-4.6 2.6-7.4 5.3-10.4C11.2 8.3 13.6 5.5 13 1.5z"
            fill={`url(#${uid}g)`}
          />
          {/* inner core — appears from Blaze up, the "white-hot" read */}
          {tier.id >= 3 && (
            <ellipse cx="13" cy="23" rx="4.2" ry="5.4" fill={`url(#${uid}c)`} />
          )}
        </g>

        {/* sparks — only at high tiers, so they read as earned */}
        {tier.spark && (
          <>
            <circle cx="6" cy="9" r="0.9" fill={tier.spark} opacity="0.85">
              <animate attributeName="cy" values="9;3;9" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.9;0" dur="2.6s" repeatCount="indefinite" />
            </circle>
            <circle cx="20" cy="12" r="0.75" fill={tier.spark} opacity="0.7">
              <animate attributeName="cy" values="12;5;12" dur="3.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.8;0" dur="3.4s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>

      <div className="flame-meta">
        <span className="flame-count">{days || 0}</span>
        <span className="flame-unit">{hero ? tier.name : `day${days === 1 ? "" : "s"}`}</span>
      </div>
    </div>
  );
}

/* ===========================================================================
   LEVEL RING
   =========================================================================== */

function LevelRing({ level, size = 44 }) {
  if (!level) return null;
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - (level.progress || 0));

  return (
    <div className="ring-wrap" style={{ width: size, height: size }} title={`${level.xpToNext?.toLocaleString() || 0} XP to ${level.nextRank || "max"}`}>
      <svg className="ring" width={size} height={size}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2ee6d6" />
            <stop offset="100%" stopColor="#7ef5df" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth="3" />
        <circle
          className="ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="ring-label" style={{ width: size, height: size }}>
        <span className="ring-lv">{level.level}</span>
      </span>
    </div>
  );
}

/* Counts a number up on mount. Motion that shows a value changing, rather
   than motion for its own sake. */
function CountUp({ value, duration = 900, className }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (typeof value !== "number") return undefined;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(value); return undefined; }

    let frame;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  if (typeof value !== "number") return null;
  return <span className={className}>{shown.toLocaleString()}</span>;
}

/* ===========================================================================
   VERDICT CARD HELPERS
   =========================================================================== */

function buildChips(r) {
  const chips = [];
  const sb = r.scoreBreakdown || {};

  if (r.matchedDish) chips.push(`Matches "${r.matchedDish}"`);
  else if (r.matchedCuisine) chips.push(`${r.matchedCuisine} done well`);

  if (typeof r.rating === "number" && sb.quality >= 65 && r.reviewCount >= 50) {
    chips.push(`${r.reviewCount.toLocaleString()} ratings`);
  }
  if (sb.proximity >= 75 && typeof r.distanceMiles === "number") chips.push(`${r.distanceMiles} mi away`);
  if (sb.evidence >= 60) {
    chips.push(r.evidence?.sourceType === "official_site" ? "Confirmed on their menu" : "Menu confirmed online");
  }
  if (r.matchedFactors?.length) for (const f of r.matchedFactors.slice(0, 2)) chips.push(`Reviews mention "${f}"`);
  if (typeof sb.budget === "number" && sb.budget >= 70) chips.push("Fits your budget");
  if (chips.length === 0 && r.category) chips.push(r.category);
  return chips;
}

function distanceLabel(r) {
  if (typeof r.distanceMiles !== "number") return null;
  const from = r.distanceFrom && r.distanceFrom !== "you" ? `from ${r.distanceFrom}` : "away";
  return `${r.distanceMiles} mi ${from}`;
}

function mapsUrl(r) {
  if (typeof r.lat === "number" && typeof r.lng === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${r.address || ""}`.trim())}`;
}

function osmEmbedUrl(lat, lng) {
  const d = 0.006;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
}

/* beatCount is how many others it BEAT, so the size of the pool is beatCount+1.
   "Best of the {beat}" was off by one and contradicted the share card, which
   says "Best of {beat + 1}" — the same pick appearing to have been chosen from
   two different pool sizes is exactly the kind of thing that costs trust. Every
   phrasing here now derives from one of `beat` (others) or `pool` (total), and
   never mixes them. */
function verdictLine(w) {
  const beat = w.beatCount || 0;
  const pool = beat + 1;
  const lead = w.dominancePercent;
  if (beat === 0) return "The only place nearby that fits what you asked for.";
  if (typeof lead === "number" && lead >= 25) return `Clear winner — well ahead of the other ${beat} nearby.`;
  if (typeof lead === "number" && lead >= 8) return `Best of the ${pool} nearby places we compared.`;
  return `Edged out ${beat} other${beat === 1 ? "" : "s"} nearby — it was close.`;
}

function Stars({ rating }) {
  const filled = Math.round(typeof rating === "number" ? rating : 5);
  return (
    <span className="stars" aria-label={`${filled} of 5`}>
      {"★★★★★".slice(0, filled)}
      <span className="stars-off">{"★★★★★".slice(filled)}</span>
    </span>
  );
}

const METRIC_LABELS = {
  relevance: "Dish match",
  quality: "Ratings",
  proximity: "Distance",
  vibe: "Vibe match",
  evidence: "Evidence",
  budget: "Price fit",
};

function Evidence({ evidence, reception, review, menuItems, rating, dietary, allergy }) {
  const hasReview = Boolean(review?.text);
  const hasMenu = Boolean(menuItems?.length);
  const hasQuote = Boolean(evidence?.quote) && !hasReview;
  const hasRecep = Boolean(reception?.quote) && !hasReview;
  const hasAll = Boolean(allergy?.length);
  const hasDiet = Boolean(dietary?.length);

  if (!hasReview && !hasMenu && !hasQuote && !hasRecep && !hasAll && !hasDiet && typeof rating !== "number") return null;

  return (
    <div className="evidence">
      {hasReview ? (
        <>
          <div className="ev-head">
            <Stars rating={5} />
            <span className="ev-key">What people say</span>
          </div>
          <p className="quote">{review.text}</p>
          {review.sourceUrl && (
            <a className="ev-link" href={review.sourceUrl} target="_blank" rel="noreferrer">Read the source →</a>
          )}
        </>
      ) : (
        typeof rating === "number" && (
          <div className="ev-head">
            <Stars rating={rating} />
            <span className="ev-key">{rating.toFixed(1)} average</span>
          </div>
        )
      )}

      {hasMenu && (
        <div className="menu-block">
          <span className="ev-key">On the menu</span>
          {menuItems.map((m, i) => (
            <div className="menu-item" key={i}>
              <span>{m.name}</span>
              <span className="menu-dash" />
              <span className="menu-price">{m.price}</span>
            </div>
          ))}
        </div>
      )}

      {hasQuote && (
        <div className="menu-block">
          <span className="ev-key">From their menu</span>
          <p className="quote">{evidence.quote}</p>
        </div>
      )}

      {hasRecep && (
        <div className="menu-block">
          <span className="ev-key">From web research</span>
          <p className="quote">{reception.quote}</p>
        </div>
      )}

      {hasAll && (
        <p className="allergy">
          Mentions {allergy.join(", ")} — not a safety guarantee. Confirm allergy details with the
          restaurant before ordering.
        </p>
      )}
      {hasDiet && <p className="dietary">Confirmed: {dietary.join(", ")}</p>}
    </div>
  );
}

/* ===========================================================================
   DUEL ARENA
   =========================================================================== */


/* ===========================================================================
   CALIBRATION

   The purpose line is stated once, plainly, at the top of the card. Not
   "help us collect data" — nobody volunteers for that — but not a lie
   either. "Every answer sharpens what we recommend" is the literal truth
   and also the framing people act on.
   =========================================================================== */



/* ===========================================================================
   THE SIGNATURE

   This replaced a radial constellation, for a reason worth writing down.

   Cleveland & McGill's perceptual ranking puts POSITION ALONG A COMMON SCALE
   at the top for decoding accuracy, and ANGLE and AREA near the bottom. A
   polar map of taste forces exactly the two weakest judgements, which is how
   it managed to look like something while telling you nothing. A row of bars
   uses the strongest one.

   That isn't only a legibility argument. Processing fluency (Reber, Schwarz
   & Winkielman) shows easily-processed information is judged both more
   pleasant AND more true. For a product whose whole claim is "we know you,"
   being judged more true is not decoration — it is the product.

   Two rules keep it simple enough to read without a legend:

     1. THE RAIL IS THE SCALE. It runs dim on the left to warm on the right,
        so which end means "more" is visible rather than explained. The dot is
        cool because the dot is you — the house hue rule does the work a key
        would otherwise have to do.

     2. WE ONLY DRAW WHAT WE'RE SURE OF. An unconfident reading rendered as a
        fuzzy bar is a puzzle. Withheld, and named underneath as something
        still being measured, it's a reason to come back — the same Zeigarnik
        pull with none of the interpretation cost.
   =========================================================================== */






/* ===========================================================================
   THE DAILY READ

   The front door. Before the user does anything, the app has already made a
   falsifiable call about them and put a number on it.

   Two design rules earn their keep here:

   1. THE CONFIDENCE IS SHOWN, THE SIDE IS SEALED.
      Naming the predicted card up front would anchor the answer and poison
      the exact signal the prediction was built from — some users would
      conform, others would contrarian-pick to beat it, and neither is taste.
      Staking a visible number on a sealed call is also simply better drama:
      an envelope beats a stated guess.

   2. NEITHER OUTCOME IS A LOSS.
      A hit means the model knows them, which is eerie and worth showing
      someone. A miss means they're unreadable, which is flattering and also
      worth showing someone. There is no discouraging branch to fall out of,
      which is what makes this survivable as a daily mechanic where a plain
      win/lose duel is not.
   =========================================================================== */


/* ===========================================================================
   SHARE SHEET

   The card is built at full 1080x1350 on an offscreen canvas and shown here
   scaled down, so what the user previews is byte-for-byte what they post.

   Failure is designed for rather than hoped against: rendering can't throw a
   dead button at anyone, because the card composes from whatever passed its
   gates and the no-photo layout is a first-class design. The only genuinely
   unrecoverable case is a verdict with no name, which can't happen.
   =========================================================================== */

function ShareSheet({ state, onClose, onDownload, onShare, onCopy, copied }) {
  if (!state) return null;
  const { url, fields, usedPhoto, busy, error, canNativeShare, caption } = state;

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Share this verdict">
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet-body">
        <div className="sheet-head">
          <span className="sheet-tag">Share</span>
          <button className="sheet-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error ? (
          <p className="sheet-err">{error}</p>
        ) : url ? (
          <img className="sheet-preview" src={url} alt={`Share card for ${fields?.name || "your pick"}`} />
        ) : (
          <div className="sheet-loading"><span className="sheet-spin" />Building your card…</div>
        )}

        {url && (
          <>
            {/* The written half of the share. The friction in posting is almost
                never the picture — it's composing words while the impulse
                fades. Handing over a finished sentence removes that. */}
            {caption && (
              <div className="sheet-cap">
                <div className="sheet-cap-head">
                  <span className="sheet-cap-tag">Caption</span>
                  <button className="sheet-copy" onClick={onCopy}>
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                <p className="sheet-cap-text">{caption}</p>
              </div>
            )}

            <div className="sheet-acts">
              {canNativeShare && (
                <button className="btn btn--hot" disabled={busy} onClick={onShare}>
                  Share…
                </button>
              )}
              <button className="btn btn--ghost" disabled={busy} onClick={onDownload}>
                Save image
              </button>
            </div>
            <p className="sheet-note">
              1080×1350 — sized for Instagram, and fine on X or Threads.
              {!usedPhoto && " No usable photo for this one, so we set the craving instead."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ===========================================================================
   THE OVERNIGHT SEAL

   Everything else here resolves on the tap, which leaves nothing that needs
   TOMORROW specifically. So one call a day is answered and not graded, and
   the outcome waits until morning.

   That's the difference between a habit and an appointment. A habit competes
   with everything else on the phone; an appointment is something of yours
   already sitting there. It's the Wordle-reset shape without the currency.

   It never expires on purpose. Disappear for a week and the envelope is still
   waiting, which turns a lapse into a welcome-back instead of a loss — the
   opposite of a streak, which punishes exactly the person you most want to
   win back.
   =========================================================================== */


/* ===========================================================================
   THE PREDICTION

   The daily loop. Replaces the pairwise duel entirely.

   The app puts ONE thing in front of the user and commits, out loud and with
   a number on it, to whether they will like it. They answer Match or Defy and
   the guess is graded on the spot.

   Why this beats "which of these two":

     THE APP TAKES THE RISK. A duel asks the user to do the work of
     introspecting. A prediction makes the machine perform, and reframes the
     interesting question from "which do I prefer" to "does this thing
     actually know me". That is a question people will open an app to answer.

     BOTH BRANCHES FEEL GOOD. A hit is uncanny — it knows me. A miss is
     flattering — I'm unreadable. There is no losing outcome to churn out of,
     which is the property that makes this survivable as a daily habit where a
     win/lose duel is not.

     THE SIDE STAYS SEALED UNTIL THEY ANSWER. Showing the guess up front would
     anchor the answer and poison the signal the guess was built from — some
     people conform, others contrarian-pick to beat it, and neither is taste.
     Staking the CONFIDENCE openly while hiding the CALL keeps the data clean
     and is better theatre besides: an envelope beats a stated guess.
   =========================================================================== */



/* A revealed trait is the payoff moment. It only ever fires on real evidence
   — a fabricated "you're an adventurous eater" would undercut the exact

/* ===========================================================================
   VERDICT PROMPT
   =========================================================================== */

function Ask({ verdict, onAnswer, busy }) {
  const [stage, setStage] = useState("ask");
  return (
    <div className="ask">
      <div className="ask-head">
        <span className="ask-key">We sent you here</span>
        <span className="ask-name">{verdict.name}</span>
        {typeof verdict.match_score === "number" && (
          <span className="ask-claim">we said {verdict.match_score}%</span>
        )}
      </div>
      {stage === "ask" ? (
        <>
          <p className="ask-q">Did you end up going?</p>
          <div className="ask-opts">
            <button className="opt opt--yes" disabled={busy} onClick={() => setStage("rate")}>Yes, I went</button>
            <button className="opt" disabled={busy} onClick={() => onAnswer(verdict.id, { visited: false })}>Didn't go</button>
          </div>
        </>
      ) : (
        <>
          <p className="ask-q">How close were we?</p>
          <div className="ask-opts">
            <button className="opt opt--good" disabled={busy} onClick={() => onAnswer(verdict.id, { visited: true, outcome: "better" })}>Better than expected</button>
            <button className="opt opt--mid" disabled={busy} onClick={() => onAnswer(verdict.id, { visited: true, outcome: "expected" })}>About right</button>
            <button className="opt opt--bad" disabled={busy} onClick={() => onAnswer(verdict.id, { visited: true, outcome: "worse" })}>Worse</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ===========================================================================
   SESSION ZIP
   =========================================================================== */

function getZip() {
  try { return window.sessionStorage.getItem("ss_zip") || ""; } catch { return ""; }
}
function setZip(z) {
  try { window.sessionStorage.setItem("ss_zip", z); } catch { /* private mode */ }
}

function explainSaveError(error) {
  const code = error?.code;
  const msg = error?.message || "";
  if (code === "42501" || /row-level security/i.test(msg)) {
    return "Couldn't save — your account isn't allowed to write to profiles. That's a missing RLS policy, not something you did.";
  }
  if (code === "PGRST204" || code === "42703") return `Couldn't save — profiles is missing a column (${msg}).`;
  if (code === "23505") return "Couldn't save — that conflicts with an existing profile row.";
  if (code === "23502") return `Couldn't save — a required column has no value (${msg}).`;
  return `Couldn't save — ${msg || "please try again."}`;
}

const RADIUS_MODES = [
  { id: "nearby", label: "Nearby", hint: "5–15 mi" },
  { id: "driving", label: "Willing to drive", hint: "10–25 mi" },
  { id: "anywhere", label: "Anywhere worth it", hint: "15–40 mi" },
];
const RADIUS_FIRST_TIER = { nearby: 5, driving: 10, anywhere: 15 };

/* How a past pick reads in the history list. "Not rated" is deliberately a
   live state rather than a blank — it's the one thing the page wants back
   from you, so it should look unfinished. */
function verdictWord(h) {
  if (h.visited === null || h.visited === undefined) return "Not rated";
  if (!h.visited) return "Didn't go";
  if (h.outcome === "better") return "Loved it";
  if (h.outcome === "expected") return "Liked it";
  return "Not for me";
}

function verdictTone(h) {
  if (h.visited === null || h.visited === undefined) return "open";
  if (!h.visited) return "skip";
  return h.outcome === "worse" ? "bad" : "good";
}

/* Two tabs. Search is the product, so search is the front door on every
   visit; You is where the picks land and get graded. */
const TABS = [
  { id: "find", label: "Find", minLevel: 1 },
  { id: "group", label: "Group", minLevel: 1 },
  { id: "you", label: "You", minLevel: 1 },
];

/* ---------------------------------------------------------------------------
   GROUP ROOMS — client

   The whole feature is judged on one thing: how long it takes a person who was
   handed a link in a group chat to be voting. So there is no signup, no name
   entry, no lobby to wait in — tapping the link joins you and shows the cards.

   Rooms are plain URLs (/r/ABC123) rather than a routed page, because the app
   has no router and does not need one for a single pattern. The path is read
   once on boot; everything after that is state.
   --------------------------------------------------------------------------- */

const ROOM_PATH = /^\/r\/([23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6})\/?$/i;
const roomCodeFromUrl = () => {
  const m = ROOM_PATH.exec(window.location.pathname);
  return m ? m[1].toUpperCase() : null;
};
const roomKey = (code) => `ss_room_${code}`;

/* Pulls a room code out of whatever someone actually pastes or types.

   In practice that is rarely a clean code: it is the whole URL copied from a
   chat bubble, a code read aloud and typed in lowercase, or one written with a
   dash in the middle. All of those are the right answer typed slightly wrong,
   and rejecting them would be the app being pedantic at the worst moment.

   Everything outside the code alphabet is dropped rather than mapped —
   0/O/1/I/L are excluded from generated codes precisely because they are
   misread, so there is no honest target to correct them to. */
function parseRoomCode(raw) {
  const cleaned = String(raw || "").toUpperCase().replace(/[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g, "");
  if (cleaned.length < 6) return null;
  // A pasted URL leaves the code at the end, after the host's own letters.
  return cleaned.slice(-6);
}

/* Polling, not sockets. A vote lasts 90 seconds and the payload is ~1.2KB, so
   a short poll costs almost nothing and cannot get wedged by a dropped
   connection, a sleeping dyno, or a proxy that buffers streams. Reliability is
   worth more here than the few hundred ms a socket would save. */
const ROOM_POLL_MS = 900;

/* "Surprise us" pool. Indecision is the whole problem this product exists for,
   so being asked to type a craving before you can start a vote about what to
   crave is its own small joke at the user's expense. One tap fills it in. */
/* Shuffle pool for "pick one for us".

   Chosen for COVERAGE, not for variety. The old list had dumplings, steak and
   falafel in it — real cravings, but ones that return two or three places in a
   suburb, which is how a shuffle ended up producing a board that could not be
   filled. Everything here is a category that essentially any populated area
   supports, phrased the way a search actually resolves: "pizza" rather than
   "Neapolitan", "chinese food" rather than "hand-pulled noodles".

   Broad terms also behave better with the ranker, because a wide net gives it
   more to sort rather than forcing it to accept whatever it found. */
/* Shuffle pool, pruned for DEPTH rather than length.

   The old list had dumplings, steak and falafel in it — real cravings that
   return two or three places in a suburb, which is how a shuffle produced a
   board that could not be filled. Tested against Hicksville NY, a fairly
   ordinary suburb: "pizza" and "dumplings" return a full five, "steak" returns
   two, "diner food" returns four. So narrow dish names are out and broad
   category and cuisine terms are in — "steakhouse" not "steak", "chinese food"
   not "hand-pulled noodles".

   Thirty-odd entries is far more than anyone shuffles through, and every one
   is a category an ordinary town supports. I could not afford to API-test all
   of them, so anything I was unsure about was cut rather than kept: a shuffle
   that lands on a dead craving is worse than a shorter list. */
const ROOM_CRAVINGS = [
  "pizza", "burgers", "tacos", "chinese food", "italian food", "mexican food",
  "sushi", "thai food", "indian food", "japanese food", "korean food",
  "greek food", "mediterranean food", "vietnamese food", "spanish food",
  "sandwiches", "bbq", "fried chicken", "wings", "pasta", "steakhouse",
  "seafood", "breakfast", "brunch", "deli", "noodles", "ramen", "burritos",
  "comfort food", "vegetarian food", "bakery", "dessert", "pub food",
  "family restaurant", "cheap eats", "takeout",
];

/* ===========================================================================
   ANALYTICS CONSENT

   The tag in index.html sets Consent Mode defaults — denied across the EEA, UK
   and Switzerland, granted elsewhere — and replays any stored answer before the
   first hit. This is only the part that needs a user: writing a new answer and
   telling the already-loaded tag about it.

   Storage is the same 'ss_consent' key index.html reads on boot, so a choice
   made here survives reload and is applied before anything is measured.
   =========================================================================== */

const CONSENT_KEY = "ss_consent";

function readConsent() {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch { return null; }
}

function writeConsent(value) {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* private mode */ }
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value,
    });
  }
}

function ConsentBanner() {
  const [choice, setChoice] = useState(readConsent);
  if (choice) return null;
  const answer = (v) => { writeConsent(v); setChoice(v); };
  return (
    <div className="consent" role="region" aria-label="Cookie choices">
      <p className="consent-copy">
        We use cookies to measure how SavorScout gets used, which is how the
        picks get sharper. Declining leaves everything working.
      </p>
      <div className="consent-actions">
        <button type="button" className="btn btn--ghost consent-btn" onClick={() => answer("denied")}>
          Decline
        </button>
        <button type="button" className="btn btn--hot consent-btn" onClick={() => answer("granted")}>
          Accept
        </button>
      </div>
    </div>
  );
}

/* ===========================================================================
   ABOUT

   The one question the product kept failing in testing was "why wouldn't I
   just use Google?", so it is answered on the way in rather than buried.

   Every claim below is one the product actually makes good on, and the last
   block says plainly what SavorScout is worse at. That is not modesty — the
   places data here comes from the same public sources Google surfaces, so
   claiming better data would be a lie a single search could expose, and the
   honest framing ("same data, different job") is the only version that
   survives contact with someone who checks.
   =========================================================================== */

const ABOUT_KEY = "ss_about_seen";

const ABOUT_POINTS = [
  {
    k: "one",
    h: "Google hands you thirty. We hand you one.",
    p: "Maps and Yelp are directories — they rank everything and leave the deciding to you. That is fine when you are researching and exhausting when you are hungry. SavorScout makes the call and stands behind it.",
  },
  {
    k: "dish",
    h: "We read for the dish, not the restaurant.",
    p: "A four-star restaurant can still be mediocre at the thing you actually want. Ask for spicy ramen and we go looking for what people said about the ramen — menus and reviews for that dish — instead of ranking places by their overall star average.",
  },
  {
    k: "why",
    h: "You get the reasoning, not just the answer.",
    p: "Every pick shows its match score, what it beat, and the evidence behind it. If the reasoning is weak you can see that it is weak, which is not something a ranked list ever lets you do.",
  },
  {
    k: "you",
    h: "It remembers your allergies. And it asks if it was right.",
    p: "Dietary restrictions factor into every match, not a filter you re-apply each time. Afterwards we ask whether you went and whether it landed — the answer tunes the next pick. No directory has ever asked you that.",
  },
];

function AboutPanel({ onClose }) {
  return (
    <section className="about" aria-labelledby="about-h">
      <div className="about-head">
        <h2 className="about-title" id="about-h">
          Why not just use <em>Google Maps</em>?
        </h2>
        <button type="button" className="about-close" onClick={onClose} aria-label="Close about">
          ×
        </button>
      </div>

      <div className="about-grid">
        {ABOUT_POINTS.map((pt) => (
          <div className="about-point" key={pt.k}>
            <h3 className="about-point-h">{pt.h}</h3>
            <p className="about-point-p">{pt.p}</p>
          </div>
        ))}
      </div>

      {/* The honest half. Leaving this out would make the rest read like
          marketing, and the first person to check would stop trusting all of
          it — including the parts that are true. */}
      <p className="about-fine">
        <strong>What we're not:</strong> we don't have Yelp's photo library, Google's hours,
        reservations or delivery — and our place data comes from the same public sources they do.
        We're not claiming better data. We're claiming a different job: they help you browse,
        we pick one and show our work. For a long comparison, use Maps. To just eat somewhere
        good tonight, use this.
      </p>
    </section>
  );
}

/* Names for the two tabs plus the signed-out screen, used for both the document
   title and the GA page_path. Keyed by the same ids TABS uses. */
/* Live countdown. Driven off the server's endsAt rather than a local tick, so
   a phone that slept through half the round shows the truth on wake. */
function RoomClock({ endsAt, status }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (status !== "voting") return undefined;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [status]);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const urgent = left <= 15;
  return (
    <div className={`rm-clock${urgent ? " rm-clock--urgent" : ""}`} role="timer" aria-live="off">
      <span className="rm-clock-num">{String(Math.floor(left / 60))}:{String(left % 60).padStart(2, "0")}</span>
    </div>
  );
}

function RoomCard({ card, disabled, vetoUsed, vetoOpen, myName, onYes, onVeto }) {
  const dead = Boolean(card.vetoedBy);
  return (
    <li className={`rm-card${dead ? " rm-card--dead" : ""}${card.myYes ? " rm-card--mine" : ""}`}>
      <div className="rm-card-body">
        <div className="rm-card-head">
          <span className="rm-card-name">{card.name}</span>
          {card.yesCount > 0 && <span className="rm-card-tally">{card.yesCount}</span>}
        </div>
        <span className="rm-card-meta">
          {typeof card.rating === "number" && <>{card.rating.toFixed(1)}★ </>}
          {card.category}
          {typeof card.distanceMiles === "number" && <> · {card.distanceMiles} mi</>}
        </span>
      </div>

      {dead ? (
        /* Second person for your own veto. Seeing your own handle reported back
           at you in the third person breaks the illusion that you did it. */
        <p className="rm-card-dead">
          💣 {card.vetoedBy === myName ? "You" : card.vetoedBy} nuked it
        </p>
      ) : (
        <div className="rm-card-acts">
          <button
            type="button"
            className={`rm-yes${card.myYes ? " rm-yes--on" : ""}`}
            onClick={() => onYes(card.id)}
            disabled={disabled}
            aria-pressed={card.myYes}
          >
            {card.myYes ? "Yes ✓" : "Yes"}
          </button>
          {/* Once the board is down to two, bombs are off for everyone — a
              shield rather than a greyed-out button, because a disabled bomb
              reads as broken while a shield reads as a rule that changed. */}
          {!vetoOpen ? (
            <span className="rm-shield" title="Final two — bombs are off, votes only">🛡️</span>
          ) : (
            <button
              type="button"
              className="rm-veto"
              onClick={() => onVeto(card.id)}
              disabled={disabled || vetoUsed}
              title={vetoUsed ? "You've used your veto" : "Remove this option for everyone"}
            >
              💣
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/* Full document titles per view, not labels appended to a prefix.

   "browse" deliberately keeps the exact string from index.html. That is the
   landing view, so it is the page Google indexes — and because the crawler
   renders JavaScript, anything this effect sets REPLACES the tag in the HTML.
   The previous version retitled it "SavorScout — Browse", which threw away the
   brand and keywords on the one page ranking depends on.

   Brand goes last on the inner views, the usual way round for app screens, and
   the name is spaced ("Savor Scout") because that is how people search it. */
const SEO_TITLE = "Savor Scout | Can't decide where to eat? One pick, not a list.";
const VIEW_TITLES = {
  browse: SEO_TITLE,
  "sign-in": "Sign in — Savor Scout",
  find: "Find somewhere to eat — Savor Scout",
  group: "Dinner Roulette — Savor Scout",
  you: "Your picks — Savor Scout",
};

/* ===========================================================================
   APP
   =========================================================================== */

function App() {
  const [tab, setTab] = useState("find");

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [resolvedLocation, setResolvedLocation] = useState(null);
  const [radiusMode, setRadiusMode] = useState("nearby");
  /* radiusUsed is no longer tracked: the mode now always searches its full
     range, so there is no "settled" radius to report. The result note keys
     off the winner's own distance instead. */
  const [locationError, setLocationError] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [resolvingLocation, setResolvingLocation] = useState(false);

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [resetSent, setResetSent] = useState(false);
  /* Signed out, the app is browsable rather than walled off — the gate appears
     once the one free search has been spent. */
  const [showAuth, setShowAuth] = useState(false);
  const [trialSpent, setTrialSpent] = useState(() => {
    try { return Boolean(window.localStorage.getItem("ss_trial_spent")); }
    catch { return false; }
  });
  /* Open on arrival until it has been dismissed once. The pitch is the first
     thing a new visitor sees; after that it stays one tap away in the header
     rather than re-announcing itself every session. */
  const [aboutOpen, setAboutOpen] = useState(() => {
    try { return window.localStorage.getItem(ABOUT_KEY) !== "1"; }
    catch { return true; }
  });
  const closeAbout = useCallback(() => {
    setAboutOpen(false);
    try { window.localStorage.setItem(ABOUT_KEY, "1"); } catch { /* private mode */ }
  }, []);

  /* ---- group rooms ---- */
  const [roomCode, setRoomCode] = useState(roomCodeFromUrl);
  const [roomPlayerId, setRoomPlayerId] = useState(null);
  const [room, setRoom] = useState(null);
  const [roomBusy, setRoomBusy] = useState(false);
  const [roomError, setRoomError] = useState("");
  const [roomCopied, setRoomCopied] = useState(false);
  /* The browser's copy of "the free search is gone". Purely so the UI can say
     the right thing before the next request — the SERVER holds the real
     allowance, so clearing this key buys nothing. */
  const spendTrial = useCallback(() => {
    setTrialSpent(true);
    try { window.localStorage.setItem("ss_trial_spent", "1"); } catch { /* private mode */ }
  }, []);

  const [roomCraving, setRoomCraving] = useState("");
  const [roomJoinInput, setRoomJoinInput] = useState("");
  const [roomExtras, setRoomExtras] = useState("");

  const [roomStage, setRoomStage] = useState(null); // "searching" | "opening"
  const roomPoll = useRef(null);

  const roomFetch = useCallback(async (path, init) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || "Room unavailable.");
      // Carry any room state the server sent with the refusal.
      if (data.room) err.room = data.room;
      throw err;
    }
    return data;
  }, []);

  /* Joining is automatic and idempotent. Arriving by link, refreshing, or
     coming back from a locked phone all land here; the stored playerId makes
     the server hand back the same seat instead of minting a new one. */
  const joinRoom = useCallback(async (code) => {
    /* Switch tabs BEFORE the request, not after it resolves. Doing it only on
       success meant a dead link left you on Find with the explanation rendered
       on a tab you were never shown — you just landed somewhere random with no
       idea why. Now the loading state and any failure both appear where you
       are actually looking. */
    setTab("group");
    setRoomBusy(true); setRoomError("");
    try {
      let known = null;
      try { known = window.localStorage.getItem(roomKey(code)); } catch { /* private mode */ }
      const data = await roomFetch(`/rooms/${code}/join`, {
        method: "POST",
        body: JSON.stringify({ playerId: known || undefined }),
      });
      try { window.localStorage.setItem(roomKey(code), data.playerId); } catch { /* private mode */ }
      setRoomPlayerId(data.playerId);
      setRoom(data.room);
      setRoomCode(code);
      /* Put the room in the address bar however you got here. Joining by code
         used to leave the URL at "/", so a refresh dropped you out of the room
         and there was nothing to copy back to anyone. */
      if (roomCodeFromUrl() !== code) window.history.replaceState(null, "", `/r/${code}`);
    } catch (e) {
      setRoomError(e.message);
      setRoom(null);
      setRoomCode(null);
      // Drop the dead code out of the URL so a refresh doesn't replay the same
      // failure, and so "Start the vote" leaves a clean address behind.
      if (roomCodeFromUrl()) window.history.replaceState(null, "", "/");
    } finally { setRoomBusy(false); }
  }, [roomFetch]);

  /* One step, not two.
     Hosting used to require running a search on Find first and then coming
     here, which was pure ceremony: building a room runs exactly the same
     search under the hood, so making someone do it by hand first just added a
     detour. The host types a craving here (or taps Surprise us) and this does
     the search and opens the room in one go. */
  const createRoom = useCallback(async (cravingArg) => {
    const craving = String(cravingArg ?? roomCraving).trim();
    if (!craving) { setRoomError("Say what you're in the mood for first."); return; }
    if (!resolvedLocation) { setRoomError("Set your ZIP code so we know where to look."); return; }

    setRoomBusy(true); setRoomError(""); setRoomStage("searching");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || null;
      const sres = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          // Extra details ride along with the craving — the ranker already
          // reads price, dietary and vibe words out of the query text.
          query: [craving, roomExtras.trim()].filter(Boolean).join(", "),
          lat: resolvedLocation.lat,
          lng: resolvedLocation.lng,
          locationHint: resolvedLocation.name,
          zip: resolvedLocation.zip || getZip(),
          // Group rooms always search the wider fixed radius, so a board of
          // five is findable even where the host lives somewhere thin.
          radiusMode: "group",
        }),
      });
      const sdata = await sres.json().catch(() => ({}));
      if (!sres.ok) {
        // A spent free search lands here; send them to the gate rather than
        // leaving an error under a button that will never work again.
        if (sdata.requiresAuth) { spendTrial(); setShowAuth(true); setAuthMode("signup"); }
        throw new Error(sdata.error || "Couldn't build a room from that.");
      }
      if (sdata.trialUsed) spendTrial();
      const candidates = Array.isArray(sdata.roomCandidates) ? sdata.roomCandidates : [];
      if (candidates.length < 2) {
        throw new Error(`Only found ${candidates.length === 1 ? "one place" : "nothing"} near ${sdata.locationName || resolvedLocation.name}. Try a broader craving, or shuffle for one.`);
      }

      setRoomStage("opening");
      const data = await roomFetch("/rooms", {
        method: "POST",
        body: JSON.stringify({
          candidates,
          query: craving,
          locationName: sdata.locationName || resolvedLocation.name,
        }),
      });
      try { window.localStorage.setItem(roomKey(data.code), data.playerId); } catch { /* private mode */ }
      setRoomPlayerId(data.playerId);
      setRoom(data.room);
      setRoomCode(data.code);
      // The address bar becomes the shareable thing, so a refresh or a
      // copied URL both still work.
      window.history.replaceState(null, "", `/r/${data.code}`);
      if (typeof window.gtag === "function") window.gtag("event", "room_create");
    } catch (e) {
      setRoomError(e.message);
    } finally { setRoomBusy(false); setRoomStage(null); }
  }, [roomCraving, roomExtras, resolvedLocation, roomFetch, spendTrial]);

  const startRound = useCallback(async () => {
    if (!roomCode) return;
    try {
      const data = await roomFetch(`/rooms/${roomCode}/start`, {
        method: "POST",
        body: JSON.stringify({ playerId: roomPlayerId }),
      });
      setRoom(data.room);
    } catch (e) { setRoomError(e.message); }
  }, [roomCode, roomPlayerId, roomFetch]);

  const joinByCode = useCallback(() => {
    const code = parseRoomCode(roomJoinInput);
    if (!code) {
      setRoomError("That doesn't look like a room code — they're 6 characters, like MXEAMA.");
      return;
    }
    setRoomJoinInput("");
    joinRoom(code);
  }, [roomJoinInput, joinRoom]);

  /* Shuffling is FREE. It used to open the room immediately, which meant every
     tap of "pick one for us" ran a real search — so browsing for a craving you
     liked burned the daily allowance and cost money per tap. Now it only fills
     the box; opening the room is still a separate, deliberate action.

     Never repeats the craving already showing, or a tap can look broken. */
  const surpriseMe = useCallback(() => {
    const pool = ROOM_CRAVINGS.filter((c) => c !== roomCraving);
    setRoomCraving(pool[Math.floor(Math.random() * pool.length)]);
    setRoomError("");
  }, [roomCraving]);

  const castVote = useCallback(async (cardId, kind) => {
    if (!roomCode || !roomPlayerId) return;
    // Optimistic: the tap must feel instant. The poll reconciles ~900ms later,
    // and the server is authoritative, so a rejected veto simply snaps back.
    setRoom((r) => {
      if (!r || r.status !== "voting") return r;
      return {
        ...r,
        cards: r.cards.map((c) => {
          if (c.id !== cardId) return c;
          if (kind === "veto") return { ...c, vetoedBy: r.me?.name || "You" };
          return { ...c, myYes: !c.myYes, yesCount: c.yesCount + (c.myYes ? -1 : 1) };
        }),
        me: kind === "veto" && r.me ? { ...r.me, vetoUsed: true } : r.me,
      };
    });
    try {
      const data = await roomFetch(`/rooms/${roomCode}/vote`, {
        method: "POST",
        body: JSON.stringify({ playerId: roomPlayerId, cardId, kind }),
      });
      setRoom(data.room);
    } catch (e) {
      setRoomError(e.message);
      /* A refused tap (protected card, veto already spent) now comes back WITH
         the room, so the optimistic change is rolled back from the response
         instead of costing a second round trip. */
      if (e.room) { setRoom(e.room); return; }
      try {
        const data = await roomFetch(`/rooms/${roomCode}?playerId=${roomPlayerId}`);
        setRoom(data.room);
      } catch { /* poll will catch up */ }
    }
  }, [roomCode, roomPlayerId, roomFetch]);

  const lockRoom = useCallback(async () => {
    if (!roomCode) return;
    try {
      const data = await roomFetch(`/rooms/${roomCode}/lock`, {
        method: "POST",
        body: JSON.stringify({ playerId: roomPlayerId }),
      });
      setRoom(data.room);
    } catch { /* poll will catch up */ }
  }, [roomCode, roomPlayerId, roomFetch]);

  const leaveRoom = useCallback(() => {
    setRoom(null); setRoomCode(null); setRoomPlayerId(null); setRoomError("");
    window.history.replaceState(null, "", "/");
  }, []);

  // Auto-join when the page was opened from a shared link.
  useEffect(() => {
    const code = roomCodeFromUrl();
    if (code) joinRoom(code);
  }, [joinRoom]);

  const pullRoom = useCallback(async () => {
    if (!roomCode || !roomPlayerId) return;
    const forCode = roomCode;
    try {
      const data = await roomFetch(`/rooms/${forCode}?playerId=${roomPlayerId}`);
      setRoom((prev) => {
        /* Two guards, and the code check is the important one. Version numbers
           are per-room and both start at 1, so a poll still in flight for the
           room you just left could otherwise land on top of the room you just
           joined — same shape, completely wrong contents. */
        if (prev && prev.code !== forCode) return prev;
        if (prev && prev.code === data.room.code && data.room.version < prev.version) return prev;
        return data.room;
      });
    } catch { /* transient — the next tick retries */ }
  }, [roomCode, roomPlayerId, roomFetch]);

  /* Poll only while a vote is actually running, and only while the tab is
     visible. A finished room is static and a backgrounded one is not being
     looked at, so either case is pure battery and data burn.

     The visibilitychange handler is the other half of that: the host almost
     always leaves to paste the link and comes straight back, and returning to
     a stale board would make the whole thing feel broken. Coming back pulls
     immediately instead of waiting out the interval. */
  useEffect(() => {
    clearInterval(roomPoll.current);
    // Lobby polls too: watching names appear as friends tap the link is the
    // whole reason the wait is tolerable, and joiners need to see the round
    // start the moment the host presses go. Only a finished room is static.
    const live = room?.status === "lobby" || room?.status === "voting";
    if (!roomCode || !roomPlayerId || !live) return undefined;

    roomPoll.current = setInterval(() => { if (!document.hidden) pullRoom(); }, ROOM_POLL_MS);
    const onVisible = () => { if (!document.hidden) pullRoom(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(roomPoll.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [roomCode, roomPlayerId, room?.status, pullRoom]);

  const shareRoom = useCallback(async () => {
    const url = `${window.location.origin}/r/${roomCode}`;
    const text = `Dinner Roulette — vote on where we're eating. 90 seconds.`;
    try {
      if (navigator.share) { await navigator.share({ title: "SavorScout", text, url }); return; }
    } catch { /* user dismissed the sheet */ }
    try {
      await navigator.clipboard.writeText(url);
      setRoomCopied(true);
      setTimeout(() => setRoomCopied(false), 1800);
    } catch { /* clipboard blocked; the code is on screen to type */ }
  }, [roomCode]);


  /* ---- analytics: one page_view per view ----

     This app navigates by state, not by URL, so the address bar never changes
     and gtag's automatic hit would report a single page_view per session with
     no idea that Find and You are different screens. Each view is therefore
     also sent from here.

     The first one is skipped: gtag.js already sent a page_view for the landing
     view, and firing again here would double count entry. Held until
     authChecked so the boot flash of the signed-out shell is not reported. */
  /* Browsing signed out is now its own view, and worth separating from the gate
     — the ratio between /browse and /sign-in is the conversion this change
     exists to move. */
  /* "browse" stays the LANDING view so the indexed page keeps its SEO title.
     Group is broken out even when signed out, both so the tab is titled
     honestly and so GA can see /group separately — signed-out group traffic is
     precisely the number that says whether the shared-link loop is working. */
  const viewKey = user
    ? tab
    : showAuth ? "sign-in"
    : tab === "group" ? "group"
    : "browse";
  const firstViewSent = useRef(false);
  useEffect(() => {
    if (!authChecked) return;
    const title = VIEW_TITLES[viewKey] || SEO_TITLE;
    document.title = title;
    if (!firstViewSent.current) { firstViewSent.current = true; return; }
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_title: title,
      /* Synthetic paths. The URL genuinely never changes, so these exist to
         give the reports something to separate the views by. */
      page_location: `${window.location.origin}/${viewKey}`,
      page_path: `/${viewKey}`,
    });
  }, [viewKey, authChecked]);

  const [searchesRemaining, setSearchesRemaining] = useState(null);

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [allergies, setAllergies] = useState("");
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");

  const [pendingVerdicts, setPendingVerdicts] = useState([]);
  const [verdictBusy, setVerdictBusy] = useState(false);

  const [game, setGame] = useState(null);
  const [history, setHistory] = useState({ history: [], stats: null });

  const [share, setShare] = useState(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  // navigator.share must be called synchronously inside the click to keep the
  // user-gesture, so the handler reads the latest card from a ref rather than
  // closing over state.
  const shareRef = useRef(null);
  useEffect(() => { shareRef.current = share; }, [share]);
  const [toast, setToast] = useState(null);

  const [showMetrics, setShowMetrics] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const searchAbortRef = useRef(null);

  /* ---- auth ---- */

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => { cancelled = true; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) { setOnboardingChecked(false); setNeedsOnboarding(false); return undefined; }
    let cancelled = false;
    supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("onboarding check:", error);
        setNeedsOnboarding(!data?.onboarding_completed);
        setOnboardingChecked(true);
      });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => () => searchAbortRef.current?.abort(), []);

  const authedFetch = useCallback(async (path, init = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return null;
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    });
    if (!res.ok) return null;
    return res.json().catch(() => null);
  }, []);

  const flash = useCallback((award) => {
    if (!award?.gained) return;
    setToast({ amount: award.gained, leveledUp: award.leveledUp, rank: award.level?.rank });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const refreshGame = useCallback(async () => {
    const state = await authedFetch("/game/state");
    if (state) setGame(state);
  }, [authedFetch]);

  /* Every search already writes a verdict row, so the history is that table
     read back — no second store to drift out of sync with it. */
  const refreshHistory = useCallback(async () => {
    const data = await authedFetch("/verdicts/history");
    if (data) setHistory(data);
  }, [authedFetch]);

  const refreshLoop = useCallback(async () => {
    const pending = await authedFetch("/verdicts/pending");
    if (pending?.pending) setPendingVerdicts(pending.pending);
  }, [authedFetch]);

  useEffect(() => {
    if (!user || needsOnboarding || !onboardingChecked) return;
    // Mark them as having been here, so the next visit opens on the map.
    // Set after onboarding clears, or a half-finished signup would count.
    try { window.localStorage.setItem("ss_returning", "1"); } catch { /* private mode */ }
    refreshLoop().catch(() => {});
    refreshGame().catch(() => {});
    refreshHistory().catch(() => {});
  }, [user, needsOnboarding, onboardingChecked, refreshLoop, refreshGame, refreshHistory]);

  const track = useCallback(async (kind, payload) => {
    try {
      const res = await authedFetch("/events", { method: "POST", body: JSON.stringify({ kind, payload: payload || null }) });
      if (res?.award) { flash(res.award); refreshGame().catch(() => {}); }
    } catch { /* telemetry never surfaces an error */ }
  }, [authedFetch, flash, refreshGame]);

  /* ---- taste quiz ----
     Opened by hand from You, and once automatically the first time someone
     lands signed-in with nothing recorded. Auto-opening on every visit would
     make the app feel like it wants something from you before it gives you
     anything. */
  /* ?quiz=1 opens it directly. Useful for sharing the quiz on its own, and it
     is the only way to reach the modal without first getting through auth —
     which otherwise makes the whole feature untestable. */
  const [quizOpen, setQuizOpen] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("quiz") === "1"; }
    catch { return false; }
  });
  const [quizState, setQuizState] = useState(() => quizStatus());
  const quizAutoShown = useRef(false);

  useEffect(() => {
    if (!user || !onboardingChecked || needsOnboarding) return;
    if (quizAutoShown.current) return;
    quizAutoShown.current = true;
    const st = quizStatus();
    setQuizState(st);
    if (st.phase === "ready" && st.day === 1) {
      // Let the app paint first, so the modal arrives over a real page.
      const t = setTimeout(() => setQuizOpen(true), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [user, onboardingChecked, needsOnboarding]);

  /* The quiz is only worth taking if it changes results, so each finished day
     is pushed to the profile the recommender already reads. Fire and forget —
     a failed write must never block the reveal. */
  const onQuizComplete = useCallback((scores) => {
    setQuizState(quizStatus());
    if (typeof window.gtag === "function") {
      window.gtag("event", "quiz_day_done", { dims: Object.keys(scores).length });
    }
    authedFetch("/taste/quiz", { method: "POST", body: JSON.stringify({ scores }) }).catch(() => {});
  }, [authedFetch]);

  const onQuizShare = useCallback(async (p) => {
    const text = `I'm ${p.name} on SavorScout — ${p.tagline}`;
    const url = `${window.location.origin}/`;
    try {
      if (navigator.share) { await navigator.share({ title: "SavorScout", text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`);
      flash?.({ amount: 0 });
    } catch { /* dismissed */ }
  }, [flash]);

  /* Answering a prediction. Resolves in its own frame because the grading
     moment IS the mechanic — routing it through a generic handler would clear

  /* Retire the card optimistically. Clearing the result and waiting on the
     refetch would flash the already-answered pair back onto the screen for a
     frame, which reads as the tap having failed. */
  /* ---- share card ---- */

  const openShare = useCallback(async (winner) => {
    setShare({ busy: true });
    track("share_open", { verdictId: winner?.id, name: winner?.name });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { canvas, fields, usedPhoto } = await renderShareCard(winner, query, {
        apiBase: API_BASE_URL,
        token: session?.access_token || "",
      });
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);

      // Feature-detect file sharing properly. Chrome desktop exposes
      // navigator.share but refuses files, so checking share alone would
      // offer a button that always fails.
      const file = new File([blob], `savorscout-${slugify(fields.name)}.png`, { type: "image/png" });
      const canNativeShare = Boolean(navigator.canShare?.({ files: [file] }));

      setShare({ url, blob, file, fields, usedPhoto, canNativeShare, busy: false, caption: buildCaption(fields) });
    } catch (err) {
      console.error("share card failed:", err);
      setShare({ busy: false, error: "Couldn't build a card for this one. Try another search." });
    }
  }, [query, track]);

  const closeShare = useCallback(() => {
    setShare((s) => { if (s?.url) URL.revokeObjectURL(s.url); return null; });
  }, []);

  const downloadShare = useCallback(() => {
    setShare((s) => {
      if (!s?.url) return s;
      const a = document.createElement("a");
      a.href = s.url;
      a.download = `savorscout-${slugify(s.fields?.name || "pick")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return s;
    });
    track("share_download");
  }, [track]);

  /* Instagram strips text from a file share, so on the platform this card is
     sized for, Copy is the only route the caption can actually take. */
  const copyCaption = useCallback(async () => {
    const s = shareRef.current;
    if (!s?.caption) return;
    try {
      await navigator.clipboard.writeText(s.caption);
    } catch {
      // Older Safari and any non-secure origin reject the async clipboard.
      const ta = document.createElement("textarea");
      ta.value = s.caption;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* nothing more to try */ }
      ta.remove();
    }
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
    track("share_caption_copy");
  }, [track]);

  const nativeShare = useCallback(async () => {
    const s = shareRef.current;
    if (!s?.file) return;
    try {
      // The caption travels with the image. Instagram ignores text on a
      // file share, which is exactly why Copy caption exists beside this.
      await navigator.share({
        files: [s.file],
        title: s.fields?.name || "My pick",
        text: s.caption || "",
      });
      track("share_native");
    } catch { /* user dismissed the OS sheet — not an error */ }
  }, [track]);



  const answerVerdict = async (id, answer) => {
    if (verdictBusy) return;
    setVerdictBusy(true);
    setPendingVerdicts((p) => p.filter((v) => v.id !== id));
    try {
      const res = await authedFetch("/verdicts/feedback", { method: "POST", body: JSON.stringify({ id, ...answer }) });
      if (res?.award) flash(res.award);
      refreshGame().catch(() => {});
    } finally { setVerdictBusy(false); }
  };

  /* ---- auth handlers ---- */

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (authBusy) return;
    setAuthError(""); setAuthNotice(""); setResetSent(false);
    if (!email.trim() || !password.trim()) { setAuthError("Enter both email and password."); return; }

    setAuthBusy(true);
    try {
      if (authMode === "signup") {
        try {
          const check = await fetch(`${API_BASE_URL}/auth/check-email`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim() }),
          });
          if (check.ok) {
            const d = await check.json();
            if (d.exists) { setAuthError("An account with this email already exists. Sign in instead."); setAuthMode("signin"); return; }
          }
        } catch (err) { console.error("email check:", err); }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) { setAuthError(error.message); return; }
        const ids = data?.user?.identities;
        if (data?.user && Array.isArray(ids) && ids.length === 0) {
          setAuthError("An account with this email already exists. Try signing in."); setAuthMode("signin"); return;
        }
        setAuthNotice("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setAuthError(error.message);
      }
    } finally { setAuthBusy(false); }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(""); setAuthNotice("");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) setAuthError(error.message);
  };

  const handleForgotPassword = async () => {
    setAuthError(""); setAuthNotice(""); setResetSent(false);
    if (!email.trim()) { setAuthError('Enter your email above first, then click "Forgot password?"'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    if (error) setAuthError(error.message); else setResetSent(true);
  };

  const switchAuthMode = (m) => { setAuthMode(m); setAuthError(""); setAuthNotice(""); setResetSent(false); };

  const handleSignOut = async () => {
    searchAbortRef.current?.abort();
    await supabase.auth.signOut();
    setResults([]); setQuery(""); setSubmittedQuery(""); setErrorMsg("");
    setSearchesRemaining(null); setOnboardingChecked(false); setNeedsOnboarding(false);
    setAllergies(""); setDietaryPreferences(""); setOnboardingError("");
    setLocationInput(""); setResolvedLocation(null); setLocationError("");
    setPendingVerdicts([]); setGame(null);
    setHistory({ history: [], stats: null });
    setTab("find");
  };

  const handleSaveOnboarding = async () => {
    if (!user || onboardingSaving) return;
    setOnboardingSaving(true); setOnboardingError("");

    const base = {
      id: user.id,
      allergies: allergies.trim(),
      dietary_preferences: dietaryPreferences.trim(),
      onboarding_completed: true,
    };

    let { error } = await supabase.from("profiles").upsert({ ...base, email: user.email ?? null }, { onConflict: "id" });
    if (error && (error.code === "PGRST204" || /email/i.test(error.message || ""))) {
      console.warn("profiles has no email column — saving without it.");
      ({ error } = await supabase.from("profiles").upsert(base, { onConflict: "id" }));
    }
    if (error) { console.error("save prefs:", error); setOnboardingError(explainSaveError(error)); }
    else setNeedsOnboarding(false);
    setOnboardingSaving(false);
  };

  /* ---- location: keyless provider chain, zero configuration ---- */

  const zipProviders = useMemo(() => [
    async (zip) => {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!res.ok) return null;
      const d = await res.json();
      const p = d?.places?.[0];
      if (!p) return null;
      const lat = parseFloat(p.latitude), lng = parseFloat(p.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const city = p["place name"], state = p.state;
      if (!city) return null;
      return { name: state ? `${city}, ${state}` : city, short: city, lat, lng };
    },
    async (zip) => {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&country=us&postalcode=${encodeURIComponent(zip)}`);
      if (!res.ok) return null;
      const d = await res.json();
      const hit = Array.isArray(d) ? d[0] : null;
      if (!hit) return null;
      const lat = parseFloat(hit.lat), lng = parseFloat(hit.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const a = hit.address || {};
      const city = a.city || a.town || a.village || a.hamlet || a.suburb || a.county;
      if (!city) return null;
      return { name: a.state ? `${city}, ${a.state}` : city, short: city, lat, lng };
    },
    async (zip) => {
      if (!MAPBOX_TOKEN) return null;
      const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(zip)}&country=US&types=postcode&limit=1&access_token=${MAPBOX_TOKEN}`);
      if (!res.ok) return null;
      const d = await res.json();
      const f = Array.isArray(d?.features) ? d.features[0] : null;
      if (!f) return null;
      const [lng, lat] = f.geometry?.coordinates || [];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const pr = f.properties || {}, ctx = pr.context || {};
      const name = pr.place_formatted || [ctx.place?.name, ctx.region?.name].filter(Boolean).join(", ") || pr.name || zip;
      return { name, short: ctx.place?.name || pr.name || name, lat, lng };
    },
  ], []);

  const lookupZip = useCallback(async (zip) => {
    let responded = false;
    for (const provider of zipProviders) {
      try {
        const r = await provider(zip);
        responded = true;
        if (r) return { ok: true, location: r };
      } catch (err) { console.warn("zip provider failed, trying next:", err.message); }
    }
    return { ok: false, reason: responded ? "not_found" : "network" };
  }, [zipProviders]);

  /* Anywhere, not just a US ZIP.
     The old rule rejected anything that was not five digits before it even
     asked, which meant a city name, a UK or Canadian postcode, and every
     address outside the US failed at the input box. Now anything is sent to
     the server, which disambiguates postcode-shaped input by country and
     falls back to free-text search. The old US-only providers stay as a
     fallback for the case where our own backend is unreachable. */
  const applyLocation = async () => {
    const q = locationInput.trim();
    if (resolvingLocation) return;
    if (q.length < 2) { setLocationError("Type a city, postcode, or address."); return; }

    setLocationError(""); setResolvingLocation(true);
    try {
      try {
        const res = await fetch(`${API_BASE_URL}/geocode?q=${encodeURIComponent(q)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.location) {
          setResolvedLocation({ ...data.location, zip: /^\d{5}$/.test(q) ? q : "" });
          setLocationInput("");
          if (/^\d{5}$/.test(q)) setZip(q);
          return;
        }
        if (res.status === 404) { setLocationError(`Couldn't find "${q}". Try adding the city or country.`); return; }
      } catch { /* our backend is down — fall through to the direct providers */ }

      if (/^\d{5}$/.test(q)) {
        const result = await lookupZip(q);
        if (result.ok) {
          setResolvedLocation({ ...result.location, zip: q });
          setLocationInput("");
          setZip(q);
          return;
        }
      }
      setLocationError("Couldn't reach the location service — check your connection.");
    } finally { setResolvingLocation(false); }
  };

  /* The path that actually makes this work everywhere: no typing, no postcode
     format to get wrong, and correct in countries whose address formats we
     could never parse. Permission is requested only on an explicit tap. */
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("This browser can't share your location — type a place instead.");
      return;
    }
    setLocationError(""); setResolvingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(`${API_BASE_URL}/geocode/reverse?lat=${lat}&lng=${lng}`);
          const data = await res.json().catch(() => ({}));
          // Even if naming it fails, the coordinates are what the search needs.
          setResolvedLocation(data.location || { name: "Your location", short: "Nearby", lat, lng, zip: "" });
          setLocationInput("");
        } catch {
          setResolvedLocation({ name: "Your location", short: "Nearby", lat, lng, zip: "" });
        } finally { setResolvingLocation(false); }
      },
      (err) => {
        setResolvingLocation(false);
        setLocationError(err.code === err.PERMISSION_DENIED
          ? "Location permission denied — type a city or postcode instead."
          : "Couldn't get your location — type a city or postcode instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  /* ---- search ---- */

  const handleSearch = async () => {
    if (loading || !query.trim()) return;
    if (!resolvedLocation) { setErrorMsg("Set your ZIP code first."); return; }

    setErrorMsg(""); setLoading(true);
    setShowMetrics(false); setShowCompare(false); setShowMap(false);

    try {
      /* Signed out is a legitimate state here: the first search is free. The
         Authorization header is simply omitted and the server decides, which
         is the only place that decision can actually be enforced. */
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || null;

      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      const trimmed = query.trim();
      const response = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: trimmed,
          lat: resolvedLocation.lat,
          lng: resolvedLocation.lng,
          locationHint: resolvedLocation.name,
          zip: resolvedLocation.zip || getZip(),
          radiusMode,
        }),
        signal: controller.signal,
      });

      let data = {};
      try { data = await response.json(); } catch { data = {}; }

      if (response.status === 429) {
        setErrorMsg(data.error || "You've hit your search limit for today.");
        setSearchesRemaining(0); setResults([]);
      } else if (response.status === 401) {
        /* The server is the gate; this branch only mirrors its verdict. A spent
           trial sends them straight to signup rather than leaving an error
           sitting under a search box that will never work again. */
        if (data.requiresAuth) {
          spendTrial();
          setShowAuth(true);
          setAuthMode("signup");
          if (typeof window.gtag === "function") {
            window.gtag("event", "sign_up_prompt", { from: "trial_exhausted" });
          }
        }
        setErrorMsg(data.error || "Please sign in again."); setResults([]);
      } else if (!response.ok) {
        setErrorMsg(data.error || `Something went wrong (${response.status}).`); setResults([]);
      } else if (!data.restaurants || data.restaurants.length === 0) {
        setErrorMsg(data.outOfRange
          ? `Nothing within ${data.maxRadiusMiles || 25} miles of ${resolvedLocation.name} — closest was about ${data.nearestMiles} mi out. Try "Anywhere worth it" or a different ZIP.`
          : `No match near ${resolvedLocation.name} — try a different craving.`);
        setResults([]);
        if (data.trialUsed) spendTrial();
        if (typeof data.searchesRemaining === "number") setSearchesRemaining(data.searchesRemaining);
      } else {
        setResults(data.restaurants.slice(0, 1));
        setSubmittedQuery(trimmed);
        /* The server flags a search it served anonymously. That is the moment
           the free one is gone, so the UI stops promising another. */
        if (data.trialUsed) spendTrial();
        if (typeof data.searchesRemaining === "number") setSearchesRemaining(data.searchesRemaining);
        refreshGame().catch(() => {});
        refreshHistory().catch(() => {});
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("search failed:", error);
      setErrorMsg("Couldn't reach the server. Is it running?");
      setResults([]);
    } finally { setLoading(false); }
  };

  const winner = results[0];
  const chips = useMemo(() => (winner ? buildChips(winner) : []), [winner]);
  const streakDays = game?.streak?.days ?? 0;
  const tierInfo = useMemo(() => nextTierInfo(streakDays), [streakDays]);

  /* ---- shells ---- */

  const Ambient = (
    <>
      <div className="ambient" aria-hidden="true">
        <div className="ambient-blob ambient-blob--1" />
        <div className="ambient-blob ambient-blob--2" />
        <div className="ambient-blob ambient-blob--3" />
      </div>
      <div className="grain" aria-hidden="true" />
    </>
  );

  if (!authChecked) {
    return <div className="app">{Ambient}<p className="center-note">Loading…</p></div>;
  }

  /* ---- the gate ----

     Only reached once a signed-out visitor asks for something that needs an
     account. Everyone else falls through to the main app below, where the
     signedOut flag turns the search into a sign-in prompt. */

  if (!user && showAuth) {
    return (
      <div className="app">
        {Ambient}
        <div className="shell">
          <header className="topbar">
            <div className="logo">
              <LogoMark />
              <span className="logo-word">SavorScout</span>
            </div>
          </header>

          <section className="gate">
            {/* A way back out. Without it the gate is a dead end for anyone who
                only meant to look around. */}
            <button type="button" className="link-btn gate-back" onClick={() => setShowAuth(false)}>
              ← Back to browsing
            </button>
            <p className="hero-kicker">Sign in to find your one</p>
            <h1 className="hero-title">Skip the scroll.<em>Get the one.</em></h1>

            <form onSubmit={handleAuthSubmit} className="gate-form">
              <input type="email" placeholder="Email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
              <input type="password" placeholder="Password" value={password}
                     autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                     onChange={(e) => setPassword(e.target.value)} />
              <button type="submit" className="btn btn--hot btn--block" disabled={authBusy}>
                {authBusy ? "Working…" : authMode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            <button type="button" className="google" onClick={handleGoogleSignIn}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20H42v-.1H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-4z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20H42v-.1H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-4z" />
              </svg>
              Continue with Google
            </button>

            {authMode === "signin" && (
              <p className="gate-alt">
                <button type="button" className="link-btn" onClick={handleForgotPassword}>Forgot password?</button>
              </p>
            )}
            {resetSent && <p className="notice">If an account exists for that email, a reset link has been sent.</p>}

            <p className="gate-alt">
              {authMode === "signup" ? "Already have an account? " : "Need an account? "}
              <button type="button" className="link-btn" onClick={() => switchAuthMode(authMode === "signup" ? "signin" : "signup")}>
                {authMode === "signup" ? "Sign in" : "Sign up"}
              </button>
            </p>

            {authNotice && <p className="notice">{authNotice}</p>}
            {authError && <p className="err">{authError}</p>}
          </section>

        <footer className="foot">© 2026 SavorScout</footer>
        </div>
      </div>
    );
  }

  /* Both onboarding gates are for signed-in users only. onboardingChecked is
     reset to false whenever there is no user, so without the `user &&` guard a
     signed-out visitor would sit on "Loading…" forever instead of reaching the
     browsable app below. */

  if (user && !onboardingChecked) {
    return <div className="app">{Ambient}<p className="center-note">Loading…</p></div>;
  }

  /* ---- onboarding: allergies and dietary preferences ---- */

  if (user && needsOnboarding) {
    return (
      <div className="app">
        {Ambient}
        <div className="shell">
          <header className="topbar">
            <div className="logo">
              <LogoMark />
              <span className="logo-word">SavorScout</span>
            </div>
          </header>

          <section className="gate">
            <p className="hero-kicker">One last thing</p>
            <h1 className="hero-title"><em>Tell us what you need.</em></h1>
            <p className="page-sub" style={{ marginBottom: 26 }}>
              Allergies or dietary preferences? We factor them into every match. Leave a box blank if it
              doesn't apply.
            </p>

            <div className="onb-card">
              <div className="field">
                <label htmlFor="onb-a">Allergies</label>
                <textarea id="onb-a" rows={3} placeholder="peanuts, shellfish, dairy…"
                          value={allergies} onChange={(e) => setAllergies(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="onb-d">Dietary preferences</label>
                <textarea id="onb-d" rows={3} placeholder="vegetarian, gluten-free, keto…"
                          value={dietaryPreferences} onChange={(e) => setDietaryPreferences(e.target.value)} />
              </div>
              <button className="btn btn--hot btn--block" onClick={handleSaveOnboarding} disabled={onboardingSaving}>
                {onboardingSaving ? "Saving…" : "Continue"}
              </button>
              {onboardingError && <p className="err">{onboardingError}</p>}
            </div>
          </section>

          <footer className="foot">© 2026 SavorScout</footer>
        </div>
      </div>
    );
  }

  /* ---- main ---- */

  const level = game?.level;
  /* Signed out there is no level, no streak and no history, so the You tab has
     nothing to show — Find is the whole surface until someone signs in. */
  const signedOut = !user;
  /* Signed out with the free search already spent. The server enforces this;
     the flag only decides what the page says. */
  const trialWall = signedOut && trialSpent;
  /* Group is available signed out — someone handed a link in a group chat has
     to be able to play without an account, or the whole loop dies at the door.
     You still needs an account, since it has nothing to show without one. */
  const visibleTabs = signedOut
    ? TABS.filter((t) => t.id === "find" || t.id === "group")
    : TABS.filter((t) => (level?.level ?? 1) >= t.minLevel);
  const activeTab = signedOut && tab === "you" ? "find" : tab;
  // The only outstanding thing left is an ungraded pick.
  const openWork = pendingVerdicts.length;

  return (
    <div className="app">
      {Ambient}

      <div className="shell">
        <header className="topbar">
          <div className="logo">
            <LogoMark />
            <span className="logo-word">SavorScout</span>
          </div>

          <nav className="nav" role="tablist">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`nav-tab${tab === t.id ? " nav-tab--on" : ""}`}
                onClick={() => { setTab(t.id); track("tab_view", { tab: t.id }); }}
              >
                {t.label}
                {t.id === "today" && tab !== "today" && openWork > 0 && <span className="nav-tab-dot" />}
              </button>
            ))}
          </nav>

          <div className="topbar-right">
            <button
              className={`about-btn${aboutOpen ? " about-btn--on" : ""}`}
              onClick={() => (aboutOpen ? closeAbout() : setAboutOpen(true))}
              aria-expanded={aboutOpen}
            >
              About
            </button>
            {signedOut ? (
              <button className="btn btn--hot topbar-signin" onClick={() => setShowAuth(true)}>
                Sign in
              </button>
            ) : (
              <>
                <Flame days={streakDays} />
                <LevelRing level={level} />
                <button className="signout" onClick={handleSignOut}>Sign out</button>
              </>
            )}
          </div>
        </header>

        {/* The asterisk note. Sits directly under the header so it is the first
            thing read, and is a button in full so the whole line is the way in
            rather than a label with a link buried in it.

            The wording tracks the actual state. Saying "sign in to search"
            while a free search is still available would be a lie the very next
            click disproves, so that line only appears once it is true. */}
        {/* Also hidden in a room: a signup nudge is irrelevant to someone who
            came to vote, and it costs vertical space the cards need. */}
        {signedOut && !room && (
          <button
            type="button"
            className={`signedout-note${trialWall ? " signedout-note--spent" : ""}`}
            onClick={() => { setShowAuth(true); if (trialWall) setAuthMode("signup"); }}
          >
            <span className="signedout-star" aria-hidden="true">*</span>
            {trialWall ? (
              <>You are not signed in. <strong>Sign up to keep searching</strong></>
            ) : (
              <>You are not signed in. <strong>One free search</strong>, then sign up to keep going</>
            )}
          </button>
        )}


        <ShareSheet
          state={share}
          onClose={closeShare}
          onDownload={downloadShare}
          onShare={nativeShare}
          onCopy={copyCaption}
          copied={captionCopied}
        />

        {toast && (
          <div className={`toast${toast.leveledUp ? " toast--level" : ""}`} role="status">
            <span className="toast-xp">+{toast.amount} XP</span>
            {toast.leveledUp && <span className="toast-rank">{toast.rank}</span>}
          </div>
        )}

        {/* Above the hero on purpose: this is the answer to the question every
            first-time visitor arrives with, and it is worthless below the fold.

            Suppressed inside a room. Someone who tapped a link in a group chat
            is mid-game with a clock running — measured on a 375px screen, the
            panel pushed the first card below the fold, so the pitch was
            physically standing between them and voting. The room IS the pitch
            at that point; About is one tap away in the header afterwards. */}
        {aboutOpen && !room && <AboutPanel onClose={closeAbout} />}

        {/* ================= TODAY ================= */}
        {/* activeTab, not tab: signing out while on You would otherwise leave
            the page blank, since the You tab is hidden but the state persists. */}
        {activeTab === "find" && (
          <main className="page page--wide">
            <div className="hero-search">
              <p className="hero-kicker">Say what you're craving</p>
              <h1 className="hero-title">Skip the scroll.<em>Get the one.</em></h1>

              <div className="searchbar">
                <input
                  type="text"
                  placeholder="cheap sushi, spicy ramen, best wings…"
                  value={query}
                  maxLength={300}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                />
                {/* Once the free search is spent the button stops pretending to
                    search and becomes the signup ask, so the wall is stated
                    before the click rather than as an error after it. */}
                <button
                  className="btn btn--hot"
                  onClick={trialWall ? () => { setShowAuth(true); setAuthMode("signup"); } : handleSearch}
                  disabled={trialWall ? false : (loading || !query.trim() || !resolvedLocation)}
                >
                  {trialWall ? "Sign up to keep searching" : loading ? "Searching…" : "Find my one"}
                </button>
              </div>

              <div className="loc">
                {resolvedLocation ? (
                  <div className="loc-set">
                    <span className="loc-key">Near</span>
                    <span className="loc-val">{resolvedLocation.name}</span>
                    <button className="link-btn" style={{ marginLeft: "auto" }}
                            onClick={() => { setResolvedLocation(null); setLocationError(""); }}>
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="loc-prompt">Where are you? City, postcode, or address — anywhere in the world.</span>
                    <div className="loc-row">
                      <input
                        type="text" maxLength={120} autoComplete="off"
                        placeholder="Hicksville NY · Paris · SW1A 1AA" value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") applyLocation(); }}
                      />
                      <button className="btn btn--ghost" onClick={applyLocation}
                              disabled={resolvingLocation || locationInput.trim().length < 2}>
                        {resolvingLocation ? "Checking…" : "Set"}
                      </button>
                    </div>
                    <button type="button" className="link-btn loc-gps" onClick={useMyLocation} disabled={resolvingLocation}>
                          📍 Use my current location
                        </button>
                        {locationError && <p className="err">{locationError}</p>}
                  </>
                )}
              </div>

              {resolvedLocation && (
                <div className="radius">
                  {RADIUS_MODES.map((m) => (
                    <button key={m.id}
                            className={`radius-opt${radiusMode === m.id ? " radius-opt--on" : ""}`}
                            onClick={() => setRadiusMode(m.id)}>
                      <span className="radius-name">{m.label}</span>
                      <span className="radius-hint">{m.hint}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* The daily allowance belongs to an account. Signed out, the
                  only number that means anything is the free one, and the
                  asterisk line above already says that. */}
              {!signedOut && searchesRemaining !== null && (
                <p className="searches-left">{searchesRemaining} search{searchesRemaining === 1 ? "" : "es"} left today</p>
              )}
              {errorMsg && <p className="err">{errorMsg}</p>}
            </div>

            {winner && (
              <div className="verdict-wrap">
                <article className="verdict">
                  <div className="verdict-banner">
                    <span className="verdict-tag">Your one</span>
                    {submittedQuery && <span className="verdict-q">"{submittedQuery}"</span>}
                  </div>

                  {/* There is no "widening" any more — the mode searches its
                      full range every time, so comparing radiusUsed to the
                      first tier was always true and the old note always lied.
                      What is worth saying is when the winner itself sits past
                      the comfortable distance, which is a fact about this
                      result rather than about the search. */}
                  {typeof winner.distanceMiles === "number" &&
                    winner.distanceMiles > RADIUS_FIRST_TIER[radiusMode] && (
                      <p className="verdict-note">
                        Nothing better within {RADIUS_FIRST_TIER[radiusMode]} mi — this one's{" "}
                        {winner.distanceMiles} mi out, and worth it.
                      </p>
                    )}

                  <div className="split">
                    <div className="pane-visual">
                      <div className="shot">
                        {winner.imageUrl
                          ? <img src={winner.imageUrl} alt={winner.name} loading="lazy" referrerPolicy="no-referrer" />
                          : <span className="shot-mono">{(winner.name || "?").charAt(0).toUpperCase()}</span>}
                        <div className="score">
                          <CountUp className="score-n" value={winner.matchScore} />
                          <span className="score-k">match</span>
                        </div>
                        {winner.imageSourceUrl && (
                          <a className="shot-src" href={winner.imageSourceUrl} target="_blank" rel="noreferrer">Photo source</a>
                        )}
                      </div>

                      <p className="verdict-line">{verdictLine(winner)}</p>

                      <div className="actions">
                        <a className="act act--go" href={mapsUrl(winner)} target="_blank" rel="noreferrer"
                           onClick={() => track("directions_click", { verdictId: winner.id, name: winner.name })}>
                          Directions
                        </a>
                        {winner.website && (
                          <a className="act" href={winner.website} target="_blank" rel="noreferrer"
                             onClick={() => track("site_click", { verdictId: winner.id, name: winner.name })}>
                            Menu
                          </a>
                        )}
                        {winner.phone && (
                          <a className="act" href={`tel:${winner.phone.replace(/[^\d+]/g, "")}`}
                             onClick={() => track("call_click", { verdictId: winner.id })}>
                            Call
                          </a>
                        )}
                        <button className="act act--share" onClick={() => openShare(winner)}>
                          Share
                        </button>
                      </div>

                      {typeof winner.lat === "number" && (
                        <div style={{ padding: "14px 22px 0" }}>
                          <button className="toggle" onClick={() => { setShowMap((s) => !s); track("map_open", { verdictId: winner.id }); }}>
                            {showMap ? "Hide map" : "Show map"}
                          </button>
                          {showMap && (
                            <div className="mapbox">
                              <iframe title={`Map of ${winner.name}`} src={osmEmbedUrl(winner.lat, winner.lng)}
                                      width="100%" height="180" style={{ border: 0, display: "block" }} loading="lazy" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pane-detail">
                      <h2 className="name">{winner.name}</h2>

                      <div className="rowmeta">
                        {typeof winner.rating === "number"
                          ? <span className="rating">{winner.rating.toFixed(1)}★ {winner.reviewCount ? `(${winner.reviewCount.toLocaleString()})` : ""}</span>
                          : <span>Not yet widely rated</span>}
                        {winner.category && <><span className="sep">·</span><span>{winner.category}</span></>}
                        {distanceLabel(winner) && <><span className="sep">·</span><span>{distanceLabel(winner)}</span></>}
                      </div>

                      {winner.address && <p className="addr">{winner.address}</p>}

                      {chips.length > 0 && (
                        <>
                          <span className="why-key">Why this won</span>
                          <div className="chips">
                            {chips.map((c, i) => <span className="chip" key={i}>{c}</span>)}
                          </div>
                        </>
                      )}

                      <Evidence
                        evidence={winner.evidence}
                        reception={winner.reception}
                        review={winner.review}
                        menuItems={winner.menuItems}
                        rating={winner.rating}
                        dietary={winner.matchedDietaryTerms}
                        allergy={winner.matchedAllergyTerms}
                      />

                      <div className="toggles">
                        <button className="toggle" onClick={() => { setShowMetrics((s) => !s); track("breakdown_open", { verdictId: winner.id }); }}>
                          {showMetrics ? "Hide numbers" : "How we scored this"}
                        </button>
                        {winner.runnerUps?.length > 0 && (
                          <button className="toggle" onClick={() => { setShowCompare((s) => !s); track("comparisons_open", { verdictId: winner.id }); }}>
                            {/* States which pool the runners-up came out of, so
                                "Top 3" next to "Best of 7" reads as a subset
                                rather than a second, contradictory number. */}
                            {showCompare
                              ? "Hide comparisons"
                              : `Top ${winner.runnerUps.length} of ${(winner.beatCount || 0) + 1} compared`}
                          </button>
                        )}
                      </div>

                      {showMetrics && winner.scoreBreakdown && (
                        <div className="metrics">
                          {Object.entries(METRIC_LABELS)
                            .filter(([k]) => typeof winner.scoreBreakdown[k] === "number")
                            .map(([k, label]) => (
                              <div className="metric" key={k}>
                                <div className="metric-bar">
                                  <div className="metric-fill" style={{ width: `${winner.scoreBreakdown[k]}%` }} />
                                </div>
                                <span className="metric-val">{winner.scoreBreakdown[k]}%</span>
                                <span className="metric-key">{label}</span>
                              </div>
                            ))}
                        </div>
                      )}

                      {showCompare && winner.runnerUps?.length > 0 && (
                        <ul className="compare">
                          {winner.runnerUps.map((r, i) => (
                            <li key={i}><span>{r.name}</span><span className="compare-score">{r.matchScore}%</span></li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            )}
          </main>
        )}

        {/* ================= MAP ================= */}
        {/* ================= YOU =================
            Deliberately only two things: the streak, and the map. Every other
            stat that used to live here (hit rate, price sensitivity, crowd
            trust) was a number ABOUT the product rather than about the
            person, and it diluted the one screen whose whole job is to make
            someone feel seen. */}
        {/* ================= YOU =================
            Two things only: the places we've sent you, and whether we were
            right. The second is the whole reason the first is worth keeping —
            a history you never grade is a log, and a log teaches us nothing. */}
        {/* ================= GROUP ================= */}
        {activeTab === "group" && (
          <main className="page">
            {/* --- in a room --- */}
            {room ? (
              <section className={`rm${room.status === "done" ? " rm--done" : ""}`}>
                <div className="rm-top">
                  <div>
                    <p className="rm-kicker">
                      {room.status === "done" ? "Locked in" : room.status === "lobby" ? "Waiting room" : "Dinner Roulette"}
                      {room.query && <> · “{room.query}”</>}
                    </p>
                    <h1 className="rm-title">
                      {room.status === "done"
                        ? "We're going here."
                        : room.status === "lobby"
                          ? "Get everyone in."
                          : "Vote. Fast."}
                    </h1>
                  </div>
                  {room.status === "voting" && <RoomClock endsAt={room.endsAt} status={room.status} />}
                </div>

                {/* Presence. Seeing friends arrive is most of the reason this
                    feels like a game rather than a form. */}
                <ul className="rm-players">
                  {room.players.map((p) => (
                    <li key={p.id} className={`rm-player${p.voted ? " rm-player--voted" : ""}${p.id === room.me?.id ? " rm-player--me" : ""}`}>
                      <span className="rm-player-dot" aria-hidden="true" />
                      {p.id === room.me?.id ? "You" : p.name}
                      {p.isHost && <span className="rm-host">host</span>}
                    </li>
                  ))}
                </ul>

                {room.status === "voting" && (
                  <>
                    <ol className="rm-rules">
                      <li><strong>Tap Yes</strong> on every place you'd happily eat at. As many as you like.</li>
                      <li><strong>You get one 💣.</strong> It removes an option for the whole group.</li>
                      <li><strong>At two left, bombs stop.</strong> The final call is votes only.</li>
                      <li><strong>Most Yes wins</strong> when the clock runs out, or once everyone's voted.</li>
                    </ol>
                    {room.aliveCount <= 2 && (
                      <p className="rm-final-two">🛡️ Final two — bombs are off. Vote it out.</p>
                    )}
                  </>
                )}

                {/* Lobby. No clock is running yet, and it says so — the whole
                    point is that nobody's round is burning while they wait. */}
                {room.status === "lobby" && (
                  <div className="rm-lobby">
                    <p className="rm-rule">
                      <strong>{room.cards.length} places</strong> within 35 miles are loaded, and
                      <strong> no timer is running yet</strong>. Send the link, wait for everyone,
                      then start the round.
                    </p>
                    <ol className="rm-rules">
                      <li>Everyone gets <strong>90 seconds</strong> to vote.</li>
                      <li>Yes on anything you'd eat — as many as you like.</li>
                      <li><strong>One 💣 each.</strong> It removes a place for everyone.</li>
                      <li>Once <strong>two are left</strong>, no more bombs — votes only.</li>
                    </ol>
                    <div className="rm-lobby-code">
                      <span className="rm-lobby-label">Room code</span>
                      <strong>{room.code}</strong>
                    </div>
                    {room.me?.isHost ? (
                      <button className="btn btn--hot btn--block rm-start" onClick={startRound}>
                        Start the round · {room.players.length}{" "}
                        {room.players.length === 1 ? "player" : "players"} in
                      </button>
                    ) : (
                      <p className="rm-waiting">
                        <span className="rm-waiting-dot" aria-hidden="true" />
                        Waiting for the host to start…
                      </p>
                    )}
                  </div>
                )}

                <ul className="rm-cards">
                  {room.cards
                    .slice()
                    .sort((a, b) => (a.id === room.winnerId ? -1 : b.id === room.winnerId ? 1 : 0))
                    .map((c) => {
                      if (room.status === "done") {
                        const won = c.id === room.winnerId;
                        if (!won) return null;
                        return (
                          <li className="rm-win" key={c.id}>
                            <p className="rm-win-name">{c.name}</p>
                            <p className="rm-win-meta">
                              {typeof c.rating === "number" && <>{c.rating.toFixed(1)}★ · </>}
                              {c.category}
                              {typeof c.distanceMiles === "number" && <> · {c.distanceMiles} mi</>}
                            </p>
                            <p className="rm-win-why">
                              {room.revived
                                ? "You vetoed everything. So we picked the strongest one anyway."
                                : c.yesCount > 0
                                  ? `${c.yesCount} ${c.yesCount === 1 ? "vote" : "votes"} — and it survived the vetoes.`
                                  : "Nobody voted, so the highest match wins by default."}
                            </p>
                            {/* Numbers, not truthiness. A place at longitude 0
                                is real, and a non-numeric coordinate would
                                build a malformed maps URL. */}
                            {typeof c.lat === "number" && typeof c.lng === "number" && (
                              <a
                                className="btn btn--hot rm-go"
                                href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Directions
                              </a>
                            )}
                          </li>
                        );
                      }
                      return (
                        <RoomCard
                          key={c.id}
                          card={c}
                          disabled={room.status !== "voting"}
                          vetoUsed={Boolean(room.me?.vetoUsed)}
                          vetoOpen={room.vetoOpen !== false}
                          myName={room.me?.name}
                          onYes={(id) => castVote(id, "yes")}
                          onVeto={(id) => castVote(id, "veto")}
                        />
                      );
                    })}
                </ul>

                {roomError && <p className="err">{roomError}</p>}

                <div className="rm-foot">
                  {room.status === "lobby" ? (
                    <>
                      {/* Share is the loud button here — it is the only thing
                          that needs doing before the round can start. */}
                      <button className="btn btn--hot" onClick={shareRoom}>
                        {roomCopied ? "Link copied ✓" : "Send the link"}
                      </button>
                      <button className="btn btn--ghost" onClick={leaveRoom}>Cancel</button>
                    </>
                  ) : room.status === "voting" ? (
                    <>
                      <button className="btn btn--hot" onClick={shareRoom}>
                        {roomCopied ? "Link copied ✓" : "Invite the group"}
                      </button>
                      {room.me?.isHost && (
                        <button className="btn btn--ghost" onClick={lockRoom}>Lock it in now</button>
                      )}
                    </>
                  ) : (
                    <>
                      <button className="btn btn--hot" onClick={shareRoom}>
                        {roomCopied ? "Link copied ✓" : "Share the result"}
                      </button>
                      <button className="btn btn--ghost" onClick={leaveRoom}>New round</button>
                    </>
                  )}
                </div>

                {/* Says where the code can be used. Showing a code with no
                    stated destination is what made it look decorative. */}
                <p className="rm-code">
                  Room <strong>{room.code}</strong> · join from the link, or enter this code
                  under Group at savorscout.net
                </p>
              </section>
            ) : (
              /* --- not in a room --- */
              <>
                <div className="page-head">
                  <h1 className="page-title">Settle it in <em>90 seconds</em></h1>
                  <p className="page-sub">
                    Everyone votes on their own phone. No app, no account, no arguing.
                  </p>
                </div>

                {/* Join-by-code comes FIRST. Someone who already has a code is
                    mid-task and being kept waiting by friends; someone starting
                    a room is browsing. The lobby shows the code in big letters,
                    which promises somewhere to type it — this is that place. */}
                <section className="card rm-join">
                  <div className="card-head">
                    <h2 className="card-title">Got a code?</h2>
                    <span className="card-sub">join a round someone started</span>
                  </div>
                  <div className="rm-join-row">
                    <input
                      className="rm-join-input"
                      type="text"
                      inputMode="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck="false"
                      placeholder="MXEAMA"
                      value={roomJoinInput}
                      maxLength={60}
                      onChange={(e) => setRoomJoinInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") joinByCode(); }}
                      disabled={roomBusy}
                      aria-label="Room code"
                    />
                    <button
                      className="btn btn--hot"
                      onClick={joinByCode}
                      disabled={roomBusy || !parseRoomCode(roomJoinInput)}
                    >
                      Join
                    </button>
                  </div>
                  <p className="rm-join-hint">
                    Pasting the whole link works too — we'll pull the code out of it.
                  </p>
                </section>

                {/* Spelled out, because a game nobody understands is a game
                    nobody starts. Four steps, in order, before they commit. */}
                <ol className="rm-how">
                  <li><span className="rm-how-n">1</span> Set where you are, then pick a craving — or shuffle for one, free.</li>
                  <li><span className="rm-how-n">2</span> We find <strong>5 places within 35 miles</strong> and open a room.</li>
                  <li><span className="rm-how-n">3</span> Send the link. Anyone who taps it joins — no app, no signup.</li>
                  <li><span className="rm-how-n">4</span> You start the clock. <strong>90 seconds</strong>, one 💣 each.</li>
                  <li><span className="rm-how-n">5</span> Bombs stop at the final two. <strong>Most Yes wins.</strong></li>
                </ol>

                <section className="card card--glow">
                  {/* STEP 1 first. The craving box used to sit above the
                      location box even though "Open the room" stays disabled
                      until a location is set — so the first thing you could
                      type was the thing that did not unblock the button. */}
                  <div className="card-head">
                    <h2 className="card-title">1 · Where are you?</h2>
                    {resolvedLocation && <span className="card-sub">searching 35 miles around you</span>}
                  </div>

                  <div className="loc">
                    {resolvedLocation ? (
                      <div className="loc-set">
                        <span className="loc-key">Near</span>
                        <span className="loc-val">{resolvedLocation.name}</span>
                        <button className="link-btn" style={{ marginLeft: "auto" }}
                                onClick={() => { setResolvedLocation(null); setLocationError(""); }}>
                          Change
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="loc-prompt">City, postcode, or address — anywhere in the world.</span>
                        <div className="loc-row">
                          <input
                            type="text" maxLength={120} autoComplete="off"
                            placeholder="Hicksville NY · Paris · SW1A 1AA" value={locationInput}
                            onChange={(e) => setLocationInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") applyLocation(); }}
                          />
                          <button className="btn btn--ghost" onClick={applyLocation}
                                  disabled={resolvingLocation || locationInput.trim().length < 2}>
                            {resolvingLocation ? "Checking…" : "Set"}
                          </button>
                        </div>
                        <button type="button" className="link-btn loc-gps" onClick={useMyLocation} disabled={resolvingLocation}>
                          📍 Use my current location
                        </button>
                        {locationError && <p className="err">{locationError}</p>}
                      </>
                    )}
                  </div>

                  <div className="rm-step2">
                    <div className="card-head">
                      <h2 className="card-title">2 · What are you all in the mood for?</h2>
                    </div>

                    {/* Shuffle sits ABOVE the box and costs nothing — tapping it
                        only fills the field. Opening the room is the separate,
                        deliberate action below. */}
                    <button
                      className="btn btn--ghost rm-shuffle"
                      onClick={surpriseMe}
                      disabled={roomBusy}
                    >
                      🎲 {roomCraving ? "Shuffle again" : "Pick one for us"} — free, tap as often as you like
                    </button>

                    <div className="searchbar" style={{ marginTop: 12 }}>
                      <input
                        type="text"
                        placeholder="pizza, tacos, sushi…"
                        value={roomCraving}
                        maxLength={80}
                        onChange={(e) => setRoomCraving(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") createRoom(); }}
                        disabled={roomBusy}
                      />
                    </div>

                    {/* Free text rather than checkboxes: the ranker already
                        reads price, dietary and vibe words straight out of the
                        query, so anything typed here genuinely counts. */}
                    <input
                      className="rm-extras"
                      type="text"
                      placeholder="Anything else? cheap · vegetarian · gluten free · date night · open late"
                      value={roomExtras}
                      maxLength={120}
                      onChange={(e) => setRoomExtras(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") createRoom(); }}
                      disabled={roomBusy}
                      aria-label="Extra details"
                    />

                    <button
                      className="btn btn--hot btn--block rm-open"
                      onClick={() => createRoom()}
                      disabled={roomBusy || !roomCraving.trim() || !resolvedLocation}
                    >
                      {roomStage === "searching" ? "Finding places…"
                        : roomStage === "opening" ? "Opening room…"
                        : !resolvedLocation ? "Set your location first"
                        : "Open the room →"}
                    </button>
                  </div>

                  {roomError && <p className="err">{roomError}</p>}
                  <p className="rm-seed">
                    Shuffling is free. Opening a room runs one search — the same single
                    search as using Find, so this replaces that step rather than adding one.
                  </p>
                </section>
              </>
            )}
          </main>
        )}

        {activeTab === "you" && (
          <main className="page">
            <div className="page-head">
              <h1 className="page-title">Where we <em>sent you</em></h1>
              <p className="page-sub">Every pick, and whether it landed.</p>
            </div>

            <div className="status">
              <Flame days={streakDays} hero />
              <div className="status-right">
                <div>
                  <p className="status-tier">{tierInfo.current.name}</p>
                  <h1 className="status-line">
                    {streakDays > 0 ? "Keep it burning." : "Light the first one."}
                  </h1>
                </div>

                <div className="status-stats">
                  <div className="stat-block">
                    <CountUp className="stat-num stat-num--cool" value={history.stats?.searches || 0} />
                    <span className="stat-key">Searches</span>
                  </div>
                  <div className="stat-block">
                    <span className="stat-num stat-num--warm">{game?.streak?.longest ?? 0}</span>
                    <span className="stat-key">Best streak</span>
                  </div>
                  {history.stats?.likedRate != null && (
                    <div className="stat-block">
                      <span className="stat-num">{history.stats.likedRate}%</span>
                      <span className="stat-key">You liked</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* The open loop. Shown first because it's the only thing on this
                page that asks anything of anyone. */}
            {pendingVerdicts.length > 0 && (
              <section className="card card--glow">
                <div className="card-head">
                  <h2 className="card-title">Did you go?</h2>
                  <span className="card-sub">tell us and we get sharper</span>
                </div>
                {pendingVerdicts.map((v) => (
                  <Ask key={v.id} verdict={v} onAnswer={answerVerdict} busy={verdictBusy} />
                ))}
              </section>
            )}

            {/* The quiz card. Shows what today actually offers rather than a
                generic "take the quiz", because the answer to "why now?" is
                the entire reason a drip works. */}
            <section className="card card--glow qz-entry">
              <div className="card-head">
                <h2 className="card-title">Your taste profile</h2>
                <span className="card-sub">
                  {quizState.phase === "done" ? "complete"
                    : quizState.phase === "waiting" ? `day ${quizState.day} of 6 done`
                    : quizState.phase === "reveal-ready" ? "ready to reveal"
                    : quizState.day > 1 ? `day ${quizState.day} of 6` : "7 days · 1 min a day"}
                </span>
              </div>
              <p className="qz-entry-note">
                {quizState.phase === "done"
                  ? "Your type is set, and every search is weighted to it. Open it any time to look again."
                  : quizState.phase === "waiting"
                    ? "Today's set is done. The next five questions unlock tomorrow."
                    : quizState.phase === "reveal-ready"
                      ? "All six days answered. Your food personality is waiting."
                      : quizState.day > 1
                        ? "Five questions, about a minute. Each day sharpens what we pick for you."
                        : "Six days, five questions each, then your food personality. Every answer changes what we recommend — starting today."}
              </p>
              <button className="btn btn--hot btn--block" onClick={() => setQuizOpen(true)}>
                {quizState.phase === "done" ? "See my type"
                  : quizState.phase === "waiting" ? "See where I'm at"
                  : quizState.phase === "reveal-ready" ? "Reveal my type"
                  : quizState.day > 1 ? `Continue · day ${quizState.day}` : "Start the quiz"}
              </button>
            </section>

            <section className="card">
              <div className="card-head">
                <h2 className="card-title">Search history</h2>
                {history.stats?.searches > 0 && (
                  <span className="card-sub">
                    {history.stats.rated} of {history.stats.searches} rated
                  </span>
                )}
              </div>

              {history.history?.length > 0 ? (
                <ul className="hist">
                  {history.history.map((h) => (
                    <li className="hist-row" key={h.id}>
                      <div className="hist-main">
                        <span className="hist-name">{h.name}</span>
                        <span className="hist-meta">
                          {h.query && <span className="hist-q">“{h.query}”</span>}
                          {typeof h.distance_mi === "number" && <> · {h.distance_mi} mi</>}
                          {typeof h.match_score === "number" && <> · {h.match_score}% match</>}
                        </span>
                      </div>
                      <span className={`hist-tag hist-tag--${verdictTone(h)}`}>{verdictWord(h)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty">
                  Nothing yet. Search for something and it lands here.
                </p>
              )}

              <button className="btn btn--hot" style={{ marginTop: 18 }} onClick={() => setTab("find")}>
                Find somewhere
              </button>
            </section>
          </main>
        )}

        <Quiz
          open={quizOpen}
          onClose={() => { setQuizOpen(false); setQuizState(quizStatus()); }}
          onComplete={onQuizComplete}
          onShare={onQuizShare}
        />

        <footer className="foot">© 2026 SavorScout</footer>
      </div>
    </div>
  );
}

/* App returns early for the loading and signed-out states, so the banner is
   mounted alongside it rather than inside it — one place, present on every
   screen, and no change to the existing render branches. */
function AppRoot() {
  return (
    <>
      <App />
      <ConsentBanner />
    </>
  );
}

export default AppRoot;