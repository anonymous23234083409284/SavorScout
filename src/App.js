import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import { renderShareCard, canvasToBlob, buildCaption } from "./shareCard";

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
  { id: "you", label: "You", minLevel: 1 },
];

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
    setLocationInput(""); setResolvedLocation(null); setLocationError(""); setRadiusUsed(null);
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
  // The only outstanding thing left is an ungraded pick.
  const openWork = pendingVerdicts.length;

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

        {/* ================= TODAY ================= */}
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
        {tab === "you" && (
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

        <footer className="foot">© 2026 SavorScout</footer>
      </div>
    </div>
  );
}

export default App;