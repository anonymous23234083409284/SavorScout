import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [coords, setCoords] = useState(null);
  const [locStatus, setLocStatus] = useState("requesting"); // requesting | granted | denied
  const [manualLocation, setManualLocation] = useState("");
  const [resolvingLocation, setResolvingLocation] = useState(false);
  // Tracks whichever manualLocation string we last successfully geocoded, so
  // resolveCoords can tell "user typed a new/changed location" apart from
  // "same text as before, just reuse the coords we already have."
  const lastGeocodedTextRef = useRef("");

  // --- Auth state ---
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup"
  const [resetSent, setResetSent] = useState(false);

  // --- Search limit state (source of truth = backend response) ---
  const [searchesRemaining, setSearchesRemaining] = useState(null);

  // --- Onboarding (allergies / dietary preferences) ---
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [allergies, setAllergies] = useState("");
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");


  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocStatus("granted");
      },
      () => setLocStatus("denied")
    );
  }, []);

  // --- Auth session tracking ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // --- Check whether this user still needs the onboarding page ---
  // (no user_preferences row yet = brand new account, whether they signed
  // up with email/password or Google — either way they land here once.)
  useEffect(() => {
    if (!user) {
      setOnboardingChecked(false);
      return;
    }

    supabase
      .from("user_preferences")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to check preferences:", error);
        }
        setNeedsOnboarding(!data);
        setOnboardingChecked(true);
      });
  }, [user]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setResetSent(false);

    if (!email.trim() || !password.trim()) {
      setAuthError("Enter both email and password.");
      return;
    }

    if (authMode === "signup") {
      try {
        const checkResponse = await fetch("https://savorscout.onrender.com/auth/check-email", {
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

      setAuthError("Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Without this, Supabase falls back to the "Site URL" configured in
        // the dashboard, which errors out if that value is stale (e.g. still
        // set to localhost) or doesn't match wherever this app is actually
        // hosted. Sending the browser's own origin keeps it correct in every
        // environment (local dev, staging, production) automatically.
        redirectTo: window.location.origin,
      },
    });
    if (error) setAuthError(error.message);
  };

  const handleForgotPassword = async () => {
    setAuthError("");
    setResetSent(false);

    if (!email.trim()) {
      setAuthError("Enter your email above first, then click \"Forgot password?\"");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      setAuthError(error.message);
    } else {
      setResetSent(true);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setResults([]);
    setQuery("");
    setSearchesRemaining(null);
    setOnboardingChecked(false);
    setNeedsOnboarding(false);
    setAllergies("");
    setDietaryPreferences("");
    setOnboardingError("");
  };

  const handleSaveOnboarding = async () => {
    if (!user) return;
    setOnboardingSaving(true);
    setOnboardingError("");

    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          allergies: allergies.trim(),
          dietary_preferences: dietaryPreferences.trim(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Failed to save preferences:", error);
      setOnboardingError("Couldn't save — please try again.");
    } else {
      setNeedsOnboarding(false);
    }

    setOnboardingSaving(false);
  };

  // --- Location fallback chain: GPS -> typed location -> IP address ---

  // Turns free-text like "Hicksville, NY" or "11801" into coordinates.
  // Uses OpenStreetMap's free Nominatim geocoder (no API key required).
  const geocodeManualLocation = async (text) => {
    // Nominatim is flaky with bare ZIP codes on their own — a query of just
    // "11803" can come back with zero matches even though it's a perfectly
    // real ZIP, because its parser has nothing telling it what country to
    // interpret a bare number in. `countrycodes=us` narrows the search to
    // the US; appending ", USA" as a retry gives its free-text parser the
    // extra context it needs to actually match a lone ZIP/city name.
    const tryQuery = async (q) => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`,
        {
          headers: {
            "User-Agent": "SavorScout/1.0 (your-email@example.com)",
          },
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
      return { lat, lng };
    };

    try {
      const direct = await tryQuery(text);
      if (direct) return direct;

      if (!/usa|united states/i.test(text)) {
        const withCountry = await tryQuery(`${text}, USA`);
        if (withCountry) return withCountry;
      }

      return null;
    } catch (err) {
      console.error("Geocoding failed:", err);
      return null;
    }
  };

  // Last-resort estimate from the visitor's IP address (city-level accuracy).
  // Uses ipapi.co's free tier (no API key required).
  const getIpBasedLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (!res.ok) return null;
      const data = await res.json();
      if (typeof data.latitude !== "number" || typeof data.longitude !== "number") return null;
      // IP-based geolocation is only ever an estimate, and it can be wrong by
      // an entire country — mobile carriers, VPNs, and some ISPs use IP
      // blocks that are registered somewhere far from where the request
      // actually originates. That's almost certainly how a Hicksville/11803
      // search ended up in the Dominican Republic. SavorScout only searches
      // the US (see countrycodes=us below), so treat anything ipapi.co
      // reports outside the US as a failed lookup rather than silently
      // searching the wrong country — resolveCoords will fall through to
      // asking the person to type their city or ZIP instead.
      if (data.country_code && data.country_code !== "US") return null;
      return { lat: data.latitude, lng: data.longitude };
    } catch (err) {
      console.error("IP location lookup failed:", err);
      return null;
    }
  };

  // Resolves coordinates in priority order: freshly-typed location -> cached
  // coords (GPS/IP/earlier manual entry) -> IP address.
  //
  // Previously this started with `if (coords) return coords;`, which meant
  // that once ANY coords were cached — including a wrong IP-based guess —
  // every later search just reused them forever. Typing a corrected ZIP
  // into the manual box did nothing, because this function never looked at
  // manualLocation again once coords existed. Now a manual location that's
  // new or has changed is always re-geocoded first, so the person always has
  // a working way to override a bad auto-detected location.
  const resolveCoords = async () => {
    const typedLocation = manualLocation.trim();

    if (typedLocation && typedLocation !== lastGeocodedTextRef.current) {
      setResolvingLocation(true);
      try {
        const geocoded = await geocodeManualLocation(typedLocation);
        if (geocoded) {
          lastGeocodedTextRef.current = typedLocation;
          setCoords(geocoded);
          setLocStatus("granted");
          return geocoded;
        }
        // Typed something, but it didn't resolve — do NOT fall back to IP;
        // that would silently override what the user explicitly told us.
        return null;
      } finally {
        setResolvingLocation(false);
      }
    }

    // No new manual location to resolve — reuse cached coords if we have them.
    if (coords) return coords;

    setResolvingLocation(true);
    try {
      // Reached only when there's nothing typed and no cached coords yet
      // (i.e. GPS wasn't granted) — fall back to IP-based estimation.
      const ipCoords = await getIpBasedLocation();
      if (ipCoords) {
        setCoords(ipCoords);
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

    const resolved = await resolveCoords();

    if (!resolved) {
      if (manualLocation.trim()) {
        setErrorMsg(`Couldn't find "${manualLocation}" — try the format "City, State" or a 5-digit ZIP code.`);
      } else {
        setErrorMsg("We couldn't figure out your location — try entering a city or ZIP code above.");
      }
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setErrorMsg("Your session expired — please sign in again.");
        setLoading(false);
        return;
      }

      const response = await fetch("https://savorscout.onrender.com/search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({ query, lat: resolved.lat, lng: resolved.lng }),
});
      const data = await response.json();

      if (response.status === 429) {
        setErrorMsg(data.error);
        setSearchesRemaining(0);
        setResults([]);
      } else if (response.status === 401) {
        setErrorMsg(data.error || "Please sign in again.");
        setResults([]);
      } else if (!response.ok) {
        setErrorMsg(data.error || "Something went wrong.");
        setResults([]);
      } else if (!data.restaurants || data.restaurants.length === 0) {
        setErrorMsg("No matches found nearby — try a different craving.");
        setResults([]);
        if (typeof data.searchesRemaining === "number") setSearchesRemaining(data.searchesRemaining);
      } else {
        setResults(data.restaurants.slice(0, 2));
        if (typeof data.searchesRemaining === "number") setSearchesRemaining(data.searchesRemaining);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setErrorMsg("Couldn't reach the server. Is it running?");
      setResults([]);
    }

    setLoading(false);
  };


  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };


  const priceLabel = (level) => {
    const map = {
      PRICE_LEVEL_FREE: "Free",
      PRICE_LEVEL_INEXPENSIVE: "$",
      PRICE_LEVEL_MODERATE: "$$",
      PRICE_LEVEL_EXPENSIVE: "$$$",
      PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
    };
    return map[level] || null;
  };


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
          <p className="eyebrow">Sign in to find your two</p>
          <h1>
            <span className="hero-script">Skip The Scroll.</span>
            <br />
            <span className="hero-accent">Get The Two.</span>
          </h1>

          <form onSubmit={handleAuthSubmit} className="search-box" style={{ flexDirection: "column", gap: "0.75rem" }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">
              {authMode === "signup" ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <button
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
            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
                c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
                c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039
                l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
                c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
                c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24
                C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            Sign in with Google
          </button>

          {authMode === "signin" && (
            <p style={{ marginTop: "0.75rem" }}>
              <a href="/" onClick={(e) => { e.preventDefault(); handleForgotPassword(); }} style={{ fontFamily: "'Pacifico', cursive", fontSize: "20px", color: "#e0a3ff", textDecoration: "none" }}>
                Forgot password?
              </a>
            </p>
          )}

          {resetSent && (
            <p style={{ marginTop: "0.5rem", opacity: 0.85 }}>
              If an account exists for that email, a reset link has been sent.
            </p>
          )}

          <p style={{ marginTop: "1rem" }}>
            {authMode === "signup" ? (
              <>
                Already have an account?{" "}
                <a href="/" onClick={(e) => { e.preventDefault(); setAuthMode("signin"); setAuthError(""); setResetSent(false); }}>
                  Sign in
                </a>
              </>
            ) : (
              <>
                Need an account?{" "}
                <a href="/" onClick={(e) => { e.preventDefault(); setAuthMode("signup"); setAuthError(""); setResetSent(false); }}>
                  Sign up
                </a>
              </>
            )}
          </p>

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
            Any allergies or dietary preferences? We'll make sure every match respects them.
            Leave a box blank if it doesn't apply to you.
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

            <button
              className="onboarding-continue-btn"
              onClick={handleSaveOnboarding}
              disabled={onboardingSaving}
            >
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
          <span className="hero-accent">Get The Two.</span>
        </h1>


        <div className="search-box">
          <input
            type="text"
            placeholder="cheap sushi, spicy ramen, best wings nearby…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSearch} disabled={loading}>
            {loading ? (resolvingLocation ? "Finding you…" : "Searching…") : "Find my two"}
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
              ? "📍 Location access is off — enter a city, ZIP, or neighborhood:"
              : "📍 Not seeing your area? Enter a city, ZIP, or neighborhood to fix it:"}
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
            <span className="loc-hint">Leave this blank and we'll estimate your location from your connection instead.</span>
          )}
        </div>
        {errorMsg && <p className="error-msg">{errorMsg}</p>}
      </section>


      <section className="results-section">
        {results.length > 0 ? (
          <div className="verdict">
            {results.slice(0, 2).map((restaurant, index) => (
              <article
                className={index === 0 ? "result-card result-card--winner" : "result-card"}
                key={restaurant.id || index}
              >
                <div className="result-photo">
                  {restaurant.photoUrl ? (
                    <img src={restaurant.photoUrl} alt={restaurant.name} />
                  ) : (
                    <div className="photo-fallback">🍽️</div>
                  )}
                  <span className="rank-tag">{index === 0 ? "Top pick" : "Runner-up"}</span>
                </div>


                <div className="result-body">
                  <h2>{restaurant.name}</h2>


                  <div className="meta-row">
                    <span className="rating">
                      ★ {typeof restaurant.rating === "number" ? restaurant.rating.toFixed(1) : restaurant.rating}
                    </span>
                    {restaurant.reviewCount > 0 && (
                      <span className="review-count">({restaurant.reviewCount.toLocaleString()} reviews)</span>
                    )}
                    {priceLabel(restaurant.priceLevel) && (
                      <span className="price">{priceLabel(restaurant.priceLevel)}</span>
                    )}
                  </div>


                  <p className="address">{restaurant.address}</p>


                  {restaurant.review && (
                    <blockquote className="review">
                      <p>"{restaurant.review.text}"</p>
                      <footer>
                        — {restaurant.review.authorName}, {restaurant.review.rating}★
                      </footer>
                    </blockquote>
                  )}


                  {restaurant.lat && restaurant.lng && (
                    <div className="map-embed">
                      <iframe
                        title={`Map showing ${restaurant.name}`}
                        width="100%"
                        height="180"
                        style={{ border: 0, borderRadius: "12px" }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps?q=${restaurant.lat},${restaurant.lng}&z=15&output=embed`}
                      />
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">Tell us what you're craving above, and we'll find the best two spots nearby.</p>
        )}
      </section>


      <section id="how" className="info">
        <h2>How it works</h2>
        <div className="steps">
          <div>
            <span className="step-label">Describe</span>
            <p>Tell us exactly what you're craving.</p>
          </div>
          <div>
            <span className="step-label">Rank</span>
            <p>We weigh rating against review volume across everything nearby.</p>
          </div>
          <div>
            <span className="step-label">Decide</span>
            <p>You get the top two — not a list to scroll through.</p>
          </div>
        </div>
      </section>


      <section id="about" className="about">
        <h2>Why just two?</h2>
        <p>Choosing where to eat shouldn't require endless scrolling. We do the comparing so you don't have to.</p>
      </section>


      <footer>© 2026 SavorScout</footer>
    </div>
  );
}


export default App;