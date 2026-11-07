/* Opening hours: is this place open when the person is searching?

   The old search never asked, so it could hand someone a place that closed an
   hour ago, the most visible mistake a "where should I eat now" app can make.

   Google lists hours as text per day: "11 AM–10 PM", "11:30 AM–2:30 PM, 5–9 PM",
   "Open 24 hours", "Closed", "5 PM–2 AM" (past midnight). Times arrive with
   narrow no-break spaces and en dashes. The local time comes from the person's
   own device, so no timezone database is needed here.

   Anything unparseable is "unknown": an unknown never excludes a place. */

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function dayIndex(key) {
  const k = String(key).toLowerCase().trim().slice(0, 3);
  const i = DAYS.findIndex((d) => d.startsWith(k));
  return i;
}

/* {day: text} from whatever shape the listing used. */
function byDay(hours) {
  const out = {};
  if (!hours) return out;
  if (Array.isArray(hours)) {
    for (const line of hours) {
      if (typeof line === "string") {
        const m = line.match(/^\s*([A-Za-z]+)\s*[:\-]\s*(.+)$/);
        if (m && dayIndex(m[1]) >= 0) out[dayIndex(m[1])] = m[2];
      } else if (line && typeof line === "object") {
        const d = dayIndex(line.day || line.name || "");
        const t = line.hours || line.time || line.value;
        if (d >= 0 && t) out[d] = Array.isArray(t) ? t.join(", ") : String(t);
      }
    }
    return out;
  }
  if (typeof hours === "object") {
    for (const [k, v] of Object.entries(hours)) {
      const d = dayIndex(k);
      if (d >= 0 && v != null) out[d] = Array.isArray(v) ? v.join(", ") : String(v);
    }
  }
  return out;
}

/* "11:30 AM" -> 690, with an optional meridiem to inherit. */
function toMinutes(h, m, mer) {
  let hour = parseInt(h, 10) % 12;
  if (mer === "pm") hour += 12;
  return hour * 60 + (m ? parseInt(m, 10) : 0);
}

/* One day's text -> [[start, end], ...] in minutes since that day's midnight.
   An end past midnight is stored past 1440, so "5 PM–2 AM" is [1020, 1560]. */
function parseDay(text) {
  if (text == null) return null;
  const s = String(text)
    .replace(/[   ]/g, " ")
    .replace(/\s*(?:–|—|−|to)\s*/gi, "-")
    .toLowerCase()
    .trim();
  if (!s) return null;
  if (/closed/.test(s) && !/\d/.test(s)) return [];
  if (/24\s*hours|open 24/.test(s)) return [[0, 1440]];
  if (/midnight/.test(s) || /noon/.test(s)) {
    return parseDay(s.replace(/midnight/g, "12 am").replace(/noon/g, "12 pm"));
  }
  const ranges = [];
  const re = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const endMer = m[6] ? m[6].replace(/\./g, "") : null;
    let startMer = m[3] ? m[3].replace(/\./g, "") : endMer;
    if (!endMer && !startMer) continue; // a bare "11-9" is too ambiguous to trust
    let start = toMinutes(m[1], m[2], startMer);
    let end = toMinutes(m[4], m[5], endMer || startMer);
    // "11-2 PM" means 11 AM to 2 PM: inheriting PM would put the start after the end.
    if (!m[3] && startMer === "pm" && start > end) start = toMinutes(m[1], m[2], "am");
    if (end <= start) end += 1440; // runs past midnight (or "12 AM" close)
    ranges.push([start, end]);
  }
  return ranges.length ? ranges : null;
}

const fmt = (min) => {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
};

/* Open status at the person's local time. `now` is {day: 0-6, minutes: 0-1439}.
   Returns {known:false} whenever the hours or the time are missing. */
function openStatus(hours, now) {
  if (!now || !Number.isInteger(now.day) || !Number.isFinite(now.minutes)) return { known: false };
  const days = byDay(hours);
  if (!Object.keys(days).length) return { known: false };

  const today = parseDay(days[now.day]);
  const prevDay = (now.day + 6) % 7;
  const yesterday = parseDay(days[prevDay]);
  if (today == null && yesterday == null) return { known: false };

  const t = now.minutes;
  // Still open from last night's late shift?
  for (const [s, e] of yesterday || []) {
    if (e > 1440 && t < e - 1440) {
      return { known: true, open: true, closesInMin: e - 1440 - t, closesAt: fmt(e) };
    }
  }
  for (const [s, e] of today || []) {
    if (t >= s && t < e) return { known: true, open: true, closesInMin: e - t, closesAt: fmt(e) };
  }
  if (today == null) return { known: false };
  const later = (today || []).filter(([s]) => s > t).sort((a, b) => a[0] - b[0]);
  if (later.length) return { known: true, open: false, opensInMin: later[0][0] - t, opensAt: fmt(later[0][0]) };
  return { known: true, open: false, opensInMin: null, opensAt: null };
}

/* 0-1 for ranking, or null when unknown. Closing very soon is nearly as bad as
   closed for someone about to head out. */
function openScore(status) {
  if (!status || !status.known) return null;
  if (status.open) {
    if (status.closesInMin <= 30) return 0.25;
    if (status.closesInMin <= 60) return 0.65;
    return 1;
  }
  if (status.opensInMin != null && status.opensInMin <= 45) return 0.45;
  return 0;
}

module.exports = { parseDay, byDay, openStatus, openScore, fmt };
