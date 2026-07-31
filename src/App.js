import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://savorscout.onrender.com";

// ZIP is the only way location enters this app — no GPS, no IP guessing.
//
// Mapbox was a mistake here: it has no keyless mode, so without a token the
// lookup failed before it ever sent a request. Every other service in this
// app is either keyless (the old Nominatim calls) or lives on the BACKEND
// (Serper, Exa, OpenAI, Supabase all read process.env in server.js, which
// is why Render has those keys and Vercel needs none). Requiring a frontend
// token broke that pattern and broke the app.
//
// A US ZIP is a fixed public dataset, so this is now a chain of keyless
// providers tried in order. Zero configuration, and one provider being down
// or rate-limiting no longer takes location out entirely.
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN; // optional upgrade, never required

// Radius presets. "Nearby" is the default because a 5-10 mile result is one
// someone will actually drive to; the wider tiers exist for sparse areas.
// Mirrors the backend's first tier per mode, purely so the UI can say
// "widened to 15 mi" only when it actually widened.
const RADIUS_FIRST_TIER = { nearby: 5, driving: 10, anywhere: 15 };

const RADIUS_MODES = [
  { id: "nearby", label: "Nearby", hint: "5-15 mi" },
  { id: "driving", label: "Willing to drive", hint: "10-25 mi" },
  { id: "anywhere", label: "Anywhere worth it", hint: "15-40 mi" },
];

// --- Hero card helpers -----------------------------------------------------

// Feeds the `.why-chips` block, which the stylesheet labels "why this won".
// Rewritten to emit actual reasons rather than restating the `.meta-row` —
// rating, category and distance already render there, so the original
// version duplicated them a few pixels apart. Each chip is gated on the
// backend's absolute sub-score, so a weak winner shows fewer chips instead
// of the same three every time.
function buildChips(restaurant) {
  const chips = [];
  const sb = restaurant.scoreBreakdown || {};

  if (restaurant.matchedDish) {
    chips.push(`Matches your craving for "${restaurant.matchedDish}"`);
  } else if (restaurant.matchedCuisine) {
    chips.push(`${restaurant.matchedCuisine} done well`);
  }

  if (typeof restaurant.rating === "number" && sb.quality >= 65 && restaurant.reviewCount >= 50) {
    chips.push(`Well reviewed — ${restaurant.reviewCount.toLocaleString()} ratings`);
  }

  // Under the old exp-decay scale this threshold was near-unreachable (a
  // 3-mile restaurant scored 37). It now means what it says.
  if (sb.proximity >= 75 && typeof restaurant.distanceMiles === "number") {
    chips.push(`Close by — ${restaurant.distanceMiles} mi`);
  }

  if (sb.evidence >= 60) {
    chips.push(
      restaurant.evidence?.sourceType === "official_site"
        ? "Serves it — confirmed on their menu"
        : "Menu confirmed online"
    );
  }

  // Only the qualities the user actually asked for AND that showed up in
  // reception text — never the ones we looked for and didn't find.
  if (restaurant.matchedFactors?.length) {
    for (const factor of restaurant.matchedFactors.slice(0, 3)) {
      chips.push(`Reviews mention "${factor}"`);
    }
  }

  if (typeof sb.budget === "number" && sb.budget >= 70) chips.push("Fits your budget");
  

  if (chips.length === 0 && restaurant.category) chips.push(restaurant.category);

  return chips;
}

// distanceFrom comes from the backend: "you" when the anchor is the user's
// own position, or the named place when they searched somewhere else.
function distanceLabel(restaurant) {
  if (typeof restaurant.distanceMiles !== "number") return null;
  const from =
    restaurant.distanceFrom && restaurant.distanceFrom !== "you" ? `from ${restaurant.distanceFrom}` : "away";
  return `${restaurant.distanceMiles} mi ${from}`;
}

