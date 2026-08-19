import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QUESTIONS, DAY_ORDER, DIMENSIONS, TOTAL_DAYS, scoreAll, answeredCount } from "./questions";
import { PERSONALITIES, personalityFor, PersonalityCharacter } from "./personalities";
import "./quiz.css";

/* ===========================================================================
   THE 7-DAY TASTE QUIZ

   Five questions a day for six days, then a reveal. The drip is the point:
   the return visit is what the whole thing is for, so the gate has to feel
   like an appointment rather than a lockout.

   Two decisions shape everything here.

   Progress is stored under a single key and read once. A quiz that loses a
   week of answers because someone opened it on their phone is worse than no
   quiz — so every write is whole-object, and a partially written day can
   never leave the state unreadable.

   The day gate keys off a stored date string, not a countdown. If it used a
   timer, closing the tab would pause the week. Comparing calendar days means
   tomorrow arrives whether or not the app was open, which is what "come back
   tomorrow" actually promises.
   =========================================================================== */

const KEY = "ss_quiz_v1";
const todayStr = () => new Date().toISOString().slice(0, 10);

function daysBetween(a, b) {
  const ms = new Date(b + "T00:00:00") - new Date(a + "T00:00:00");
  return Math.round(ms / 86400000);
}

export function loadQuiz() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { answers: {}, lastDay: 0, lastDate: null, done: false };
    const p = JSON.parse(raw);
    return {
      answers: p.answers && typeof p.answers === "object" ? p.answers : {},
      lastDay: Number(p.lastDay) || 0,
      lastDate: typeof p.lastDate === "string" ? p.lastDate : null,
      done: !!p.done,
    };
  } catch {
    return { answers: {}, lastDay: 0, lastDate: null, done: false };
  }
}

function saveQuiz(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
}

/* Which day is available right now, and why. The "why" matters — the UI has
   to say something different for "you've finished today" than for "you have
   not started", and a single boolean cannot carry that. */
export function quizStatus(state = loadQuiz()) {
  const today = todayStr();
  if (state.done) return { phase: "done", day: TOTAL_DAYS };
  if (!state.lastDate) return { phase: "ready", day: 1 };
  const gap = daysBetween(state.lastDate, today);
  if (gap <= 0) {
    return state.lastDay >= DAY_ORDER.length
      ? { phase: "reveal-ready", day: TOTAL_DAYS }
      : { phase: "waiting", day: state.lastDay, next: state.lastDay + 1 };
  }
  return state.lastDay >= DAY_ORDER.length
    ? { phase: "reveal-ready", day: TOTAL_DAYS }
    : { phase: "ready", day: state.lastDay + 1 };
}

/* --------------------------------------------------------------------------- */

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
};

function ProgressDots({ day }) {
  return (
    <div className="qz-dots" aria-hidden="true">
      {Array.from({ length: TOTAL_DAYS }).map((_, i) => (
        <span key={i} className={`qz-dot${i < day ? " qz-dot--on" : ""}${i === day - 1 ? " qz-dot--now" : ""}`} />
      ))}
    </div>
  );
}

