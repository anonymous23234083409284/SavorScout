import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://savorscout.onrender.com";

const GEO_OPTIONS = { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 };

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

  if (sb.proximity >= 65 && typeof restaurant.distanceMiles === "number") {
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
const METRIC_LABELS = {
  relevance: "Dish match",
  vibe: "Vibe match",
  quality: "Ratings",
  proximity: "Distance",
  evidence: "Evidence",
  budget: "Price fit",
  trust: "Listing quality",
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

// --- Geocoding cache -------------------------------------------------------
// Nominatim asks for <=1 req/sec and no heavy browser traffic. Memoizing
// repeats within a session keeps a user who searches "11801" five times from
// hitting them five times.
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

const geocodeCache = new Map();

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
  const [deviceCoords, setDeviceCoords] = useState(null);
  const [manualCoords, setManualCoords] = useState(null);
  const [locStatus, setLocStatus] = useState("requesting");
  const [manualLocation, setManualLocation] = useState("");
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const lastGeocodedTextRef = useRef("");

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

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [allergies, setAllergies] = useState("");
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");

  const searchAbortRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus("denied");
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setDeviceCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocStatus("granted");
      },
      () => {
        if (!cancelled) setLocStatus("denied");
      },
      GEO_OPTIONS // FIX: without a timeout this can hang indefinitely on some browsers
    );
    return () => {
      cancelled = true;
    };
  }, []);

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
    setManualLocation("");
    setManualCoords(null);
    lastGeocodedTextRef.current = "";
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

  const geocodeManualLocation = useCallback(async (text) => {
    const key = text.toLowerCase().trim();
    if (geocodeCache.has(key)) return geocodeCache.get(key);

    // FIX: the original set a "User-Agent" header here. That is a forbidden
    // header name — browsers strip it silently, so it never reached
    // Nominatim. Removed rather than left as dead code. Better still, proxy
    // this through your own backend (it already has geocodeLocationName)
    // so you can send a real UA and cache across users.
    // A bare 5-digit ZIP through the free-text `q` param is ambiguous —
    // Nominatim can read it as a house number and hand back an unrelated
    // address. The structured `postalcode` param resolves it properly.
    const zipOnly = /^\d{5}$/.test(key);

    const tryQuery = async (q) => {
      const url = zipOnly
        ? `https://nominatim.openstreetmap.org/search?format=json&limit=1&country=us&postalcode=${encodeURIComponent(key)}`
        : `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    };

    try {
      let found = await tryQuery(text);
      if (!found && !/usa|united states/i.test(text)) {
        found = await tryQuery(`${text}, USA`);
      }
      if (found) geocodeCache.set(key, found);
      return found;
    } catch (err) {
      console.error("Geocoding failed:", err);
      return null;
    }
  }, []);

  const getIpBasedLocation = useCallback(async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (!res.ok) return null;
      const data = await res.json();
      if (typeof data.latitude !== "number" || typeof data.longitude !== "number") return null;
      if (data.country_code && data.country_code !== "US") return null;
      return { lat: data.latitude, lng: data.longitude };
    } catch (err) {
      console.error("IP location lookup failed:", err);
      return null;
    }
  }, []);

  const resolveCoords = async () => {
    const typedLocation = manualLocation.trim();

    if (typedLocation) {
      if (typedLocation === lastGeocodedTextRef.current && manualCoords) return manualCoords;

      setResolvingLocation(true);
      try {
        const geocoded = await geocodeManualLocation(typedLocation);
        if (geocoded) {
          lastGeocodedTextRef.current = typedLocation;
          setManualCoords(geocoded);
          return geocoded;
        }
        return null;
      } finally {
        setResolvingLocation(false);
      }
    }

    // Manual box is empty — fall back to the device, then to IP.
    if (deviceCoords) return deviceCoords;

    setResolvingLocation(true);
    try {
      const ipCoords = await getIpBasedLocation();
      if (ipCoords) {
        setDeviceCoords(ipCoords);
        setLocStatus("granted");
        return ipCoords;
      }
      return null;
    } finally {
      setResolvingLocation(false);
    }
  };

  const handleSearch = async () => {
    if (loading) return;
    if (!query.trim()) return;
    if (!user) return;

    setErrorMsg("");
    setLoading(true);

    try {
      const resolved = await resolveCoords();

      if (!resolved) {
        setErrorMsg(
          manualLocation.trim()
            ? `Couldn't find "${manualLocation}" — try the format "City, State" or a 5-digit ZIP code.`
            : "We couldn't figure out your location — try entering a city or ZIP code above."
        );
        return;
      }

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
          locationHint: manualLocation.trim() || undefined,
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
        const where = manualLocation.trim() || data.locationName || "your area";
        setErrorMsg(
          data.outOfRange
            ? `Nothing within range of ${where} — the closest was about ${data.nearestMiles} mi out. Try a nearby town or a more specific location.`
            : `No match found near ${where} — try a different craving.`
        );
        setResults([]);
        if (typeof data.searchesRemaining === "number") setSearchesRemaining(data.searchesRemaining);
      } else {
        setResults(data.restaurants.slice(0, 1));
        setSubmittedQuery(trimmed);
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
        <nav>
          <a href="#how">How it works</a>
          <a href="#about">About</a>
          <div className="user-badge">
            <span className="user-email">{user.email}</span>
            <button className="signout-btn" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </nav>
      </header>

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
          <button onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? (resolvingLocation ? "Finding you…" : "Searching…") : "Find my one"}
          </button>
        </div>

        {searchesRemaining !== null && (
          <p className="searches-left" style={{ opacity: 0.7, fontSize: "0.9rem" }}>
            {searchesRemaining} search{searchesRemaining === 1 ? "" : "es"} left today
          </p>
        )}

        <div className="manual-location">
          <label htmlFor="manual-loc">
            {locStatus === "denied"
              ? "Location access is off — enter a city, ZIP, or neighborhood:"
              : "Not seeing your area? Enter a city, ZIP, or neighborhood to fix it:"}
          </label>
          <input
            id="manual-loc"
            type="text"
            placeholder="e.g. Hicksville, NY or 11801"
            value={manualLocation}
            onChange={(e) => setManualLocation(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {locStatus === "denied" && (
            <span className="loc-hint">Leave this blank and we'll estimate your location from your IP address.</span>
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

                  <div className="action-row">
                    <a className="action-btn action-btn--primary" href={mapsUrl(winner)} target="_blank" rel="noreferrer">
                      Directions
                    </a>
                    {winner.website && (
                      <a className="action-btn" href={winner.website} target="_blank" rel="noreferrer">
                        Menu / Site
                      </a>
                    )}
                    {winner.phone && (
                      <a className="action-btn" href={`tel:${winner.phone.replace(/[^\d+]/g, "")}`}>
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

      <footer>© 2026 SavorScout</footer>
    </div>
  );
}

export default App;