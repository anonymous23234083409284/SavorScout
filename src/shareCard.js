/* ===========================================================================
   THE SHARE CARD

   Turns a verdict into a 1080x1350 PNG for Instagram, X or Threads.

   Two problems drive every decision in here.

   1. THE PHOTO IS UNRELIABLE.
      imageUrl is null more often than not, and when it exists it comes from
      an arbitrary site. Drawing a cross-origin image taints the canvas, and a
      tainted canvas throws SecurityError on toBlob — so a card that depends on
      a photo doesn't degrade, it fails completely. Photos are therefore routed
      through our own /share/photo proxy, and the NO-PHOTO layout is treated as
      the primary design rather than a fallback: it sets the craving itself in
      large type and looks deliberate, because most cards will use it.

   2. THE DATA IS PATCHY AND SOMETIMES UNFLATTERING.
      rating, review, category and dominancePercent are all frequently absent,
      and a 3.1-star average is not something anyone wants to post. So every
      field passes a gate before it is drawn, and anything that fails is simply
      absent — never a placeholder, never an empty row, never a zero. The card
      composes itself from whatever cleared the bar.

   The result: there is no broken state. Worst case is a clean typographic
   poster with a name and a score.
   =========================================================================== */

export const CARD_W = 1080;
export const CARD_H = 1350;
// Shorter than a half so the type band doesn't strand a lake of empty space
// above the name when there's no photo to fill it.
const BAND_H = 566;
const PAD = 76;

const C = {
  bg: "#0c0912",
  card: "#1a1626",
  raised: "#13101c",
  ink: "#fdf8f2",
  soft: "#b9aec4",
  mid: "#8d84a0",
  ember: "#ff5f1f",
  saffron: "#ffc857",
  plum: "#7c2d6b",
  ion: "#2ee6d6",
};

/* ---------------------------------------------------------------------------
   QUALITY GATES

   "Only the best parts" made literal. A rating is only a brag above 4.0 with
   enough reviews behind it; a match score below 70 isn't worth printing; a
   pulled quote has to read like a sentence rather than a scraped fragment.
   --------------------------------------------------------------------------- */

