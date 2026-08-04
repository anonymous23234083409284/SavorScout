import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import { renderShareCard, canvasToBlob } from "./shareCard";

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

function verdictLine(w) {
  const beat = w.beatCount || 0;
  const lead = w.dominancePercent;
  if (beat === 0) return "The only place nearby that fits what you asked for.";
  if (typeof lead === "number" && lead >= 25) return `Clear winner — well ahead of the other ${beat} nearby.`;
  if (typeof lead === "number" && lead >= 8) return `Best of the ${beat} nearby places we compared.`;
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

function ConceptFace({ card, side }) {
  return (
    <span className={`face face--${side} face--k-${card.kind}`}>
      <span className="face-kind">{card.kind}</span>
      <span className="face-name">{card.name}</span>
      {card.rarity >= 3 && <span className="face-rare">rare</span>}
    </span>
  );
}

function PlaceFace({ place }) {
  const price = place.price_level ? "$".repeat(place.price_level) : null;
  return (
    <span className="face face--place">
      <span className="face-img">
        {place.thumbnail
          ? <img src={place.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
          : <span className="face-mono">{(place.name || "?").charAt(0).toUpperCase()}</span>}
      </span>
      <span className="face-body">
        <span className="face-name">{place.name}</span>
        <span className="face-stats">
          {typeof place.rating === "number" && <span>{place.rating.toFixed(1)}★</span>}
          {price && <span>{price}</span>}
        </span>
      </span>
    </span>
  );
}

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

function Archetype({ archetype, choices }) {
  if (!archetype) return null;
  const share = archetype.share;
  return (
    <section className="arch">
      {share != null && share <= 0.25 && (
        <span className="arch-rare">{Math.max(1, Math.round(share * 100))}% of people</span>
      )}
      <span className="arch-tag">Your type</span>
      <h2 className="arch-name">{archetype.name}</h2>
      <p className="arch-line">{archetype.line}</p>
      {choices > 0 && (
        <p className="arch-from">From {choices.toLocaleString()} choices — you never answered a question about yourself.</p>
      )}
    </section>
  );
}

function AxisBar({ axis }) {
  const pct = Math.round(axis.position * 100);
  return (
    <div className="ax">
      <div className="ax-poles">
        <span className={pct < 45 ? "on" : ""}>{axis.left}</span>
        <span className={pct > 55 ? "on" : ""}>{axis.right}</span>
      </div>
      <div className="ax-rail">
        <div className="ax-track" />
        <div className="ax-dot" style={{ left: `${pct}%` }} />
      </div>
      <p className="ax-say">
        {axis.say}
        {axis.compare && <span className="ax-cmp"> {axis.compare}</span>}
      </p>
    </div>
  );
}

/* The open loop, in one line. Naming three specific unfinished things pulls
   harder than a progress bar, and costs the reader nothing to parse. */
function Measuring({ items }) {
  if (!items?.length) return null;
  const shown = items.slice(0, 3);
  const list = shown.length === 1
    ? shown[0]
    : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  return (
    <p className="soon">
      Still measuring — <b>{list}</b>. They appear here once we're sure.
    </p>
  );
}

function SignalList({ title, tone, nodes, empty }) {
  return (
    <div className="sig">
      <span className="sig-title">{title}</span>
      {nodes?.length ? (
        <ul className="sig-list">
          {nodes.map((n) => (
            <li className={`sig-item sig-item--${tone}`} key={n.id}>
              <span className="sig-name">{n.name}</span>
              <span className="sig-pct">{Math.round((n.affinity ?? 0) * 100)}%</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sig-empty">{empty}</p>
      )}
    </div>
  );
}

/* Visible, countable gaps. Panini built a business on the fact that an empty
   slot you can point at pulls harder than "23% complete" ever will. */
function Collection({ collection }) {
  if (!collection?.found?.length) return null;
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Closest to complete</h2>
        <span className="card-sub">{collection.family} · {collection.seen} of {collection.total}</span>
      </div>
      <div className="coll">
        {collection.found.map((c) => (
          <span className={`slot${c.rarity >= 3 ? " slot--rare" : " slot--got"}`} key={c.id}>
            {c.name}
          </span>
        ))}
        {Array.from({ length: collection.missing }).map((_, i) => (
          <span className="slot slot--fog" key={`f${i}`}>?</span>
        ))}
      </div>
    </section>
  );
}

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

function ReadScore({ record }) {
  if (!record?.total) return null;
  return (
    <span className="read-score" title={`${record.total} calls resolved`}>
      <span className="read-score-side">
        <span className="read-score-k">Model</span>
        <span className="read-score-n read-score-n--world">{record.model}</span>
      </span>
      <span className="read-score-div" />
      <span className="read-score-side">
        <span className="read-score-k">You</span>
        <span className="read-score-n read-score-n--you">{record.you}</span>
      </span>
    </span>
  );
}

/* ===========================================================================
   SHARE SHEET

   The card is built at full 1080x1350 on an offscreen canvas and shown here
   scaled down, so what the user previews is byte-for-byte what they post.

   Failure is designed for rather than hoped against: rendering can't throw a
   dead button at anyone, because the card composes from whatever passed its
   gates and the no-photo layout is a first-class design. The only genuinely
   unrecoverable case is a verdict with no name, which can't happen.
   =========================================================================== */

function ShareSheet({ state, onClose, onDownload, onShare }) {
  if (!state) return null;
  const { url, fields, usedPhoto, busy, error, canNativeShare } = state;

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

function Seal({ seal, result, busy, onOpen, onDismiss }) {
  if (result) {
    const hit = result.correct;
    return (
      <section className={`seal seal--open seal--${hit ? "hit" : "miss"}`} role="status">
        <div className="seal-head">
          <span className="seal-tag">Last night's call</span>
          <ReadScore record={result.record} />
        </div>
        <p className="seal-outcome">{hit ? "We had you." : "You beat it."}</p>
        <p className="seal-sub">
          {hit
            ? <>Sealed yesterday, before you picked: <strong>{result.pickName}</strong>.</>
            : <>We'd written down <strong>{result.pickName}</strong>. You went the other way.</>}
        </p>
        <button className="seal-done" onClick={onDismiss}>{hit ? "Unsettling." : "Good."}</button>
      </section>
    );
  }

  if (!seal) return null;

  if (seal.state === "set") {
    return (
      <section className="seal seal--set">
        <span className="seal-wax" aria-hidden="true">✦</span>
        <div>
          <p className="seal-set-t">Sealed for tonight.</p>
          <p className="seal-set-s">What it said about you opens tomorrow morning.</p>
        </div>
      </section>
    );
  }

  if (seal.state !== "ready") return null;

  return (
    <section className="seal seal--ready">
      <div className="seal-head">
        <span className="seal-tag">Sealed {seal.sealedOn}</span>
      </div>
      <p className="seal-claim">We wrote down what you'd pick — before you picked it.</p>
      <div className="seal-pair">
        <span className={`seal-face${seal.chose === "left" ? " seal-face--yours" : ""}`}>
          {seal.left?.name}
        </span>
        <span className="seal-vs">vs</span>
        <span className={`seal-face${seal.chose === "right" ? " seal-face--yours" : ""}`}>
          {seal.right?.name}
        </span>
      </div>
      <p className="seal-chose">You took {seal.chose === "left" ? seal.left?.name : seal.right?.name}.</p>
      <button className="btn btn--hot seal-open" disabled={busy} onClick={() => onOpen(seal)}>
        {busy ? "Opening…" : "Open it"}
      </button>
    </section>
  );
}

function DailyRead({ read, result, busy, onAnswer, onDismiss }) {
  if (!read) return null;

  /* ---- resolved: the payoff frame, and the only place the warm/cool
          merge gradient is allowed to appear in the whole product ---- */
  if (result) {
    const hit = result.correct;
    return (
      <section className={`read read--resolved read--${hit ? "hit" : "miss"}`} role="status">
        <div className="read-head">
          <span className="read-tag">Today's read</span>
          <ReadScore record={result.record} />
        </div>

        <p className="read-outcome">{hit ? "Called it." : "Missed."}</p>
        <p className="read-outcome-sub">
          {hit
            ? <>We had you on <strong>{result.pickName}</strong> before you tapped.</>
            : <>We had you on <strong>{result.pickName}</strong>. You went the other way — that's the answer that teaches us the most.</>}
        </p>

        <button className="read-dismiss" onClick={onDismiss}>
          {hit ? "Unsettling. Go on." : "Good."}
        </button>
      </section>
    );
  }

  /* ---- warming: no call earned yet. The countdown is a real number, and
          an unfinished thing with a named finish line is the single
          cheapest reason to come back tomorrow.

          Two distinct reasons land here and they must not share copy. Not
          enough evidence is "we don't know you yet"; enough evidence but no
          clear edge is "today's pairs were too close." Collapsing them would
          have the app claim ignorance it doesn't have — a small lie, but
          this product only sells one thing and that thing is being right
          about what it actually knows. ---- */
  if (read.state === "warming") {
    const tooClose = read.need === 0;
    return (
      <section className="read read--warming">
        <div className="read-head">
          <span className="read-tag">Today's read</span>
          <ReadScore record={read.record} />
        </div>
        <p className="read-claim read-claim--quiet">
          {tooClose
            ? "Today's pairs were too close for us to call."
            : "We don't know you well enough to call it yet."}
        </p>
        <p className="read-sub">
          {tooClose
            ? <>We'd rather say nothing than flip a coin and dress it up. Keep answering — we'll have a call on you tomorrow.</>
            : typeof read.need === "number" && read.need > 0
              ? <><strong>{read.need}</strong> more {read.need === 1 ? "answer" : "answers"} before we start staking predictions on you.</>
              : <>Answer today's calibration and we'll start staking predictions on you.</>}
        </p>
      </section>
    );
  }

  /* ---- spent: today's call is already resolved ---- */
  if (read.state === "spent") {
    return (
      <section className="read read--spent">
        <div className="read-head">
          <span className="read-tag">Today's read</span>
          <ReadScore record={read.record} />
        </div>
        <p className="read-claim read-claim--quiet">Today's call is settled.</p>
        <p className="read-sub">We'll have a new one on you tomorrow morning.</p>
      </section>
    );
  }

  /* ---- staked: the live call ---- */
  const pct = Math.round((read.confidence || 0) * 100);

  return (
    <section className="read read--staked">
      <div className="read-head">
        <span className="read-tag">Today's read</span>
        <ReadScore record={read.record} />
      </div>

      <p className="read-claim">We've already made the call on this one.</p>

      <div className="read-stake">
        <div className="read-stake-bar">
          <div className="read-stake-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="read-stake-n">{pct}% confident</span>
      </div>

      <p className="read-axis">{read.axis}</p>

      <div className="read-pair">
        <button className="read-btn" disabled={busy} onClick={() => onAnswer(read, "left")}>
          <ConceptFace card={read.left} side="l" />
        </button>
        <span className="read-or">or</span>
        <button className="read-btn" disabled={busy} onClick={() => onAnswer(read, "right")}>
          <ConceptFace card={read.right} side="r" />
        </button>
      </div>

      <p className="read-foot">Pick, and we'll show you what we'd written down.</p>
    </section>
  );
}

function Calibration({ item, completed, total, busy, onAnswer, lastResult, pendingTraits, onFind, needsSeed }) {
  const pct = total ? Math.round((completed / total) * 100) : 0;

  if (needsSeed) {
    return (
      <section className="cal">
        <div className="cal-head">
          <span className="cal-tag">Daily calibration</span>
          <span className="xp-chip">+10 XP each</span>
        </div>
        <p className="cal-why">Warming up — one search and these start.</p>
        <button className="btn btn--hot" onClick={onFind}>Find somewhere to eat</button>
      </section>
    );
  }

  const done = !item;

  return (
    <section className="cal">
      <div className="cal-head">
        <span className="cal-tag">Daily calibration</span>
        <span className="cal-count">{completed}/{total}</span>
      </div>

      <p className="cal-why">
        Every answer sharpens what we recommend. This is how the engine learns your taste —
        not a questionnaire, just which one you'd rather.
      </p>

      <div className="cal-track">
        <div className="cal-fill" style={{ width: `${pct}%` }} />
      </div>

      {done ? (
        <div className="cal-done">
          <span className="cal-done-mark">✦</span>
          <p className="cal-done-t">Calibrated for today.</p>
          {pendingTraits?.length > 0 && (
            <p className="cal-done-s">
              {pendingTraits[0].need} more {pendingTraits[0].need === 1 ? "answer" : "answers"} unlocks{" "}
              <strong>{pendingTraits[0].label}</strong>.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* We commit to a guess before they tap. A hit proves the model
              knows them; a miss is the most valuable answer we can get. */}
          {item.predicted && !lastResult && (
            <p className="cal-predict">We think we know this one.</p>
          )}

          {lastResult?.prediction && (
            <p className={`cal-verdict cal-verdict--${lastResult.prediction.correct ? "hit" : "miss"}`}>
              {lastResult.prediction.correct
                ? "Called it. We had you on that one."
                : "We were wrong — that's the useful kind of answer."}
            </p>
          )}

          <p className="cal-axis">{item.mode === "place" ? "Which would you rather, tonight" : item.axis}</p>

          <div className="cal-pair">
            <button className="cal-btn" disabled={busy} onClick={() => onAnswer(item.id, "left")}>
              {item.mode === "place"
                ? <PlaceFace place={item.left_ref} />
                : <ConceptFace card={item.left_ref} side="l" />}
            </button>
            <span className="cal-or">or</span>
            <button className="cal-btn" disabled={busy} onClick={() => onAnswer(item.id, "right")}>
              {item.mode === "place"
                ? <PlaceFace place={item.right_ref} />
                : <ConceptFace card={item.right_ref} side="r" />}
            </button>
          </div>

          <button className="cal-skip" disabled={busy} onClick={() => onAnswer(item.id, "skip")}>
            No preference
          </button>
        </>
      )}
    </section>
  );
}

/* A revealed trait is the payoff moment. It only ever fires on real evidence
   — a fabricated "you're an adventurous eater" would undercut the exact
   thing this product sells. */
function TraitReveal({ trait, onClose }) {
  if (!trait) return null;
  return (
    <div className="reveal" role="status">
      <div className="reveal-card">
        <span className="reveal-tag">Something new about you</span>
        <h3 className="reveal-title">{trait.label}</h3>
        <p className="reveal-detail">{trait.detail}</p>
        <div className="reveal-conf">
          <div className="reveal-conf-bar"><div className="reveal-conf-fill" style={{ width: `${Math.round((trait.confidence || 0) * 100)}%` }} /></div>
          <span className="reveal-conf-n">{Math.round((trait.confidence || 0) * 100)}% confidence</span>
        </div>
        <button className="btn btn--cool" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

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

const TABS = [
  { id: "today", label: "Today", minLevel: 1 },
  { id: "find", label: "Find", minLevel: 1 },
  { id: "map", label: "Map", minLevel: 1 },
  { id: "you", label: "You", minLevel: 1 },
];

/* ===========================================================================
   APP
   =========================================================================== */

function App() {
  const [tab, setTab] = useState("today");

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [resolvedLocation, setResolvedLocation] = useState(null);
  const [radiusMode, setRadiusMode] = useState("nearby");
  const [radiusUsed, setRadiusUsed] = useState(null);
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

  const [searchesRemaining, setSearchesRemaining] = useState(null);

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [allergies, setAllergies] = useState("");
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");

  const [pendingVerdicts, setPendingVerdicts] = useState([]);
  const [scoutReport, setScoutReport] = useState(null);
  const [verdictBusy, setVerdictBusy] = useState(false);

  const [game, setGame] = useState(null);
  const [cal, setCal] = useState({ remaining: [], completed: 0, total: 7, pendingTraits: [] });
  const [calBusy, setCalBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [readResult, setReadResult] = useState(null);
  const [sealResult, setSealResult] = useState(null);
  const [sealBusy, setSealBusy] = useState(false);
  const [share, setShare] = useState(null);
  // navigator.share must be called synchronously inside the click to keep the
  // user-gesture, so the handler reads the latest card from a ref rather than
  // closing over state.
  const shareRef = useRef(null);
  useEffect(() => { shareRef.current = share; }, [share]);
  const [reveal, setReveal] = useState(null);
  const [taste, setTaste] = useState(null);
  const [tasteMap, setTasteMap] = useState(null);
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
    const [state, t] = await Promise.all([authedFetch("/game/state"), authedFetch("/me/taste")]);
    if (state) setGame(state);
    if (t) setTaste(t);
  }, [authedFetch]);

  const refreshCal = useCallback(async () => {
    const zip = resolvedLocation?.zip || getZip();
    const data = await authedFetch(`/calibration/today?zip=${encodeURIComponent(zip)}`);
    if (data) setCal(data);
  }, [authedFetch, resolvedLocation]);

  const refreshMap = useCallback(async () => {
    const data = await authedFetch("/me/map");
    if (data) setTasteMap(data);
  }, [authedFetch]);

  const refreshLoop = useCallback(async () => {
    const [pending, report] = await Promise.all([
      authedFetch("/verdicts/pending"),
      authedFetch("/me/scout-report"),
    ]);
    if (pending?.pending) setPendingVerdicts(pending.pending);
    if (report) setScoutReport(report);
  }, [authedFetch]);

  useEffect(() => {
    if (!user || needsOnboarding || !onboardingChecked) return;
    refreshLoop().catch(() => {});
    refreshGame().catch(() => {});
    refreshCal().catch(() => {});
    refreshMap().catch(() => {});
  }, [user, needsOnboarding, onboardingChecked, refreshLoop, refreshGame, refreshCal, refreshMap]);

  const track = useCallback(async (kind, payload) => {
    try {
      const res = await authedFetch("/events", { method: "POST", body: JSON.stringify({ kind, payload: payload || null }) });
      if (res?.award) { flash(res.award); refreshGame().catch(() => {}); }
    } catch { /* telemetry never surfaces an error */ }
  }, [authedFetch, flash, refreshGame]);

  /* The Read resolves in its own frame rather than through the calibration
     flow, because the reveal is the whole point of it — routing it through
     the shared handler would clear the pair and drop the payoff. */
  const answerRead = async (read, chosen) => {
    if (calBusy) return;
    setCalBusy(true);
    setCal((p) => ({
      ...p,
      remaining: p.remaining.filter((c) => c.id !== read.id),
      completed: p.completed + 1,
    }));
    try {
      const res = await authedFetch("/calibration/answer", {
        method: "POST",
        body: JSON.stringify({ id: read.id, chosen }),
      });
      if (res) {
        // A withheld grade comes back as prediction:null. Coercing that to
        // `correct: false` would print "Missed." over an answer nobody has
        // graded yet, so the payoff frame only opens on a real result.
        if (res.sealed) {
          setCal((p) => ({ ...p, seal: { state: "set" } }));
        } else if (res.prediction) {
          const pick = read.side === "left" ? read.left : read.right;
          setReadResult({
            correct: res.prediction.correct,
            pickName: pick?.name || "that one",
            record: res.record,
          });
        }
        if (res.award) flash(res.award);
        if (res.justRevealed?.length) setReveal(res.justRevealed[0]);
        if (res.pendingTraits) setCal((p) => ({ ...p, pendingTraits: res.pendingTraits }));
      }
      refreshGame().catch(() => {});
      refreshMap().catch(() => {});
    } finally { setCalBusy(false); }
  };

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

      setShare({ url, blob, file, fields, usedPhoto, canNativeShare, busy: false });
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

  const nativeShare = useCallback(async () => {
    const s = shareRef.current;
    if (!s?.file) return;
    try {
      await navigator.share({ files: [s.file], title: s.fields?.name || "My pick" });
      track("share_native");
    } catch { /* user dismissed the OS sheet — not an error */ }
  }, [track]);

  const openSeal = async (seal) => {
    if (sealBusy) return;
    setSealBusy(true);
    try {
      const res = await authedFetch("/calibration/reveal", {
        method: "POST",
        body: JSON.stringify({ id: seal.id }),
      });
      if (res?.ok) {
        setSealResult({ correct: res.correct, pickName: res.pickName, record: res.record });
        if (res.award) flash(res.award);
        refreshGame().catch(() => {});
      }
    } finally { setSealBusy(false); }
  };

  const dismissSeal = () => {
    setCal((p) => ({ ...p, seal: null }));
    setSealResult(null);
    refreshCal().catch(() => {});
  };

  const dismissRead = () => {
    setCal((p) => ({ ...p, read: { state: "spent", record: readResult?.record || p.read?.record } }));
    setReadResult(null);
    refreshCal().catch(() => {});
  };

  const answerCal = async (id, chosen) => {
    if (calBusy) return;
    setCalBusy(true);
    // Optimistic — the pair clears the instant they tap. A spinner on a
    // one-tap decision is what turns a habit back into a chore.
    setCal((p) => ({
      ...p,
      remaining: p.remaining.filter((c) => c.id !== id),
      completed: p.completed + (chosen === "skip" ? 0 : 1),
    }));
    try {
      const res = await authedFetch("/calibration/answer", { method: "POST", body: JSON.stringify({ id, chosen }) });
      if (res) {
        setLastResult(res);
        setTimeout(() => setLastResult(null), 2600);
        // Confirm the seal on the tap. Waiting for the next poll would make
        // the deferral feel like the answer simply vanished.
        if (res.sealed) setCal((p) => ({ ...p, seal: { state: "set" } }));
        if (res.award) flash(res.award);
        if (res.justRevealed?.length) setReveal(res.justRevealed[0]);
        if (res.pendingTraits) setCal((p) => ({ ...p, pendingTraits: res.pendingTraits }));
      }
      refreshGame().catch(() => {});
      refreshMap().catch(() => {});
    } finally { setCalBusy(false); }
  };

  const answerVerdict = async (id, answer) => {
    if (verdictBusy) return;
    setVerdictBusy(true);
    setPendingVerdicts((p) => p.filter((v) => v.id !== id));
    try {
      const res = await authedFetch("/verdicts/feedback", { method: "POST", body: JSON.stringify({ id, ...answer }) });
      if (res?.award) flash(res.award);
      const report = await authedFetch("/me/scout-report");
      if (report) setScoutReport(report);
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
    setLocationInput(""); setResolvedLocation(null); setLocationError(""); setRadiusUsed(null);
    setPendingVerdicts([]); setScoutReport(null); setGame(null); setTaste(null);
    setCal({ remaining: [], completed: 0, total: 7, pendingTraits: [] }); setReadResult(null); setSealResult(null); setTasteMap(null); setTab("today");
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

  const applyLocation = async () => {
    const zip = locationInput.trim();
    if (resolvingLocation) return;
    if (!/^\d{5}$/.test(zip)) { setLocationError("Enter a 5-digit ZIP code."); return; }

    setLocationError(""); setResolvingLocation(true);
    try {
      const result = await lookupZip(zip);
      if (!result.ok) {
        setLocationError(result.reason === "network"
          ? "Couldn't reach the location service — check your connection."
          : `Couldn't find ZIP "${zip}" in the US.`);
        return;
      }
      setResolvedLocation({ ...result.location, zip });
      setLocationInput("");
      setZip(zip);
      refreshCal().catch(() => {});
    } finally { setResolvingLocation(false); }
  };

  /* ---- search ---- */

  const handleSearch = async () => {
    if (loading || !query.trim() || !user) return;
    if (!resolvedLocation) { setErrorMsg("Set your ZIP code first."); return; }

    setErrorMsg(""); setLoading(true);
    setShowMetrics(false); setShowCompare(false); setShowMap(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setErrorMsg("Your session expired — please sign in again."); return; }

      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      const trimmed = query.trim();
      const response = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
        setErrorMsg(data.error || "Please sign in again."); setResults([]);
      } else if (!response.ok) {
        setErrorMsg(data.error || `Something went wrong (${response.status}).`); setResults([]);
      } else if (!data.restaurants || data.restaurants.length === 0) {
        setErrorMsg(data.outOfRange
          ? `Nothing within ${data.maxRadiusMiles || 25} miles of ${resolvedLocation.name} — closest was about ${data.nearestMiles} mi out. Try "Anywhere worth it" or a different ZIP.`
          : `No match near ${resolvedLocation.name} — try a different craving.`);
        setResults([]);
        if (typeof data.searchesRemaining === "number") setSearchesRemaining(data.searchesRemaining);
      } else {
        setResults(data.restaurants.slice(0, 1));
        setSubmittedQuery(trimmed);
        setRadiusUsed(typeof data.radiusUsed === "number" ? data.radiusUsed : null);
        if (typeof data.searchesRemaining === "number") setSearchesRemaining(data.searchesRemaining);
        refreshGame().catch(() => {});
        refreshCal().catch(() => {});
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

  /* ---- signed out ---- */

  if (!user) {
    return (
      <div className="app">
        {Ambient}
        <div className="shell">
          <header className="topbar">
            <div className="logo">
              <span className="logo-mark">SS</span>
              <span className="logo-word">SavorScout</span>
            </div>
          </header>

          <section className="gate">
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

  if (!onboardingChecked) {
    return <div className="app">{Ambient}<p className="center-note">Loading…</p></div>;
  }

  /* ---- onboarding ---- */

  if (needsOnboarding) {
    return (
      <div className="app">
        {Ambient}
        <div className="shell">
          <header className="topbar">
            <div className="logo">
              <span className="logo-mark">SS</span>
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
  const visibleTabs = TABS.filter((t) => (level?.level ?? 1) >= t.minLevel);
  const openWork = pendingVerdicts.length + (cal.remaining?.length || 0);

  return (
    <div className="app">
      {Ambient}

      <div className="shell">
        <header className="topbar">
          <div className="logo">
            <span className="logo-mark">SS</span>
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
            <Flame days={streakDays} />
            <LevelRing level={level} />
            <button className="signout" onClick={handleSignOut}>Sign out</button>
          </div>
        </header>

        <TraitReveal trait={reveal} onClose={() => setReveal(null)} />

        <ShareSheet
          state={share}
          onClose={closeShare}
          onDownload={downloadShare}
          onShare={nativeShare}
        />

        {toast && (
          <div className={`toast${toast.leveledUp ? " toast--level" : ""}`} role="status">
            <span className="toast-xp">+{toast.amount} XP</span>
            {toast.leveledUp && <span className="toast-rank">{toast.rank}</span>}
          </div>
        )}

        {/* ================= TODAY ================= */}
        {tab === "today" && (
          <main className="page">
            {/* The envelope outranks even the Read: it was already waiting
                when they opened the app, and it's the thing that made
                tomorrow a specific appointment rather than a vague intention. */}
            <Seal
              seal={cal.seal}
              result={sealResult}
              busy={sealBusy}
              onOpen={openSeal}
              onDismiss={dismissSeal}
            />

            {/* The Read sits above the streak because it's the reason to
                open the app; the flame is the reward for having done so. */}
            <DailyRead
              read={cal.read}
              result={readResult}
              busy={calBusy}
              onAnswer={answerRead}
              onDismiss={dismissRead}
            />

            <div className="status">
              <Flame days={streakDays} hero />
              <div className="status-right">
                <div>
                  <p className="status-tier">{tierInfo.current.name}</p>
                  <h1 className="status-line">
                    {game?.streak?.activeToday
                      ? "You're set for today."
                      : streakDays > 0
                        ? "Keep it burning."
                        : "Light the first one."}
                  </h1>
                </div>

                <div className="status-stats">
                  <div className="stat-block">
                    <CountUp className="stat-num stat-num--cool" value={game?.xp ?? 0} />
                    <span className="stat-key">Total XP</span>
                  </div>
                  <div className="stat-block">
                    <span className="stat-num stat-num--warm">{game?.streak?.longest ?? 0}</span>
                    <span className="stat-key">Best streak</span>
                  </div>
                  {game?.streak?.freezes > 0 && (
                    <div className="stat-block">
                      <span className="stat-num">{game.streak.freezes}</span>
                      <span className="stat-key">Freezes</span>
                    </div>
                  )}
                </div>

                {tierInfo.next && (
                  <div className="next-tier">
                    <div className="next-tier-bar">
                      <div className="next-tier-fill" style={{ width: `${Math.round(tierInfo.progress * 100)}%` }} />
                    </div>
                    <span className="next-tier-text">
                      {tierInfo.daysToGo} day{tierInfo.daysToGo === 1 ? "" : "s"} to {tierInfo.next.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Calibration
              /* The Read is drawn from today's set, so it has to be skipped
                 here or the same pair renders twice on one screen. */
              item={cal.remaining?.find((c) => c.id !== cal.read?.id)}
              completed={cal.completed}
              total={cal.total}
              busy={calBusy}
              onAnswer={answerCal}
              lastResult={lastResult}
              pendingTraits={cal.pendingTraits}
              needsSeed={(cal.total || 0) === 0}
              onFind={() => setTab("find")}
            />

            {/* The incompletion hook. A named, nearly-finished thing pulls
                people back in a way a progress bar never does. */}
            {cal.pendingTraits?.length > 0 && cal.remaining?.length === 0 && (
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title">Still decoding</h2>
                  <span className="card-sub">{tasteMap?.discovered || 0} of {tasteMap?.totalCards || 1446} cards found</span>
                </div>
                {cal.pendingTraits.map((t) => (
                  <div className="pending" key={t.key}>
                    <span className="pending-name">{t.label}</span>
                    <span className="pending-need">{t.need} more {t.need === 1 ? "answer" : "answers"}</span>
                  </div>
                ))}
              </section>
            )}

            {game?.quest && (
              <section className="quest">
                <span className="quest-tag">Today's quest</span>
                <p className="quest-text">{game.quest.label}</p>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button className="btn btn--ghost" onClick={() => setTab("find")}>Go do it</button>
                  <span className="xp-chip">+{game.quest.xp} XP</span>
                </div>
              </section>
            )}

            {pendingVerdicts.length > 0 && (
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title">Open verdicts</h2>
                  <span className="xp-chip">+100 XP each</span>
                </div>
                {pendingVerdicts.map((v) => (
                  <Ask key={v.id} verdict={v} onAnswer={answerVerdict} busy={verdictBusy} />
                ))}
              </section>
            )}

            <section className="card">
              <div className="card-head"><h2 className="card-title">Hungry now?</h2></div>
              <button className="btn btn--hot" onClick={() => setTab("find")}>Find my one</button>
            </section>
          </main>
        )}

        {/* ================= FIND ================= */}
        {tab === "find" && (
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
                <button className="btn btn--hot" onClick={handleSearch} disabled={loading || !query.trim() || !resolvedLocation}>
                  {loading ? "Searching…" : "Find my one"}
                </button>
              </div>

              <div className="loc">
                {resolvedLocation ? (
                  <div className="loc-set">
                    <span className="loc-key">Near</span>
                    <span className="loc-val">{resolvedLocation.name}</span>
                    <button className="link-btn" style={{ marginLeft: "auto" }}
                            onClick={() => { setResolvedLocation(null); setLocationError(""); setRadiusUsed(null); }}>
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="loc-prompt">Enter your ZIP code to search</span>
                    <div className="loc-row">
                      <input
                        type="text" inputMode="numeric" pattern="[0-9]*" maxLength={5}
                        placeholder="e.g. 11801" value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
                        onKeyDown={(e) => { if (e.key === "Enter") applyLocation(); }}
                      />
                      <button className="btn btn--ghost" onClick={applyLocation}
                              disabled={resolvingLocation || locationInput.length !== 5}>
                        {resolvingLocation ? "Checking…" : "Set"}
                      </button>
                    </div>
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

              {searchesRemaining !== null && (
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

                  {typeof radiusUsed === "number" && radiusUsed > RADIUS_FIRST_TIER[radiusMode] && (
                    <p className="verdict-note">
                      Nothing close enough at {RADIUS_FIRST_TIER[radiusMode]} mi — widened to {radiusUsed} mi.
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
                            {showCompare ? "Hide comparisons" : `Top ${winner.runnerUps.length} comparisons`}
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
        {tab === "map" && (
          <main className="page">
            <div className="page-head">
              <h1 className="page-title">Your <em>signature</em></h1>
              <p className="page-sub">
                {tasteMap?.discovered || 0} of {tasteMap?.totalCards || 1446} cards met
              </p>
            </div>

            {tasteMap?.regions?.filter((r) => r.seen > 0).length > 0 ? (
              <>
                <Archetype archetype={tasteMap.archetype} choices={tasteMap.choices} />

                {tasteMap.axes?.length > 0 && (
                  <section className="card">
                    <div className="card-head">
                      <h2 className="card-title">Where you sit</h2>
                      <span className="card-sub">
                        {tasteMap.axes.length} of {tasteMap.axes.length + (tasteMap.measuring?.length || 0)} known
                      </span>
                    </div>
                    {tasteMap.axes.map((a) => <AxisBar key={a.key} axis={a} />)}
                    <Measuring items={tasteMap.measuring} />
                  </section>
                )}

                {/* Before any axis is confident there is nothing to draw, so
                    say what's coming rather than showing an empty card. */}
                {!tasteMap.axes?.length && tasteMap.measuring?.length > 0 && (
                  <section className="card">
                    <div className="card-head"><h2 className="card-title">Where you sit</h2></div>
                    <p className="empty">
                      Nothing measured with confidence yet — we'd rather show you nothing than a guess.
                    </p>
                    <Measuring items={tasteMap.measuring} />
                  </section>
                )}

                {(tasteMap.strongest?.length > 0 || tasteMap.coldest?.length > 0) && (
                  <section className="card card--glow">
                    <div className="card-head">
                      <h2 className="card-title">Your strongest signals</h2>
                    </div>
                    <div className="sigs">
                      <SignalList title="You reach for" tone="love"
                                  nodes={tasteMap.strongest} empty="Nothing decisive yet." />
                      <SignalList title="You pass on" tone="cold"
                                  nodes={tasteMap.coldest} empty="Nothing decisive yet." />
                    </div>
                  </section>
                )}

                <Collection collection={tasteMap.collection} />

                {/* Named, recoverable, and specific. A region going quiet is a
                    reason to come back that doesn't require breaking anything
                    the user has already earned. */}
                {tasteMap.fading?.length > 0 && (
                  <section className="card card--fading">
                    <div className="card-head"><h2 className="card-title">Going cold</h2></div>
                    <p className="fading-why">
                      We haven't tested these in a while, so we're less sure than we were.
                      They sharpen again the moment they come back up.
                    </p>
                    <div className="fading-list">
                      {tasteMap.fading.map((f) => (
                        <span className="fading-chip" key={f.family}>{f.family}</span>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <section className="card">
                <p className="empty">
                  Nothing mapped yet. Answer today's calibration and this fills in — each answer
                  moves the two cards it touched.
                </p>
                <button className="btn btn--hot" style={{ marginTop: 16 }} onClick={() => setTab("today")}>
                  Start calibrating
                </button>
              </section>
            )}
          </main>
        )}

        {/* ================= YOU ================= */}
        {tab === "you" && (
          <main className="page">
            <div className="page-head">
              <h1 className="page-title">Your <em>taste profile</em></h1>
              <p className="page-sub">Built from what you picked, not what you told us.</p>
            </div>

            <section className="card card--glow">
              <div className="card-head"><h2 className="card-title">Our hit rate, for you</h2></div>
              {scoutReport?.visitCount > 0 ? (
                <div className="bigstat">
                  {typeof scoutReport.accuracy === "number" ? (
                    <>
                      <CountUp className="bigstat-n" value={scoutReport.accuracy} />
                      <span className="bigstat-k">% of our picks landed<br />{scoutReport.hitCount} of {scoutReport.visitCount} rated visits</span>
                    </>
                  ) : (
                    <span className="bigstat-k">
                      {scoutReport.visitCount} visit{scoutReport.visitCount === 1 ? "" : "s"} rated — a few more and we'll show how often we're right.
                    </span>
                  )}
                </div>
              ) : (
                <p className="empty">Rate a verdict and this becomes the number that tells you whether to trust us.</p>
              )}
            </section>

            <section className="card">
              <div className="card-head"><h2 className="card-title">How you choose</h2></div>
              {taste?.vector?.sampleSize > 0 ? (
                <>
                  {typeof taste.vector.priceSensitivity === "number" && (
                    <div className="vrow">
                      <div className="vrow-head">
                        <span className="vrow-key">Price sensitivity</span>
                        <span className="vrow-val">{Math.round(taste.vector.priceSensitivity * 100)}%</span>
                      </div>
                      <div className="vrow-bar"><div className="vrow-fill" style={{ width: `${Math.round(taste.vector.priceSensitivity * 100)}%` }} /></div>
                      <span className="vrow-read">{taste.vector.priceSensitivity > 0.6 ? "You take the cheaper option" : "You'll pay up for quality"}</span>
                    </div>
                  )}
                  {typeof taste.vector.crowdTrust === "number" && (
                    <div className="vrow">
                      <div className="vrow-head">
                        <span className="vrow-key">Crowd trust</span>
                        <span className="vrow-val">{Math.round(taste.vector.crowdTrust * 100)}%</span>
                      </div>
                      <div className="vrow-bar"><div className="vrow-fill" style={{ width: `${Math.round(taste.vector.crowdTrust * 100)}%` }} /></div>
                      <span className="vrow-read">{taste.vector.crowdTrust > 0.6 ? "You trust the crowd" : "You back hidden gems"}</span>
                    </div>
                  )}
                  {taste.vector.cuisineAffinity?.length > 0 && (
                    <div className="aff">
                      {taste.vector.cuisineAffinity.map((c) => (
                        <div className="aff-row" key={c.cuisine}>
                          <span className="aff-name">{c.cuisine}</span>
                          <span className="aff-bar"><span className="aff-fill" style={{ width: `${Math.round(c.winRate * 100)}%` }} /></span>
                          <span className="aff-pct">{Math.round(c.winRate * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="vrow-read" style={{ marginTop: 14 }}>From {taste.vector.sampleSize} duel{taste.vector.sampleSize === 1 ? "" : "s"}.</p>
                </>
              ) : (
                <p className="empty">Answer a few duels and your profile builds itself here — no questionnaire.</p>
              )}
            </section>

            {game?.milestones && (
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title">Streak milestones</h2>
                  <span className="card-sub">
                    {game.nextMilestone
                      ? `${game.nextMilestone.days - streakDays} day${game.nextMilestone.days - streakDays === 1 ? "" : "s"} to ${game.nextMilestone.label}`
                      : "All reached"}
                  </span>
                </div>
                <div className="mstones">
                  {game.milestones.map((m) => (
                    <div className={`mstone${m.reached ? " mstone--on" : ""}`} key={m.days}>
                      <span className="mstone-d">{m.days}</span>
                      <span className="mstone-n">{m.label}</span>
                      <span className="mstone-r">+{m.xp.toLocaleString()} XP{m.freezes > 0 ? ` · ${m.freezes} freeze` : ""}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {game?.unlocks && (
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title">Unlocks</h2>
                  <span className="card-sub">
                    {game.xp?.toLocaleString()} XP{level?.nextRank ? ` · ${level.xpToNext.toLocaleString()} to ${level.nextRank}` : ""}
                  </span>
                </div>
                <div className="ladder">
                  {game.unlocks.map((u) => (
                    <div className={`rung${u.unlocked ? " rung--on" : ""}`} key={u.key}>
                      <span className="rung-lv">Lv{u.level}</span>
                      <span className="rung-name">{u.label}</span>
                      <span className="rung-state">{u.unlocked ? "open" : `${u.level - (level?.level ?? 1)} to go`}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>
        )}

        <footer className="foot">© 2026 SavorScout</footer>
      </div>
    </div>
  );
}

export default App;