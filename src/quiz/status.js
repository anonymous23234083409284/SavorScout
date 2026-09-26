/* Quiz progress, split out of Quiz.jsx so the app shell can show the quiz
   badge without importing the modal itself. Quiz.jsx pulls in framer-motion
   and every question; this file is the few lines of it that run on page load. */
import { DAY_ORDER, TOTAL_DAYS } from "./questions";

const KEY = "ss_quiz_v1";
export const todayStr = () => new Date().toISOString().slice(0, 10);

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

export function saveQuiz(state) {
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