export const gates = {
  rating: (r, n) => typeof r === "number" && r >= 4.0 && (n || 0) >= 25,
  score: (s) => typeof s === "number" && s >= 70,
  beat: (b) => typeof b === "number" && b >= 3,
  distance: (d) => typeof d === "number" && d > 0 && d < 60,
  quote: (t) => {
    if (typeof t !== "string") return false;
    const s = t.trim();
    if (s.length < 40 || s.length > 170) return false;
    if (/https?:\/\/|www\.|@[\w.]+/i.test(s)) return false;   // scraped junk
    if (/[<>{}|\\^~[\]`]/.test(s)) return false;              // markup leakage
    if ((s.match(/[.!?]/g) || []).length === 0) return false; // not a sentence
    return true;
  },
  category: (c) => typeof c === "string" && c.length > 2 && c.length <= 28,
};

/* Everything the card will actually show, decided before a pixel is drawn.
   Exported so the UI can tell the user what made the cut. */
export function selectCardFields(winner, query) {
  if (!winner?.name) return null;

  const meta = [];
  if (gates.rating(winner.rating, winner.reviewCount)) {
    meta.push(`${winner.rating.toFixed(1)}★`);
  }
  if (gates.category(winner.category)) meta.push(winner.category);
  if (gates.distance(winner.distanceMiles)) meta.push(`${winner.distanceMiles} mi`);

  const quoteText = [winner.review?.text, winner.evidence?.quote, winner.reception?.quote]
    .find((t) => gates.quote(t));

  let claim = null;
  if (gates.beat(winner.beatCount)) {
    claim = `Best of ${winner.beatCount + 1} nearby`;
  } else if (winner.matchedDish) {
    claim = `Matched "${winner.matchedDish}"`;
  } else if (winner.matchedCuisine) {
    claim = `${winner.matchedCuisine}, done well`;
  }

  return {
    name: String(winner.name).trim(),
    query: (query || "").trim(),
    score: gates.score(winner.matchScore) ? Math.round(winner.matchScore) : null,
    meta,
    quote: quoteText ? quoteText.trim().replace(/^["“”']|["“”']$/g, "") : null,
    claim,
    imageUrl: winner.imageUrl || null,
  };
}

/* --- text helpers --------------------------------------------------------- */

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) { line = next; continue; }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);

  // Ellipsise rather than overflow, and trim trailing punctuation so the
  // truncation doesn't read as a typo.
  if (lines.length === maxLines) {
    const consumed = lines.join(" ").split(/\s+/).length;
    if (consumed < words.length) {
      let last = lines[maxLines - 1];
      while (last && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.replace(/\s*\S+$/, "");
      }
      lines[maxLines - 1] = `${last.replace(/[,;:.\s]+$/, "")}…`;
    }
  }
  return lines;
}

function setTracking(ctx, px) {
  // letterSpacing is unsupported in older Safari; absence just renders tighter.
  try { ctx.letterSpacing = `${px}px`; } catch { /* ignore */ }
}

/* --- image loading -------------------------------------------------------- */

/* Resolves to an <img> only if it is genuinely safe to export afterwards.
   Anything else resolves null and the caller uses the typographic band.

   The bytes are fetched rather than assigned to img.src directly, for two
   reasons: the proxy is behind requireAuth and an <img> tag cannot send an
   Authorization header, and a blob: object URL is same-origin, so the canvas
   cannot taint no matter what the upstream sent. */
async function loadProxiedImage(url, apiBase, token) {
  if (!url || !token) return null;

  let objectUrl = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${apiBase}/share/photo?u=${encodeURIComponent(url)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const blob = await res.blob();
    if (!blob.type.startsWith("image/") || blob.size === 0) return null;

    objectUrl = URL.createObjectURL(blob);
    const img = await new Promise((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el.naturalWidth > 0 ? el : null);
      el.onerror = () => resolve(null);
      el.src = objectUrl;
    });
    return img;
  } catch {
    return null; // any failure just means the typographic band is used
  } finally {
    // Safe once decoded; the pixels are already in memory.
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

async function ensureFonts() {
  if (!document.fonts?.load) return;
  const faces = [
    '400 84px "Instrument Serif"',
    'italic 400 34px "Instrument Serif"',
    '500 26px "IBM Plex Mono"',
    '500 22px "IBM Plex Mono"',
    '600 56px "Space Grotesk"',
    '600 20px "IBM Plex Mono"',
  ];
  try {
    await Promise.all(faces.map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  } catch { /* fall back to system fonts rather than failing the export */ }
}

/* --- bands ---------------------------------------------------------------- */

function drawPhotoBand(ctx, img) {
  // cover-fit
  const scale = Math.max(CARD_W / img.naturalWidth, BAND_H / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, CARD_W, BAND_H);
  ctx.clip();
  ctx.drawImage(img, (CARD_W - w) / 2, (BAND_H - h) / 2, w, h);

  // Scrim, so type over the photo is legible regardless of what the photo is.
  const scrim = ctx.createLinearGradient(0, BAND_H * 0.42, 0, BAND_H);
  scrim.addColorStop(0, "rgba(12,9,18,0)");
  scrim.addColorStop(1, "rgba(12,9,18,0.96)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, CARD_W, BAND_H);
  ctx.restore();
}

/* The no-photo band. Not a fallback in feel: it makes the card a poster of
   the craving, which is a better artefact than a stock plate photo anyway. */
function drawTypeBand(ctx, fields) {
  const base = ctx.createLinearGradient(0, 0, CARD_W, BAND_H);
  base.addColorStop(0, "#1d1524");
  base.addColorStop(0.55, "#160f1e");
  base.addColorStop(1, "#0c0912");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, CARD_W, BAND_H);

  const glow = ctx.createRadialGradient(CARD_W / 2, BAND_H * 0.3, 20, CARD_W / 2, BAND_H * 0.3, BAND_H * 0.9);
  glow.addColorStop(0, "rgba(255,95,31,0.30)");
  glow.addColorStop(0.5, "rgba(124,45,107,0.14)");
  glow.addColorStop(1, "rgba(12,9,18,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, BAND_H);

  const subject = fields.query || fields.name;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(253,248,242,0.94)";
  ctx.font = 'italic 400 92px "Instrument Serif", Georgia, serif';
  const lines = wrap(ctx, subject, CARD_W - PAD * 2, 2);
  // Centres the kicker+subject GROUP, not just the subject baseline.
  const startY = BAND_H / 2 - ((lines.length - 1) * 96) / 2 + 50;
  lines.forEach((l, i) => ctx.fillText(l, CARD_W / 2, startY + i * 96));

  setTracking(ctx, 6);
  ctx.font = '500 22px "IBM Plex Mono", monospace';
  ctx.fillStyle = "rgba(255,200,87,0.9)";
  ctx.fillText("THE VERDICT", CARD_W / 2, startY - (lines.length > 1 ? 150 : 108));
  setTracking(ctx, 0);
  ctx.textAlign = "left";
}

function drawScoreSeal(ctx, score) {
  const cx = CARD_W - PAD - 66;
  const cy = BAND_H;
  const r = 66;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#0c0912";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.saffron;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = C.ink;
  ctx.font = '600 56px "Space Grotesk", system-ui, sans-serif';
  ctx.fillText(String(score), cx, cy + 8);

  setTracking(ctx, 3);
  ctx.font = '600 17px "IBM Plex Mono", monospace';
  ctx.fillStyle = C.saffron;
  ctx.fillText("MATCH", cx, cy + 36);
  setTracking(ctx, 0);
  ctx.restore();
  ctx.textAlign = "left";
}

/* --- the card ------------------------------------------------------------- */

export async function renderShareCard(winner, query, { apiBase = "", token = "" } = {}) {
  const fields = selectCardFields(winner, query);
  if (!fields) throw new Error("Nothing to share");

  await ensureFonts();

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const img = await loadProxiedImage(fields.imageUrl, apiBase, token);
  const usedPhoto = Boolean(img);
  if (usedPhoto) drawPhotoBand(ctx, img);
  else drawTypeBand(ctx, fields);

  if (fields.score != null) drawScoreSeal(ctx, fields.score);

  /* ---- content ----

     Measured before it is drawn, then centred in the space between the band
     and the footer. fillText draws from the BASELINE, so laying blocks out by
     incrementing a cursor is what put the kicker through the middle of the
     restaurant name on the first pass — every block below carries its own
     ascent, and the gaps are the space between blocks rather than a guess at
     line height. Centring also means a bare name and a name-plus-quote are
     both balanced instead of one floating in dead space. */

  const NAME_LEADING = 92;
  const QUOTE_LEADING = 47;
  const contentW = CARD_W - PAD * 2;

  const blocks = [];

  if (fields.claim) {
    blocks.push({ kind: "claim", h: 24, gap: 34 });
  }

  ctx.font = '400 84px "Instrument Serif", Georgia, serif';
  const nameLines = wrap(ctx, fields.name, contentW, 2);
  blocks.push({
    kind: "name",
    lines: nameLines,
    h: (nameLines.length - 1) * NAME_LEADING + 62, // cap height of the last line
    // Clears the descenders on the last line — at 30 the meta row sat in them.
    gap: 48,
  });

  if (fields.meta.length) {
    blocks.push({ kind: "meta", h: 22, gap: 0 });
  }

  let qLines = null;
  if (fields.quote) {
    ctx.font = 'italic 400 34px "Instrument Serif", Georgia, serif';
    qLines = wrap(ctx, `“${fields.quote}”`, contentW, 3);
    blocks.push({ kind: "rule", h: 1, gap: 46, lead: 46 });
    blocks.push({ kind: "quote", lines: qLines, h: (qLines.length - 1) * QUOTE_LEADING + 26, gap: 0 });
  }

  const totalH = blocks.reduce((s, b, i) => s + b.h + (i < blocks.length - 1 ? b.gap : 0), 0)
    + blocks.reduce((s, b) => s + (b.lead || 0), 0);

  // Starts clear of the score seal, which hangs 66px below the band edge.
  const TOP = BAND_H + 96;
  const BOTTOM = CARD_H - 132;
  let y = TOP + Math.max(0, (BOTTOM - TOP - totalH) / 2);

  for (const b of blocks) {
    if (b.kind === "claim") {
      setTracking(ctx, 5);
      ctx.font = '500 22px "IBM Plex Mono", monospace';
      ctx.fillStyle = C.saffron;
      ctx.fillText(fields.claim.toUpperCase(), PAD, y + b.h);
      setTracking(ctx, 0);
    } else if (b.kind === "name") {
      ctx.font = '400 84px "Instrument Serif", Georgia, serif';
      ctx.fillStyle = C.ink;
      const top = y;
      b.lines.forEach((l, i) => ctx.fillText(l, PAD, top + 62 + i * NAME_LEADING));
    } else if (b.kind === "meta") {
      ctx.font = '500 26px "IBM Plex Mono", monospace';
      ctx.fillStyle = C.soft;
      ctx.fillText(fields.meta.join("  ·  "), PAD, y + b.h);
    } else if (b.kind === "rule") {
      y += b.lead;
      ctx.strokeStyle = "rgba(253,248,242,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(CARD_W - PAD, y);
      ctx.stroke();
    } else if (b.kind === "quote") {
      ctx.font = 'italic 400 34px "Instrument Serif", Georgia, serif';
      ctx.fillStyle = C.soft;
      const qTop = y;
      b.lines.forEach((l, i) => ctx.fillText(l, PAD, qTop + 26 + i * QUOTE_LEADING));
    }
    y += b.h + b.gap;
  }

  /* ---- footer: the mark, small and quiet ---- */
  const fy = CARD_H - 78;
  ctx.save();
  ctx.strokeStyle = "rgba(46,230,214,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(PAD + 13, fy - 7, 13, 0, Math.PI * 1.55);
  ctx.stroke();
  ctx.fillStyle = C.ion;
  ctx.beginPath();
  ctx.arc(PAD + 13, fy - 7, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  setTracking(ctx, 4);
  ctx.font = '600 20px "IBM Plex Mono", monospace';
  ctx.fillStyle = C.mid;
  ctx.fillText("SAVORSCOUT", PAD + 40, fy);
  setTracking(ctx, 0);

  return { canvas, fields, usedPhoto };
}

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't build the image"))),
        "image/png"
      );
    } catch (err) {
      // Tainted canvas. Shouldn't happen now photos go through the proxy, but
      // if it ever does the caller retries without the photo rather than
      // showing the user a dead button.
      reject(err);
    }
  });
}