function Question({ q, dim, index, total, day, onAnswer }) {
  const [picked, setPicked] = useState(null);
  /* Sides are swapped on a stable hash of the question id, not at random — so
     the high answer isn't always first (people learn that by day two) but the
     layout also doesn't jump if the component re-renders mid-thought. */
  const flipped = useMemo(
    () => q.id.split("").reduce((h, c) => h + c.charCodeAt(0), 0) % 2 === 1,
    [q.id]
  );
  const opts = flipped ? [["b", q.b], ["a", q.a]] : [["a", q.a], ["b", q.b]];

  const choose = (side) => {
    if (picked) return;
    setPicked(side);
    setTimeout(() => onAnswer(q.id, side), 260);
  };

  return (
    <div className="qz-q">
      <div className="qz-qhead">
        <span className="qz-count">{index + 1} / {total}</span>
        <span className="qz-daytag">{DIMENSIONS[dim].emoji} Day {day}</span>
      </div>
      <div className="qz-bar"><div className="qz-bar-fill" style={{ width: `${(index / total) * 100}%` }} /></div>

      <p className="qz-scene">{q.scene}</p>
      <h2 className="qz-text">{q.q}</h2>

      <div className="qz-opts">
        {opts.map(([side, o]) => (
          <button
            key={side}
            className={`qz-opt${picked === side ? " qz-opt--picked" : ""}${picked && picked !== side ? " qz-opt--dim" : ""}`}
            onClick={() => choose(side)}
            disabled={!!picked}
          >
            <span className="qz-opt-emoji">{o.emoji}</span>
            <span className="qz-opt-text">{o.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DayResult({ dim, score, day, onClose }) {
  const d = DIMENSIONS[dim];
  const strength = Math.abs(score - 50);
  /* A dead-centre score is its own result. Reading ">= 50 means high" put
     "Heat seeker" above a note saying "genuinely balanced" — the headline and
     the explanation contradicting each other in the same breath. */
  const leaning = strength < 12 ? "Right down the middle" : score > 50 ? d.high : d.low;
  return (
    <div className="qz-result">
      <div className="qz-result-emoji">{d.emoji}</div>
      <p className="qz-result-kicker">Day {day} · {d.label}</p>
      <h2 className="qz-result-name">{leaning}</h2>
      <div className="qz-scale">
        <span className="qz-scale-end">{d.low}</span>
        <div className="qz-scale-track">
          <motion.div className="qz-scale-pin" initial={{ left: "50%" }} animate={{ left: `${score}%` }}
                      transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.15 }} />
        </div>
        <span className="qz-scale-end">{d.high}</span>
      </div>
      <p className="qz-result-note">
        {strength >= 30
          ? "That's a strong signal — it'll show up in what we pick for you."
          : strength >= 12
            ? "A clear lean. We'll weight your picks that way."
            : "Genuinely balanced. That's useful too — it means we won't over-correct."}
      </p>
      {day < DAY_ORDER.length ? (
        <>
          <p className="qz-next">Next set unlocks tomorrow.</p>
          <button className="btn btn--hot btn--block" onClick={onClose}>Got it</button>
        </>
      ) : (
        <>
          <p className="qz-next">That's all six. Your result is ready.</p>
          <button className="btn btn--hot btn--block" onClick={onClose}>See it</button>
        </>
      )}
    </div>
  );
}

function Reveal({ scores, answers, onClose, onShare }) {
  const depth = useMemo(() => {
    const o = {};
    DAY_ORDER.forEach((k) => { o[k] = answeredCount(answers, k); });
    return o;
  }, [answers]);
  const p = personalityFor(scores, depth);

  return (
    <div className="qz-reveal">
      <div className="qz-confetti" aria-hidden="true">
        {Array.from({ length: 26 }).map((_, i) => (
          <span key={i} className="qz-confetti-bit"
                style={{
                  left: `${(i * 3.9) % 100}%`,
                  animationDelay: `${(i % 7) * 0.18}s`,
                  background: i % 3 === 0 ? "#FFC857" : i % 3 === 1 ? "#FF5F1F" : p.color,
                }} />
        ))}
      </div>

      <motion.div className="qz-char" style={{ background: p.glow }}
                  initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 170, damping: 18 }}>
        <PersonalityCharacter personality={p} size={170} />
      </motion.div>

      <p className="qz-reveal-kicker">Your food personality</p>
      <h1 className="qz-reveal-name" style={{ color: p.color }}>{p.name}</h1>
      <p className="qz-reveal-tag">{p.tagline}</p>
      <p className="qz-reveal-blurb">{p.blurb}</p>

      <div className="qz-scores">
        {DAY_ORDER.filter((k) => typeof scores[k] === "number").map((k, i) => (
          <div className="qz-score" key={k}>
            <span className="qz-score-label">{DIMENSIONS[k].emoji} {DIMENSIONS[k].label}</span>
            <div className="qz-score-track">
              <motion.div className="qz-score-fill"
                          initial={{ width: 0 }} animate={{ width: `${scores[k]}%` }}
                          transition={{ delay: 0.25 + i * 0.07, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                          style={{ background: `linear-gradient(90deg, ${p.color}55, ${p.color})` }} />
            </div>
            <span className="qz-score-num">{scores[k]}</span>
          </div>
        ))}
      </div>

      <p className="qz-applied">✓ Saved. Your searches are now weighted to this.</p>
      <div className="qz-reveal-acts">
        <button className="btn btn--hot btn--block" onClick={onClose}>Find somewhere to eat</button>
        <button className="btn btn--ghost btn--block" onClick={() => onShare(p)}>Share my type</button>
      </div>
    </div>
  );
}

function Locked({ status, onClose }) {
  const nextDim = DAY_ORDER[status.next - 1];
  return (
    <div className="qz-locked">
      <div className="qz-locked-emoji">{nextDim ? DIMENSIONS[nextDim].emoji : "🎉"}</div>
      <h2 className="qz-locked-title">Come back tomorrow</h2>
      <p className="qz-locked-note">
        Day {status.next} is {nextDim ? DIMENSIONS[nextDim].label.toLowerCase() : "your reveal"}.
        Five questions, about a minute.
      </p>
      <ProgressDots day={status.day} />
      <p className="qz-locked-sub">{status.day} of {DAY_ORDER.length} days done</p>
      <button className="btn btn--ghost btn--block" onClick={onClose}>Close</button>
    </div>
  );
}

/* --------------------------------------------------------------------------- */

export default function Quiz({ open, onClose, onComplete, onShare }) {
  const [state, setState] = useState(loadQuiz);
  const [status, setStatus] = useState(() => quizStatus());
  const [qIndex, setQIndex] = useState(0);
  const [dayAnswers, setDayAnswers] = useState({});
  const [screen, setScreen] = useState("intro");

  useEffect(() => {
    if (!open) return;
    const s = loadQuiz();
    const st = quizStatus(s);
    setState(s); setStatus(st); setQIndex(0); setDayAnswers({});
    setScreen(st.phase === "done" ? "reveal"
      : st.phase === "reveal-ready" ? "reveal"
      : st.phase === "waiting" ? "locked"
      : s.lastDay > 0 ? "questions" : "intro");
  }, [open]);

  // Escape closes, and the page behind must not scroll under the modal.
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const dim = DAY_ORDER[Math.max(0, status.day - 1)];
  const dayQs = QUESTIONS[dim] || [];

  const answer = useCallback((qid, side) => {
    const nextDayAnswers = { ...dayAnswers, [qid]: side };
    setDayAnswers(nextDayAnswers);

    if (qIndex + 1 < dayQs.length) { setQIndex(qIndex + 1); return; }

    // Day finished — write the whole object at once so a half-saved day can
    // never leave the stored state unreadable.
    const merged = { ...state.answers, ...nextDayAnswers };
    const finishedAll = status.day >= DAY_ORDER.length;
    const next = {
      answers: merged,
      lastDay: status.day,
      lastDate: todayStr(),
      done: finishedAll ? state.done : false,
    };
    saveQuiz(next);
    setState(next);
    onComplete?.(scoreAll(merged), merged);
    setScreen("dayresult");
  }, [dayAnswers, qIndex, dayQs.length, state, status.day, onComplete]);

  const closeDayResult = () => {
    if (status.day >= DAY_ORDER.length) { setScreen("reveal"); return; }
    onClose();
  };

  const finishReveal = () => {
    const next = { ...state, done: true };
    saveQuiz(next); setState(next);
    onClose();
  };

  const startToday = () => { setQIndex(0); setDayAnswers({}); setScreen("questions"); };

  if (!open) return null;
  const scores = scoreAll(state.answers);

  return (
    <AnimatePresence>
      <motion.div className="qz-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }} onClick={onClose}>
        <motion.div className="qz-modal" onClick={(e) => e.stopPropagation()}
                    initial={{ scale: 0.94, opacity: 0, y: 18 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: 18 }}
                    transition={{ type: "spring", stiffness: 280, damping: 28 }}
                    role="dialog" aria-modal="true" aria-label="Taste quiz">
          <button className="qz-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="qz-body">
            {/* ONE child, one key.

                AnimatePresence with mode="wait" expects a single child. Given
                several sibling `screen === "x" && <…/>` expressions it began
                the intro's exit animation and then never mounted the next
                screen — the modal froze on an invisible intro. Selecting the
                element first and giving the wrapper a single key on `screen`
                is what makes the crossfade actually resolve. */}
            {/* Keyed remount, no AnimatePresence.

                mode="wait" holds the outgoing child until its exit animation
                finishes before mounting the next one — and here it never
                finished, so the modal sat on an intro that had already been
                replaced in state. Verified with a data-attribute: `screen` read
                "questions" while the DOM still showed the intro.

                Changing the key unmounts and remounts, and framer runs the
                enter animation on the new node. We lose the cross-fade out and
                gain a screen that actually advances. */}
            <motion.div
              /* Keyed per QUESTION, not just per screen. Keying on `screen`
                 alone kept one Question instance alive across all five, so its
                 internal `picked` state survived into the next question and
                 every click after the first was ignored as a double-tap. */
              key={screen === "questions" ? `q${qIndex}` : screen}
              variants={fade}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
                {screen === "intro" && (
                  <div className="qz-intro">
                    <div className="qz-intro-art">🍽️</div>
                    <p className="qz-reveal-kicker">7 days · 5 questions a day</p>
                    <h1 className="qz-intro-title">What kind of eater are you?</h1>
                    <p className="qz-intro-sub">
                      A minute a day for six days. Each one reads a different part of your
                      taste — heat, sweet, value, adventure, late nights, discovery — and on
                      day seven you get your type.
                    </p>
                    <p className="qz-intro-note">
                      Every answer sharpens what we recommend, starting from day one. You
                      don't have to finish to feel it.
                    </p>
                    <ProgressDots day={0} />
                    <button className="btn btn--hot btn--block" onClick={startToday}>Start day 1</button>
                  </div>
                )}

                {screen === "questions" && dayQs[qIndex] && (
                  <Question q={dayQs[qIndex]} dim={dim} index={qIndex}
                            total={dayQs.length} day={status.day} onAnswer={answer} />
                )}

                {screen === "dayresult" && (
                  <DayResult dim={dim} day={status.day}
                             score={scores[dim] ?? 50} onClose={closeDayResult} />
                )}

                {screen === "locked" && <Locked status={status} onClose={onClose} />}

                {screen === "reveal" && (
                  <Reveal scores={scores} answers={state.answers}
                          onClose={finishReveal} onShare={onShare} />
                )}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export { PERSONALITIES };