function mapsUrl(restaurant) {
  if (typeof restaurant.lat === "number" && typeof restaurant.lng === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`;
  }
  const q = encodeURIComponent(`${restaurant.name} ${restaurant.address || ""}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// Keyless embed for `.map-embed`. Google's Embed API needs a billing-enabled
// key; OpenStreetMap does not. Swap the src if you already have one.
function osmEmbedUrl(lat, lng) {
  const d = 0.006;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

function MiniMetric({ label, value }) {
  if (typeof value !== "number") return null;
  return (
    <div className="mini-metric">
      <div
        className="mini-metric-bar"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="mini-metric-fill" style={{ width: `${value}%` }} />
      </div>
      <span className="mini-metric-value">{value}%</span>
      <span className="mini-metric-label">{label}</span>
    </div>
  );
}

function ComparisonTease({ runnerUps }) {
  const [open, setOpen] = useState(false);
  if (!runnerUps || runnerUps.length === 0) return null;

  return (
    <div className="comparison-tease">
      <button className="comparison-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Hide comparisons" : `View top ${runnerUps.length} comparisons →`}
      </button>
      {open && (
        <ul className="comparison-list">
          {runnerUps.map((r, i) => (
            <li key={`${r.name}-${i}`}>
              <span className="comparison-name">{r.name}</span>
              <span className="comparison-score">{r.matchScore}% match</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StarRating({ rating }) {
  const filled = Math.round(typeof rating === "number" ? rating : 5);
  return (
    <span className="stars" aria-label={`${filled} out of 5 stars`}>
      {"★★★★★".slice(0, filled)}
      <span className="stars-empty">{"★★★★★".slice(filled)}</span>
    </span>
  );
}

function EvidenceSection({ evidence, reception, review, menuItems, rating, matchedDietaryTerms, matchedAllergyTerms }) {
  const hasReview = Boolean(review?.text);
  const hasMenu = Boolean(menuItems?.length);
  const hasQuote = Boolean(evidence?.quote) && !hasReview;
  const hasReception = Boolean(reception?.quote) && !hasReview;
  const hasAllergy = Boolean(matchedAllergyTerms?.length);
  const hasDietary = Boolean(matchedDietaryTerms?.length);

  if (!hasReview && !hasMenu && !hasQuote && !hasReception && !hasAllergy && !hasDietary) return null;

  return (
    <div className="evidence-section">
      {hasReview ? (
        <div className="review-block">
          <div className="review-head">
            <StarRating rating={5} />
            <span className="evidence-label review-label">What people say</span>
          </div>
          <blockquote className="evidence-quote">{review.text}</blockquote>
          {review.sourceUrl && (
            <a className="evidence-source-link" href={review.sourceUrl} target="_blank" rel="noreferrer">
              Read the source →
            </a>
          )}
        </div>
      ) : (
        typeof rating === "number" && (
          // No review sentence surfaced in the research. Show the real
          // aggregate rating rather than manufacture a quote.
          <div className="review-block">
            <div className="review-head">
              <StarRating rating={rating} />
              <span className="evidence-label review-label">{rating.toFixed(1)} average rating</span>
            </div>
          </div>
        )
      )}

      {hasMenu && (
        <div className="menu-block">
          <span className="evidence-label">On the menu</span>
          <ul className="menu-list">
            {menuItems.map((item, i) => (
              <li key={i}>
                <span className="menu-item-name">{item.name}</span>
                <span className="menu-item-dash">—</span>
                <span className="menu-item-price">{item.price}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasQuote && (
        <div className="reception-block">
          <span className="evidence-label">From their menu</span>
          <blockquote className="evidence-quote">{evidence.quote}</blockquote>
        </div>
      )}

      {hasReception && (
        <div className="reception-block">
          <span className="evidence-label">From web research</span>
          <blockquote className="evidence-quote">{reception.quote}</blockquote>
        </div>
      )}

      {hasAllergy && (
        <p className="allergy-note">
          Mentions {matchedAllergyTerms.join(", ")} — this is not a safety guarantee. Always confirm allergy
          details directly with the restaurant before ordering.
        </p>
      )}

      {hasDietary && <p className="dietary-note">Confirmed: {matchedDietaryTerms.join(", ")}</p>}
    </div>
  );
}

// The six-bar grid used to sit permanently on the card, zeros and all. A
// row reading "DISTANCE 0%" undercuts the verdict it is supposed to
// support, so the numbers move behind a toggle for people who want them,
// and only metrics that carry real information are listed.
// `trust` (website/phone on file) was dropped from the card: it's a useful
// ranking tiebreaker but not something a diner cares about, and it quietly
// capped good small restaurants that don't have a website.
// Any metric the backend couldn't measure arrives as null, and MiniMetric
// skips non-numbers — so an unmeasured signal is absent rather than 0%.
const METRIC_LABELS = {
  relevance: "Dish match",
  quality: "Ratings",
  proximity: "Distance",
  vibe: "Vibe match",
  evidence: "Evidence",
  budget: "Price fit",
};

// The map was ~200px of always-on height that most people never look at.
// Collapsed by default, it stops the card from running past the fold.
function MapPeek({ lat, lng, name }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="map-peek">
      <button className="comparison-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Hide map" : "Show map →"}
      </button>
      {open && (
        <div className="map-embed">
          <iframe
            title={`Map showing ${name}`}
            src={osmEmbedUrl(lat, lng)}
            width="100%"
            height="180"
            style={{ border: 0, display: "block" }}
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}

function ScoreDetail({ breakdown }) {
  const [open, setOpen] = useState(false);
  if (!breakdown) return null;

  const rows = Object.entries(METRIC_LABELS)
    .map(([key, label]) => [label, breakdown[key]])
    .filter(([, value]) => typeof value === "number");

  if (rows.length === 0) return null;

  return (
    <div className="score-detail">
      <button className="comparison-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Hide the numbers" : "How we scored this →"}
      </button>
      {open && (
        <div className="score-core-metrics">
          {rows.map(([label, value]) => (
            <MiniMetric key={label} label={label} value={value} />
          ))}
        </div>
      )}
    </div>
  );
}

// One plain sentence stating how decisive the win was. This is the piece
// that was missing: the card showed arithmetic but never said "and that
// means this is the one".
function verdictLine(winner) {
  const beat = winner.beatCount || 0;
  const lead = winner.dominancePercent;

  if (beat === 0) return "The only place nearby that fits what you asked for.";
  if (typeof lead === "number" && lead >= 25) {
    return `Clear winner — well ahead of the other ${beat} nearby.`;
  }
  if (typeof lead === "number" && lead >= 8) {
    return `Best of the ${beat} nearby places we compared.`;
  }
  return `Edged out ${beat} other${beat === 1 ? "" : "s"} nearby — it was close.`;
}

function AnimatedScore({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof value !== "number") return undefined;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setDisplayValue(value);
      return undefined;
    }

    let frame;
    const duration = 900;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplayValue(Math.round(value * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  if (typeof value !== "number") return null;

  return (
    <div className="score-badge">
      <span className="score-badge-number">{displayValue}%</span>
      <span className="score-badge-label">match</span>
    </div>
  );
}

function RestaurantImage({ imageUrl, imageSourceUrl, name, matchScore }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const showPhoto = Boolean(imageUrl) && !imgFailed;

  // Reset the failure flag when a new search brings in a different photo,
  // otherwise one broken URL permanently pins the card to the monogram.
  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  return (
    <div className="result-hero-visual">
      {showPhoto ? (
        <img
          className="hero-photo"
          src={imageUrl}
          alt={`${name} restaurant`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="hero-monogram" aria-hidden="true">{initial}</div>
      )}
      <AnimatedScore value={matchScore} />
      {showPhoto && imageSourceUrl && (
        <a className="hero-photo-source" href={imageSourceUrl} target="_blank" rel="noreferrer">
          Photo source
        </a>
      )}
    </div>
  );
}

// A blank "please try again" makes a schema or policy problem look like a
// network blip. These are the failures this upsert actually produces.
function explainSaveError(error) {
  const code = error?.code;
  const msg = error?.message || "";

  if (code === "42501" || /row-level security/i.test(msg)) {
    return "Couldn't save — your account isn't allowed to write to profiles. That's a missing RLS policy, not something you did wrong.";
  }
  if (code === "PGRST204" || code === "42703") {
    return `Couldn't save — the profiles table is missing a column (${msg}).`;
  }
  if (code === "23505") {
    return "Couldn't save — that conflicts with an existing profile row.";
  }
  if (code === "23502") {
    return `Couldn't save — a required column has no value (${msg}).`;
  }
  return `Couldn't save — ${msg || "please try again."}`;
}

// ===========================================================================
// GAME LAYER
//
// Deliberately NOT Duolingo-shaped. Same underlying mechanics — streak, XP,
// levels, loss aversion — but presented as instrumentation rather than play,
// which is what separates Strava/Whoop/Letterboxd from a children's app.
// Concretely: mono numerals, thin exact progress bars, geometric marks, no
// mascot, no confetti, no exclamation marks.
// ===========================================================================

const TABS = [
  { id: "today", label: "Today", minLevel: 1 },
  { id: "find", label: "Find", minLevel: 1 },
  { id: "you", label: "You", minLevel: 1 },
  { id: "collection", label: "Collection", minLevel: 8 },
];

// The single number that carries loss aversion. Shown on every tab so the
// cue is always present — but never accompanied by a nag, because guilt
// mechanics are the part of Duolingo worth leaving behind.
function StreakBadge({ streak }) {
  if (!streak || streak.days === 0) return null;
  return (
    <div className={`streak-badge${streak.activeToday ? " streak-badge--active" : ""}`}>
      <span className="streak-flame" aria-hidden="true">▲</span>
      <span className="streak-days">{streak.days}</span>
      <span className="streak-unit">day{streak.days === 1 ? "" : "s"}</span>
    </div>
  );
}

function LevelPill({ level }) {
  if (!level) return null;
  return (
    <div className="level-pill" title={`${level.xpToNext.toLocaleString()} XP to ${level.nextRank || "max"}`}>
      <span className="level-rank">{level.rank}</span>
      <span className="level-num">Lv{level.level}</span>
      <span className="level-track">
        <span className="level-fill" style={{ width: `${Math.round(level.progress * 100)}%` }} />
      </span>
    </div>
  );
}

// Pairwise choice — the daily action. Doable 365 days a year because it
// costs nothing, and it's the highest-value signal we can collect: forced
// choice reveals an ordering that star ratings never can.
const AXIS_PROMPT = {
  price: "Same food, different price",
  rating: "Same price, different reputation",
  distance: "Which is worth the trip",
  cuisine: "Two good options, different food",
  popularity: "Crowd favourite or hidden gem",
  open: "Which would you rather, tonight",
};

function DuelCard({ place, onPick, disabled, side }) {
  const price = place.price_level ? "$".repeat(place.price_level) : null;
  return (
    <button
      className={`duel-card duel-card--${side}`}
      onClick={onPick}
      disabled={disabled}
      aria-label={`Choose ${place.name}`}
    >
      <span className="duel-card-visual">
        {place.thumbnail ? (
          <img src={place.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <span className="duel-card-monogram">{(place.name || "?").charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="duel-card-body">
        <span className="duel-card-name">{place.name}</span>
        <span className="duel-card-meta">
          {typeof place.rating === "number" && <span className="duel-stat">{place.rating.toFixed(1)}★</span>}
          {price && <span className="duel-stat">{price}</span>}
          {place.review_count ? <span className="duel-stat duel-stat--dim">{place.review_count.toLocaleString()}</span> : null}
        </span>
        {place.category && <span className="duel-card-cat">{place.category}</span>}
      </span>
    </button>
  );
}

function DuelPanel({ duels, completed, total, needsSeed, busy, onAnswer, onGoFind }) {
  if (needsSeed) {
    return (
      <section className="panel panel--duels">
        <div className="panel-head">
          <h2 className="panel-title">Taste duels</h2>
          <span className="panel-sub">Locked until we know your area</span>
        </div>
        <p className="panel-empty">
          Run one search first. Every search stocks the pool of places your duels are drawn from —
          after that they'll be here daily.
        </p>
        <button className="cta" onClick={onGoFind}>Find somewhere to eat →</button>
      </section>
    );
  }

  const done = total > 0 && duels.length === 0;

  return (
    <section className="panel panel--duels">
      <div className="panel-head">
        <h2 className="panel-title">Taste duels</h2>
        <span className="panel-sub">
          {completed}/{total} today · <span className="xp-tag">+{10} XP each</span>
        </span>
      </div>

      <div className="duel-progress">
        {Array.from({ length: total || 5 }).map((_, i) => (
          <span key={i} className={`duel-pip${i < completed ? " duel-pip--done" : ""}`} />
        ))}
      </div>

      {done ? (
        <p className="panel-done">
          All five done. Your profile got sharper — come back tomorrow for the next set.
        </p>
      ) : (
        duels.slice(0, 1).map((duel) => (
          <div className="duel" key={duel.id}>
            <p className="duel-prompt">{AXIS_PROMPT[duel.axis] || AXIS_PROMPT.open}</p>
            <div className="duel-pair">
              <DuelCard side="left" place={duel.left_place} disabled={busy}
                        onPick={() => onAnswer(duel.id, "left")} />
              <span className="duel-vs">or</span>
              <DuelCard side="right" place={duel.right_place} disabled={busy}
                        onPick={() => onAnswer(duel.id, "right")} />
            </div>
            <button className="duel-skip" disabled={busy} onClick={() => onAnswer(duel.id, "skip")}>
              No preference
            </button>
          </div>
        ))
      )}
    </section>
  );
}

// The payoff screen. Everything here is derived from the user's own answers,
// which is what makes it feel earned rather than decorative.
function TasteVector({ vector }) {
  if (!vector || vector.sampleSize === 0) {
    return (
      <p className="panel-empty">
        Answer a few duels and your preference profile builds itself here — no questionnaire.
      </p>
    );
  }

  const rows = [];
  if (vector.priceSensitivity != null) {
    rows.push({
      label: "Price sensitivity",
      value: Math.round(vector.priceSensitivity * 100),
      read: vector.priceSensitivity > 0.6 ? "You take the cheaper option" : "You'll pay up for quality",
    });
  }
  if (vector.crowdTrust != null) {
    rows.push({
      label: "Crowd trust",
      value: Math.round(vector.crowdTrust * 100),
      read: vector.crowdTrust > 0.6 ? "You trust the crowd" : "You back hidden gems",
    });
  }

  return (
    <>
      {rows.map((r) => (
        <div className="vector-row" key={r.label}>
          <div className="vector-head">
            <span className="vector-label">{r.label}</span>
            <span className="vector-value">{r.value}%</span>
          </div>
          <div className="vector-track"><div className="vector-fill" style={{ width: `${r.value}%` }} /></div>
          <span className="vector-read">{r.read}</span>
        </div>
      ))}

      {vector.cuisineAffinity.length > 0 && (
        <div className="affinity">
          <span className="panel-label">What you pick most</span>
          <div className="affinity-rows">
            {vector.cuisineAffinity.map((c) => (
              <div className="affinity-row" key={c.cuisine}>
                <span className="affinity-name">{c.cuisine}</span>
                <span className="affinity-track">
                  <span className="affinity-fill" style={{ width: `${Math.round(c.winRate * 100)}%` }} />
                </span>
                <span className="affinity-pct">{Math.round(c.winRate * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="vector-foot">Built from {vector.sampleSize} duel{vector.sampleSize === 1 ? "" : "s"}.</p>
    </>
  );
}

// Directed data collection, experienced as a target. Deterministic per day
// so it can't be rerolled — a fixture, not a slot machine.
function QuestCard({ quest, onGoFind }) {
  if (!quest) return null;
  return (
    <section className="panel panel--quest">
      <div className="panel-head">
        <h2 className="panel-title">Today's quest</h2>
        <span className="panel-sub"><span className="xp-tag">+{quest.xp} XP</span></span>
      </div>
      <p className="quest-label">{quest.label}</p>
      <button className="cta cta--ghost" onClick={onGoFind}>Go do it →</button>
    </section>
  );
}

// Milestones grant freezes, so the longer the streak the MORE forgiving the
// system gets. That's deliberately backwards from the usual design, where a
// long streak makes one bad day catastrophic and pushes people to quit
// rather than rebuild.
function StreakLadder({ milestones, next, current }) {
  if (!milestones?.length) return null;
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Streak</h2>
        <span className="panel-sub">
          {next ? `${next.days - current} day${next.days - current === 1 ? "" : "s"} to ${next.label}` : "All reached"}
        </span>
      </div>
      <div className="milestones">
        {milestones.map((m) => (
          <div className={`milestone${m.reached ? " milestone--hit" : ""}`} key={m.days}>
            <span className="milestone-days">{m.days}</span>
            <span className="milestone-label">{m.label}</span>
            <span className="milestone-reward">
              +{m.xp.toLocaleString()} XP{m.freezes > 0 ? ` · ${m.freezes} freeze` : ""}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function UnlockLadder({ unlocks, level }) {
  if (!unlocks) return null;
  return (
    <div className="ladder">
      {unlocks.map((u) => (
        <div className={`ladder-row${u.unlocked ? " ladder-row--open" : ""}`} key={u.key}>
          <span className="ladder-lv">Lv{u.level}</span>
          <span className="ladder-label">{u.label}</span>
          <span className="ladder-state">{u.unlocked ? "open" : `${u.level - level} to go`}</span>
        </div>
      ))}
    </div>
  );
}

function Passport({ stamps }) {
  if (!stamps || stamps.length === 0) {
    return <p className="panel-empty">Every new kind of food you're sent to earns a stamp.</p>;
  }
  return (
    <div className="passport">
      {stamps.map((s) => (
        <div className="stamp" key={s.cuisine}>
          <span className="stamp-mark" aria-hidden="true">◆</span>
          <span className="stamp-name">{s.cuisine}</span>
          <span className="stamp-place">{s.place_name}</span>
        </div>
      ))}
    </div>
  );
}

// --- Verdict loop ----------------------------------------------------------
// The reason to come back when you're not hungry: we made a prediction and
// nobody has graded it yet. One tap answers it — no forms, no ratings out of
// ten, no photo upload.

const OUTCOMES = [
  { id: "better", label: "Better than expected", tone: "good" },
  { id: "expected", label: "About right", tone: "ok" },
  { id: "worse", label: "Worse", tone: "bad" },
];

function PendingVerdict({ verdict, onAnswer, busy }) {
  const [stage, setStage] = useState("ask"); // "ask" → "rate"

  return (
    <div className="verdict-prompt">
      <div className="verdict-prompt-head">
        <span className="verdict-prompt-eyebrow">We sent you here</span>
        <span className="verdict-prompt-name">{verdict.name}</span>
        {typeof verdict.match_score === "number" && (
          <span className="verdict-prompt-claim">we said {verdict.match_score}%</span>
        )}
      </div>

      {stage === "ask" ? (
        <>
          <p className="verdict-prompt-q">Did you end up going?</p>
          <div className="verdict-prompt-actions">
            <button className="verdict-btn verdict-btn--primary" disabled={busy} onClick={() => setStage("rate")}>
              Yes, I went
            </button>
            <button
              className="verdict-btn"
              disabled={busy}
              onClick={() => onAnswer(verdict.id, { visited: false })}
            >
              Didn't go
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="verdict-prompt-q">How close were we?</p>
          <div className="verdict-prompt-actions">
            {OUTCOMES.map((o) => (
              <button
                key={o.id}
                className={`verdict-btn verdict-btn--${o.tone}`}
                disabled={busy}
                onClick={() => onAnswer(verdict.id, { visited: true, outcome: o.id })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// The payoff. Shown only once there's a real sample — a "100% accurate"
// badge off one rating is worse than no badge at all.
function ScoutReport({ report }) {
  if (!report || report.visitCount === 0) return null;

  const { accuracy, hitCount, visitCount, learned } = report;
  const hasLearned = learned?.likes?.length > 0 || learned?.avoids?.length > 0;

  return (
    <div className="scout-report">
      <div className="scout-report-stat">
        {typeof accuracy === "number" ? (
          <>
            <span className="scout-report-number">{accuracy}%</span>
            <span className="scout-report-label">
              of our picks landed — {hitCount} of {visitCount}
            </span>
          </>
        ) : (
          <span className="scout-report-label">
            {visitCount} {visitCount === 1 ? "visit" : "visits"} rated — a few more and we'll show
            how often we're right
          </span>
        )}
      </div>

      {hasLearned && (
        <p className="scout-report-learned">
          {learned.likes.length > 0 && <>Learned you like <strong>{learned.likes.join(", ")}</strong>. </>}
          {learned.avoids.length > 0 && <>Steering you away from <strong>{learned.avoids.join(", ")}</strong>.</>}
        </p>
      )}
    </div>
  );
}

// The ZIP the user last confirmed, kept so duels can be drawn from their
// area even before they've searched this session.
function localStorage_getZip() {
  try {
    return window.sessionStorage.getItem("savorscout_zip") || "";
  } catch {
    return "";
  }
}

function localStorage_setZip(zip) {
  try {
    window.sessionStorage.setItem("savorscout_zip", zip);
  } catch {
    /* private mode — duels just fall back to a wider pool */
  }
}

function App() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState(""); // echoed in .match-banner-query
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // FIX: device and manual coordinates are tracked separately. The original
  // overwrote `coords` with the geocoded manual location, so clearing the
  // manual box left the app permanently stuck on the typed location with no
  // way back to GPS.
  // One confirmed location, or none. { name, short, lat, lng }
  const [resolvedLocation, setResolvedLocation] = useState(null);
  const [radiusMode, setRadiusMode] = useState("nearby");
  const [radiusUsed, setRadiusUsed] = useState(null); // what the backend settled on
  const [locationError, setLocationError] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [resolvingLocation, setResolvingLocation] = useState(false);

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState(""); // FIX: success messages no longer styled as errors
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [resetSent, setResetSent] = useState(false);

  const [searchesRemaining, setSearchesRemaining] = useState(null);

  const [pendingVerdicts, setPendingVerdicts] = useState([]);
  const [scoutReport, setScoutReport] = useState(null);
  const [verdictBusy, setVerdictBusy] = useState(false);

  // Tab state rather than react-router: no new dependency, and no SPA
  // rewrite rule needed on Vercel (a direct hit on /find would 404 without
  // one, which catches a lot of people mid-launch).
  const [tab, setTab] = useState("today");
  const [game, setGame] = useState(null);
  const [duelState, setDuelState] = useState({ duels: [], completed: 0, total: 0, needsSeed: true });
  const [duelBusy, setDuelBusy] = useState(false);
  const [taste, setTaste] = useState(null);
  const [xpFlash, setXpFlash] = useState(null);

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [allergies, setAllergies] = useState("");
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");

  const searchAbortRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setOnboardingChecked(false);
      setNeedsOnboarding(false);
      return undefined;
    }

    // FIX: guards against a stale response from a previous user landing on
    // the current one after a fast sign-out/sign-in.
    let cancelled = false;

    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Failed to check onboarding status:", error);
        setNeedsOnboarding(!data?.onboarding_completed);
        setOnboardingChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    return () => searchAbortRef.current?.abort();
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (authBusy) return;
    setAuthError("");
    setAuthNotice("");
    setResetSent(false);

    if (!email.trim() || !password.trim()) {
      setAuthError("Enter both email and password.");
      return;
    }

    setAuthBusy(true);
    try {
      if (authMode === "signup") {
        try {
          const checkResponse = await fetch(`${API_BASE_URL}/auth/check-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim() }),
          });

          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            if (checkData.exists) {
              setAuthError("An account with this email already exists. Please sign in instead.");
              setAuthMode("signin");
              return;
            }
          }
        } catch (err) {
          console.error("Email check failed:", err);
        }

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
          setAuthError(error.message);
          return;
        }

        const identities = data?.user?.identities;
        if (data?.user && Array.isArray(identities) && identities.length === 0) {
          setAuthError("An account with this email already exists. Try signing in instead.");
          setAuthMode("signin");
          return;
        }

        setAuthNotice("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setAuthError(error.message);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setAuthNotice("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setAuthError(error.message);
  };

  const handleForgotPassword = async () => {
    setAuthError("");
    setAuthNotice("");
    setResetSent(false);

    if (!email.trim()) {
      setAuthError('Enter your email above first, then click "Forgot password?"');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) setAuthError(error.message);
    else setResetSent(true);
  };

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setAuthError("");
    setAuthNotice("");
    setResetSent(false);
  };

  const handleSignOut = async () => {
    searchAbortRef.current?.abort();
    await supabase.auth.signOut();
    setResults([]);
    setQuery("");
    setSubmittedQuery("");
    setErrorMsg("");
    setSearchesRemaining(null);
    setOnboardingChecked(false);
    setNeedsOnboarding(false);
    setAllergies("");
    setDietaryPreferences("");
    setOnboardingError("");
    setLocationInput("");
    setResolvedLocation(null);
    setLocationError("");
    setRadiusUsed(null);
    setPendingVerdicts([]);
    setScoutReport(null);
    setGame(null);
    setTaste(null);
    setDuelState({ duels: [], completed: 0, total: 0, needsSeed: true });
    setTab("today");
  };

  const handleSaveOnboarding = async () => {
    if (!user || onboardingSaving) return;
    setOnboardingSaving(true);
    setOnboardingError("");

    const base = {
      id: user.id,
      allergies: allergies.trim(),
      dietary_preferences: dietaryPreferences.trim(),
      onboarding_completed: true,
    };

    // Writing `email` is only useful if profiles actually has that column
    // (it feeds /auth/check-email). If it doesn't, PostgREST rejects the
    // ENTIRE upsert with PGRST204 rather than ignoring the unknown key — so
    // try with it, then fall back to the columns we know exist.
    let { error } = await supabase
      .from("profiles")
      .upsert({ ...base, email: user.email ?? null }, { onConflict: "id" });

    if (error && (error.code === "PGRST204" || /email/i.test(error.message || ""))) {
      console.warn("profiles has no `email` column — saving without it.", error.message);
      ({ error } = await supabase.from("profiles").upsert(base, { onConflict: "id" }));
    }

    if (error) {
      console.error("Failed to save preferences:", error);
      setOnboardingError(explainSaveError(error));
    } else {
      setNeedsOnboarding(false);
    }

    setOnboardingSaving(false);
  };

  // Location is now mandatory and explicit. No IP guessing: an IP puts you
  // in the right metro on a good day and the wrong state on a bad one, and
  // silently searching the wrong place is worse than asking.
  // ZIP-only by request: manual entry is now strictly a 5-digit ZIP, and
  // Mapbox's postcode-typed forward geocode always resolves to at most one
  // place, so — unlike the earlier free-text search — there is nothing to
  // disambiguate and no picker to show.
  // Mapbox's geocode/v6/forward endpoint, structured to a postcode lookup.
  // A public (pk.*) token is safe to ship in the frontend bundle — that is
  // its intended use, same as a Google Maps JS key.
  // Returns { ok: true, location } or { ok: false, reason }. A discriminated
  // result rather than a bare null so the caller can tell "bad token" apart
  // from "that ZIP genuinely isn't in Mapbox's data" — collapsing those into
  // one message is exactly what made a real ZIP (11753 — Westbury, NY) look
  // like a typo when the actual problem was elsewhere.
  // Keyless providers, tried in order. Each returns a location or null; the
  // first success wins. None of these require an account, a token, or any
  // Vercel configuration — which is the whole point, since requiring one is
  // what broke this in the first place.
  const zipProviders = useMemo(
    () => [
      // 1. Zippopotam — purpose-built US ZIP database, keyless, CORS-open.
      async (zip) => {
        const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (!res.ok) return null;
        const data = await res.json();
        const place = data?.places?.[0];
        if (!place) return null;

        const lat = parseFloat(place.latitude);
        const lng = parseFloat(place.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const city = place["place name"];
        const state = place["state"];
        if (!city) return null;

        return { name: state ? `${city}, ${state}` : city, short: city, lat, lng };
      },

      // 2. Nominatim structured postcode query — keyless, and the thing that
      //    worked in this app for weeks. Fine from a browser (the user's own
      //    IP); it is only blocked from cloud datacenters, which is why the
      //    SERVER could never call it but this can.
      async (zip) => {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&country=us&postalcode=${encodeURIComponent(zip)}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        const hit = Array.isArray(data) ? data[0] : null;
        if (!hit) return null;

        const lat = parseFloat(hit.lat);
        const lng = parseFloat(hit.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const a = hit.address || {};
        const city = a.city || a.town || a.village || a.hamlet || a.suburb || a.county;
        if (!city) return null;

        return { name: a.state ? `${city}, ${a.state}` : city, short: city, lat, lng };
      },

      // 3. Mapbox — only if a token happens to be configured. A genuine
      //    upgrade when present, never a requirement.
      async (zip) => {
        if (!MAPBOX_TOKEN) return null;
        const res = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward` +
            `?q=${encodeURIComponent(zip)}&country=US&types=postcode&limit=1&access_token=${MAPBOX_TOKEN}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        const feature = Array.isArray(data?.features) ? data.features[0] : null;
        if (!feature) return null;

        const [lng, lat] = feature.geometry?.coordinates || [];
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const props = feature.properties || {};
        const ctx = props.context || {};
        const name =
          props.place_formatted ||
          [ctx.place?.name, ctx.region?.name].filter(Boolean).join(", ") ||
          props.name ||
          zip;
        return { name, short: ctx.place?.name || props.name || name, lat, lng };
      },
    ],
    []
  );

  // Returns { ok: true, location } or { ok: false, reason }. "not_found"
  // only when every provider ran and genuinely had no match — distinct from
  // "they were all unreachable", so the message can tell the truth.
  const lookupZip = useCallback(
    async (zip) => {
      let anyProviderResponded = false;

      for (const provider of zipProviders) {
        try {
          const result = await provider(zip);
          anyProviderResponded = true;
          if (result) return { ok: true, location: result };
        } catch (err) {
          console.warn("ZIP provider failed, trying the next one:", err.message);
        }
      }

      return { ok: false, reason: anyProviderResponded ? "not_found" : "network" };
    },
    [zipProviders]
  );

  // ZIP is the only door location comes through, full stop — no GPS, no
  // typed city/state, no free text. A ZIP always resolves to at most one
  // place, so there is nothing to disambiguate and nothing to confirm
  // beyond "did Mapbox recognize it".
  const applyLocation = async () => {
    const zip = locationInput.trim();
    if (resolvingLocation) return;

    if (!/^\d{5}$/.test(zip)) {
      setLocationError("Enter a 5-digit ZIP code.");
      return;
    }

    setLocationError("");
    setResolvingLocation(true);

    try {
      const result = await lookupZip(zip);

      if (!result.ok) {
        setLocationError(
          result.reason === "network"
            ? "Couldn't reach the location service — check your connection and try again."
            : `Couldn't find ZIP "${zip}" in the US.`
        );
        return;
      }

      // BUG FIX: the ZIP itself has to travel with the location. The server
      // was slicing the place NAME ("Hicksville, New York" → "Hic") to key
      // the duel pool, while the client asked for the real ZIP ("11801" →
      // "118"). They never matched, so the pool always looked empty and
      // duels never appeared.
      setResolvedLocation({ ...result.location, zip });
      setLocationInput("");
      localStorage_setZip(zip);
      // A newly-set area may have duels waiting that we couldn't build before.
      refreshDuels().catch(() => {});
    } finally {
      setResolvingLocation(false);
    }
  };

  // Shared auth wrapper so the loop's three endpoints don't each re-implement
  // token handling.
  const authedFetch = useCallback(async (path, init = {}) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return null;

    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    });
    if (!res.ok) return null;
    return res.json().catch(() => null);
  }, []);

  const flashXp = useCallback((award) => {
    if (!award?.gained) return;
    setXpFlash({ amount: award.gained, leveledUp: award.leveledUp, rank: award.level?.rank });
    setTimeout(() => setXpFlash(null), 2600);
  }, []);

  const refreshGame = useCallback(async () => {
    const [state, taste_] = await Promise.all([
      authedFetch("/game/state"),
      authedFetch("/me/taste"),
    ]);
    if (state) setGame(state);
    if (taste_) setTaste(taste_);
  }, [authedFetch]);

  const refreshDuels = useCallback(async () => {
    const zip = resolvedLocation?.zip || localStorage_getZip();
    const data = await authedFetch(`/duels/today?zip=${encodeURIComponent(zip)}`);
    if (data) setDuelState(data);
  }, [authedFetch, resolvedLocation]);

  const answerDuel = async (id, chosen) => {
    if (duelBusy) return;
    setDuelBusy(true);
    // Optimistic: the pair disappears the instant they tap. A spinner on a
    // one-tap choice makes the daily action feel like work.
    setDuelState((prev) => ({
      ...prev,
      duels: prev.duels.filter((d) => d.id !== id),
      completed: prev.completed + (chosen === "skip" ? 0 : 1),
    }));
    try {
      const res = await authedFetch("/duels/answer", {
        method: "POST",
        body: JSON.stringify({ id, chosen }),
      });
      if (res?.award) flashXp(res.award);
      refreshGame().catch(() => {});
    } finally {
      setDuelBusy(false);
    }
  };

  // Zero-effort telemetry. Fire-and-forget so it can never block or break
  // the UI — a Directions click is revealed intent and is worth more than
  // any survey answer we could ask for.
  const track = useCallback(
    async (kind, payload) => {
      try {
        const res = await authedFetch("/events", {
          method: "POST",
          body: JSON.stringify({ kind, payload: payload || null }),
        });
        if (res?.award) {
          flashXp(res.award);
          refreshGame().catch(() => {});
        }
      } catch {
        /* telemetry must never surface an error */
      }
    },
    [authedFetch, flashXp, refreshGame]
  );

  const refreshLoop = useCallback(async () => {
    const [pending, report] = await Promise.all([
      authedFetch("/verdicts/pending"),
      authedFetch("/me/scout-report"),
    ]);
    if (pending?.pending) setPendingVerdicts(pending.pending);
    if (report) setScoutReport(report);
  }, [authedFetch]);

  // Load the loop once onboarding is done — this is what greets a returning
  // user who has no craving in mind yet.
  useEffect(() => {
    if (!user || needsOnboarding || !onboardingChecked) return undefined;
    let cancelled = false;
    refreshLoop().catch(() => {});
    refreshGame().catch(() => {});
    refreshDuels().catch(() => {});
    return () => {
      cancelled = true;
      void cancelled;
    };
  }, [user, needsOnboarding, onboardingChecked, refreshLoop, refreshGame, refreshDuels]);

  const answerVerdict = async (id, answer) => {
    if (verdictBusy) return;
    setVerdictBusy(true);

    // Optimistic: the prompt disappears the instant they tap. A spinner on a
    // one-tap answer would make the loop feel like work.
    setPendingVerdicts((prev) => prev.filter((v) => v.id !== id));

    try {
      await authedFetch("/verdicts/feedback", {
        method: "POST",
        body: JSON.stringify({ id, ...answer }),
      });
      const report = await authedFetch("/me/scout-report");
      if (report) setScoutReport(report);
    } finally {
      setVerdictBusy(false);
    }
  };

  const handleSearch = async () => {
    if (loading) return;
    if (!query.trim()) return;
    if (!user) return;

    if (!resolvedLocation) {
      setErrorMsg("Please set your location first.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const resolved = resolvedLocation;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setErrorMsg("Your session expired — please sign in again.");
        return;
      }

      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      const trimmed = query.trim();
      // The place name was confirmed before the search button was live, so
      // the server always receives a real, unambiguous scope.
      const locationHint = resolvedLocation.name;

      const response = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        // FIX: send what the user actually typed. The backend was reverse-
        // geocoding these coordinates back into a place name to hand Serper,
        // which was both slow and lossy — "11803" is already the answer.
        body: JSON.stringify({
          query: trimmed,
          lat: resolved.lat,
          lng: resolved.lng,
          locationHint,
          zip: resolved.zip || localStorage_getZip(),
          radiusMode,
        }),
        signal: controller.signal,
      });

      // FIX: the original assumed every response was JSON. A 502 from Render
      // (cold start, worker timeout) returns HTML and threw a parse error
      // that surfaced as "Couldn't reach the server."
      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 429) {
        setErrorMsg(data.error || "You've hit your search limit for today.");
        setSearchesRemaining(0);
        setResults([]);
      } else if (response.status === 401) {
        setErrorMsg(data.error || "Please sign in again.");
        setResults([]);
      } else if (!response.ok) {
        setErrorMsg(data.error || `Something went wrong (${response.status}).`);
        setResults([]);
      } else if (!data.restaurants || data.restaurants.length === 0) {
        // outOfRange means we found places but none were plausibly near the
        // location — a location problem, not a craving problem. Saying "try
        // a different craving" sent you chasing the wrong thing.
        const where = resolvedLocation.name;
        setErrorMsg(
          data.outOfRange
            ? `Nothing within ${data.maxRadiusMiles || 25} miles of ${where} — the closest was about ${data.nearestMiles} mi out. Try "Anywhere worth it" or a different ZIP.`
            : `No match found near ${where} — try a different craving.`
        );
        setResults([]);
        if (typeof data.searchesRemaining === "number") setSearchesRemaining(data.searchesRemaining);
      } else {
        setResults(data.restaurants.slice(0, 1));
        setSubmittedQuery(trimmed);
        setRadiusUsed(typeof data.radiusUsed === "number" ? data.radiusUsed : null);
        // The pool just gained this area's places, so duels may now be
        // buildable where they weren't a moment ago.
        refreshGame().catch(() => {});
        refreshDuels().catch(() => {});
        if (typeof data.searchesRemaining === "number") setSearchesRemaining(data.searchesRemaining);
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Search failed:", error);
      setErrorMsg("Couldn't reach the server. Is it running?");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const winner = results[0];
  const winnerChips = useMemo(() => (winner ? buildChips(winner) : []), [winner]);

  if (!authChecked) {
    return (
      <div className="app">
        <p style={{ textAlign: "center", padding: "3rem" }}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <header className="header">
          <div className="brand">
            <span className="brand-mark">SS</span>
            <span className="brand-name">SavorScout</span>
          </div>
        </header>

        <section className="hero">
          <p className="eyebrow">Sign in to find your one</p>
          <h1>
            <span className="hero-script">Skip The Scroll.</span>
            <br />
            <span className="hero-accent">Get The One.</span>
          </h1>

          <form onSubmit={handleAuthSubmit} className="search-box" style={{ flexDirection: "column", gap: "0.75rem" }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" disabled={authBusy}>
              {authBusy ? "Working…" : authMode === "signup" ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            style={{
              marginTop: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              width: "100%",
              boxSizing: "border-box",
              height: "56px",
              backgroundColor: "#1f1f1f",
              color: "#fff",
              border: "1px solid #1f1f1f",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#3c3c3c")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1f1f1f")}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
                c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
                c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
              />
              <path
                fill="#FF3D00"
                d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039
                l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
                c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
              />
              <path
                fill="#1976D2"
                d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
                c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24
                C44,22.659,43.862,21.35,43.611,20.083z"
              />
            </svg>
            Sign in with Google
          </button>

          {/* FIX: this was a bare `href="/"` with no opening <a — a JSX syntax
              error that stopped the whole app from compiling. Rebuilt as a
              button, since triggering a password reset is an action, not
              navigation to the homepage. */}
          {authMode === "signin" && (
            <p style={{ marginTop: "0.75rem" }}>
              <button type="button" className="link-btn" onClick={handleForgotPassword}>
                Forgot password?
              </button>
            </p>
          )}

          {resetSent && (
            <p className="notice-msg">If an account exists for that email, a reset link has been sent.</p>
          )}

          <p style={{ marginTop: "1rem" }}>
            {authMode === "signup" ? (
              <>
                Already have an account?{" "}
                <button type="button" className="link-btn" onClick={() => switchAuthMode("signin")}>
                  Sign in
                </button>
              </>
            ) : (
              <>
                Need an account?{" "}
                <button type="button" className="link-btn" onClick={() => switchAuthMode("signup")}>
                  Sign up
                </button>
              </>
            )}
          </p>

          {authNotice && <p className="notice-msg">{authNotice}</p>}
          {authError && <p className="error-msg">{authError}</p>}
        </section>

        <footer>© 2026 SavorScout</footer>
      </div>
    );
  }

  if (!onboardingChecked) {
    return (
      <div className="app">
        <p style={{ textAlign: "center", padding: "3rem" }}>Loading…</p>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="app">
        <header className="header">
          <div className="brand">
            <span className="brand-mark">SS</span>
            <span className="brand-name">SavorScout</span>
          </div>
        </header>

        <section className="onboarding-hero">
          <p className="eyebrow">One last thing</p>
          <h1 className="onboarding-heading">
            <span className="hero-script">Tell us what you need.</span>
          </h1>
          <p className="onboarding-sub">
            Any allergies or dietary preferences? We'll factor them into every match. Leave a box blank if it
            doesn't apply to you.
          </p>

          <div className="onboarding-card">
            <div className="onboarding-field">
              <label htmlFor="onboard-allergies">Allergies</label>
              <textarea
                id="onboard-allergies"
                placeholder="e.g. peanuts, shellfish, dairy…"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                rows={3}
              />
            </div>

            <div className="onboarding-field">
              <label htmlFor="onboard-diet">Dietary preferences</label>
              <textarea
                id="onboard-diet"
                placeholder="e.g. vegetarian, gluten-free, keto…"
                value={dietaryPreferences}
                onChange={(e) => setDietaryPreferences(e.target.value)}
                rows={3}
              />
            </div>

            <button className="onboarding-continue-btn" onClick={handleSaveOnboarding} disabled={onboardingSaving}>
              {onboardingSaving ? "Saving…" : "Continue"}
            </button>

            {onboardingError && <p className="error-msg">{onboardingError}</p>}
          </div>
        </section>

        <footer>© 2026 SavorScout</footer>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">SS</span>
          <span className="brand-name">SavorScout</span>
        </div>

        {/* Tabs unlock as they become real. A tab that opens onto an empty
            state teaches people the app is hollow, so Collection stays
            hidden until there's something in it. */}
        <nav className="tabs" role="tablist">
          {TABS.filter((t) => (game?.level?.level ?? 1) >= t.minLevel).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`tab${tab === t.id ? " tab--active" : ""}`}
              onClick={() => {
                setTab(t.id);
                track("tab_view", { tab: t.id });
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="header-right">
          <StreakBadge streak={game?.streak} />
          <LevelPill level={game?.level} />
          <button className="signout-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      {/* XP feedback: a single restrained line, not a confetti burst. The
          difference between "instrument" and "toy" is mostly this. */}
      {xpFlash && (
        <div className={`xp-flash${xpFlash.leveledUp ? " xp-flash--level" : ""}`} role="status">
          <span className="xp-flash-amount">+{xpFlash.amount} XP</span>
          {xpFlash.leveledUp && <span className="xp-flash-rank">{xpFlash.rank}</span>}
        </div>
      )}

      {tab === "today" && (
        <section className="page page--today">
          <div className="today-head">
            <h1 className="today-title">
              {game?.streak?.activeToday ? "You're set for today." : "Five taps. Then you're done."}
            </h1>
            <p className="today-sub">
              {game?.streak?.days > 0
                ? `${game.streak.days} day streak${game.streak.freezes > 0 ? ` · ${game.streak.freezes} freeze banked` : ""}`
                : "Your streak starts with your first duel."}
            </p>
          </div>

          <DuelPanel
            duels={duelState.duels}
            completed={duelState.completed}
            total={duelState.total}
            needsSeed={duelState.needsSeed}
            busy={duelBusy}
            onAnswer={answerDuel}
            onGoFind={() => setTab("find")}
          />

          <QuestCard quest={game?.quest} onGoFind={() => setTab("find")} />

          {pendingVerdicts.length > 0 && (
            <section className="panel">
              <div className="panel-head">
                <h2 className="panel-title">Open verdicts</h2>
                <span className="panel-sub"><span className="xp-tag">+100 XP</span></span>
              </div>
              <div className="verdict-prompts">
                {pendingVerdicts.map((v) => (
                  <PendingVerdict key={v.id} verdict={v} onAnswer={answerVerdict} busy={verdictBusy} />
                ))}
              </div>
            </section>
          )}

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Hungry now?</h2>
            </div>
            <button className="cta" onClick={() => setTab("find")}>Find my one →</button>
          </section>
        </section>
      )}

      {tab === "you" && (
        <section className="page page--you">
          <div className="today-head">
            <h1 className="today-title">Your taste profile</h1>
            <p className="today-sub">Built from what you picked, not what you told us.</p>
          </div>

          <ScoutReport report={scoutReport} />

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">How you choose</h2>
            </div>
            <TasteVector vector={taste?.vector} />
          </section>

          <StreakLadder
            milestones={game?.milestones}
            next={game?.nextMilestone}
            current={game?.streak?.days ?? 0}
          />

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Progress</h2>
              <span className="panel-sub">
                {game?.xp?.toLocaleString() ?? 0} XP
                {game?.level?.nextRank ? ` · ${game.level.xpToNext.toLocaleString()} to ${game.level.nextRank}` : ""}
              </span>
            </div>
            <UnlockLadder unlocks={game?.unlocks} level={game?.level?.level ?? 1} />
          </section>
        </section>
      )}

      {tab === "collection" && (
        <section className="page page--collection">
          <div className="today-head">
            <h1 className="today-title">Collection</h1>
            <p className="today-sub">
              {taste?.stamps?.length || 0} cuisine{(taste?.stamps?.length || 0) === 1 ? "" : "s"} stamped
            </p>
          </div>
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Cuisine passport</h2>
            </div>
            <Passport stamps={taste?.stamps} />
          </section>
        </section>
      )}

      {tab === "find" && (
        <>
      <section className="hero">
        <p className="eyebrow">Say what you're craving</p>
        <h1>
          <span className="hero-script">Skip The Scroll.</span>
          <br />
          <span className="hero-accent">Get The One.</span>
        </h1>

        <div className="search-box">
          <input
            type="text"
            placeholder="cheap sushi, spicy ramen, best wings nearby…"
            value={query}
            maxLength={300}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSearch} disabled={loading || !query.trim() || !resolvedLocation}>
            {loading ? "Searching…" : "Find my one"}
          </button>
        </div>

        {searchesRemaining !== null && (
          <p className="searches-left" style={{ opacity: 0.7, fontSize: "0.9rem" }}>
            {searchesRemaining} search{searchesRemaining === 1 ? "" : "es"} left today
          </p>
        )}

        <div className="location-panel">
          {resolvedLocation ? (
            <>
              <div className="location-set">
                <span className="location-label">Searching near</span>
                <span className="location-value">{resolvedLocation.name}</span>
                <button
                  type="button"
                  className="link-btn location-change"
                  onClick={() => {
                    setResolvedLocation(null);
                    setLocationError("");
                    setRadiusUsed(null);
                  }}
                >
                  Change
                </button>
              </div>

              <div className="radius-modes" role="group" aria-label="How far to search">
                {RADIUS_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={radiusMode === mode.id ? "radius-btn radius-btn--active" : "radius-btn"}
                    aria-pressed={radiusMode === mode.id}
                    onClick={() => setRadiusMode(mode.id)}
                  >
                    <span className="radius-btn-label">{mode.label}</span>
                    <span className="radius-btn-hint">{mode.hint}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <span className="location-prompt">Please enter your ZIP code to search</span>

              <div className="location-input-row">
                <input
                  id="loc-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={5}
                  placeholder="e.g. 11801"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyLocation();
                  }}
                />
                <button
                  type="button"
                  className="location-set-btn"
                  onClick={applyLocation}
                  disabled={resolvingLocation || locationInput.length !== 5}
                >
                  {resolvingLocation ? "Checking…" : "Set"}
                </button>
              </div>

              {locationError && <p className="error-msg location-err">{locationError}</p>}
            </>
          )}
        </div>

        {errorMsg && <p className="error-msg">{errorMsg}</p>}
      </section>

      <section className="results-section" id="result" aria-live="polite">
        {winner ? (
          <div className="verdict">
            <article className="result-card result-card--winner">
              <div className="match-banner">
                <span className="match-banner-tag">Your one</span>
                {submittedQuery && <span className="match-banner-query">"{submittedQuery}"</span>}
              </div>

              {/* Only shown when the search had to widen past the preset's
                  first tier — so a result further out than expected always
                  explains itself instead of just looking wrong. */}
              {typeof radiusUsed === "number" && radiusUsed > RADIUS_FIRST_TIER[radiusMode] && (
                <p className="radius-notice">
                  Nothing close enough at {RADIUS_FIRST_TIER[radiusMode]} mi — widened to {radiusUsed} mi to
                  find real options.
                </p>
              )}

              <div className="result-split">
                <div className="result-pane result-pane--visual">
                  <RestaurantImage
                    imageUrl={winner.imageUrl}
                    imageSourceUrl={winner.imageSourceUrl}
                    name={winner.name}
                    matchScore={winner.matchScore}
                  />

                  <div className="dominance-block">
                    <p className="verdict-line">{verdictLine(winner)}</p>
                  </div>

                  {/* Every click here is revealed intent, captured at zero
                      cost to the user. A Directions click is a better visit
                      signal than any survey answer we could ask for. */}
                  <div className="action-row">
                    <a
                      className="action-btn action-btn--primary"
                      href={mapsUrl(winner)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track("directions_click", { verdictId: winner.id, name: winner.name })}
                    >
                      Directions
                    </a>
                    {winner.website && (
                      <a
                        className="action-btn"
                        href={winner.website}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => track("site_click", { verdictId: winner.id, name: winner.name })}
                      >
                        Menu / Site
                      </a>
                    )}
                    {winner.phone && (
                      <a
                        className="action-btn"
                        href={`tel:${winner.phone.replace(/[^\d+]/g, "")}`}
                        onClick={() => track("call_click", { verdictId: winner.id })}
                      >
                        Call
                      </a>
                    )}
                  </div>

                  {typeof winner.lat === "number" && typeof winner.lng === "number" && (
                    <MapPeek lat={winner.lat} lng={winner.lng} name={winner.name} />
                  )}
                </div>

                <div className="result-pane result-pane--detail">
                  <h2>{winner.name}</h2>

                  <div className="meta-row">
                    {typeof winner.rating === "number" ? (
                      <span className="rating">
                        {winner.rating.toFixed(1)}★
                        {winner.reviewCount ? ` (${winner.reviewCount.toLocaleString()})` : ""}
                      </span>
                    ) : (
                      <span className="rating rating--new">Not yet widely rated</span>
                    )}
                    {winner.category && <span className="category">{winner.category}</span>}
                    {distanceLabel(winner) && <span className="distance">{distanceLabel(winner)}</span>}
                  </div>

                  {winner.address && <p className="address">{winner.address}</p>}

                  {winnerChips.length > 0 && (
                    <div className="why-section">
                      <span className="why-label">Why this won</span>
                      <div className="why-chips">
                        {winnerChips.map((chip, i) => (
                          <span className="chip" key={i}>
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <EvidenceSection
                    evidence={winner.evidence}
                    reception={winner.reception}
                    review={winner.review}
                    menuItems={winner.menuItems}
                    rating={winner.rating}
                    matchedDietaryTerms={winner.matchedDietaryTerms}
                    matchedAllergyTerms={winner.matchedAllergyTerms}
                  />

                  <div className="detail-row">
                    <ScoreDetail breakdown={winner.scoreBreakdown} />
                    <ComparisonTease runnerUps={winner.runnerUps} />
                  </div>
                </div>
              </div>
            </article>
          </div>
        ) : (
          !errorMsg && (
            <p className="empty-state">
              One craving in, one verdict out. Tell us what you're in the mood for and we'll do the comparing.
            </p>
          )
        )}
      </section>

      <section className="info" id="how">
        <h2>How it works</h2>
        <div className="steps">
          <div>
            <span className="step-label">Read the craving</span>
            <p>Say it in plain language. We pull out the dish, cuisine, budget, and area you actually meant.</p>
          </div>
          <div>
            <span className="step-label">Score the field</span>
            <p>
              A pool of nearby candidates gets ranked on quality, relevance, distance and price fit — then the top
              few get researched against their real menus.
            </p>
          </div>
          <div>
            <span className="step-label">Commit to one</span>
            <p>You get a single verdict with the evidence behind it, not twenty tabs to compare yourself.</p>
          </div>
        </div>
      </section>

      <section className="about" id="about">
        <h2>About</h2>
        <p>
          SavorScout is a decision engine, not a search engine. Every other app hands you a list and makes the
          choice your problem. This one picks, and shows its work so you can disagree with it.
        </p>
      </section>
        </>
      )}

      <footer>© 2026 SavorScout</footer>
    </div>
  );
}

export default App;