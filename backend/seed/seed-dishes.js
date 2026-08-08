/* Adds the recognisable-food deck to taste_cards.
 *
 *   node seed/seed-dishes.js          # dry run: shows what would change
 *   node seed/seed-dishes.js --write  # actually insert
 *
 * Idempotent: existing card names are skipped, so re-running only adds what's
 * new. Nothing is ever deleted — taste_nodes reference these ids, and removing
 * a card would silently orphan somebody's ratings.
 */
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const deck = require("./dishes");

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const WRITE = process.argv.includes("--write");
const PAGE = 1000;

/* taste_cards.id has no default — ids are assigned c0001, c0002, ... by hand.
   So the seed has to mint its own, continuing from the highest in use rather
   than restarting, or it would collide with existing rows. */
async function loadExisting() {
  const names = new Set();
  let maxId = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("taste_cards")
      .select("id, name")
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const r of data || []) {
      names.add(r.name.toLowerCase());
      const n = parseInt(String(r.id).replace(/^\D+/, ""), 10);
      if (Number.isFinite(n) && n > maxId) maxId = n;
    }
    if (!data || data.length < PAGE) break;
  }
  return { names, maxId };
}

const mintId = (n) => `c${String(n).padStart(4, "0")}`;

(async () => {
  const { names: existing, maxId } = await loadExisting();
  console.log(`taste_cards currently holds ${existing.size} cards (highest id ${mintId(maxId)})`);

  const fresh = deck
    .filter((c) => !existing.has(c.name.toLowerCase()))
    .map((c, i) => ({ id: mintId(maxId + 1 + i), ...c }));
  const dupes = deck.length - fresh.length;

  const byFamily = {};
  const byRarity = {};
  for (const c of fresh) {
    byFamily[c.family] = (byFamily[c.family] || 0) + 1;
    byRarity[c.rarity] = (byRarity[c.rarity] || 0) + 1;
  }

  console.log(`\nseed file defines ${deck.length} dishes`);
  console.log(`  already present: ${dupes}`);
  console.log(`  new to add:      ${fresh.length}`);
  console.log(`\nby family:`);
  for (const [f, n] of Object.entries(byFamily).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${f.padEnd(16)} ${n}`);
  }
  console.log(`\nby familiarity: 1 (everyone) ${byRarity[1] || 0} · 2 (most) ${byRarity[2] || 0} · 3 (adventurous) ${byRarity[3] || 0}`);
  console.log(`\ndeck after seeding: ${existing.size + fresh.length}`);

  if (!WRITE) {
    console.log(`\nDRY RUN — nothing written. Re-run with --write to apply.`);
    return;
  }
  if (fresh.length === 0) {
    console.log(`\nNothing to add.`);
    return;
  }

  let inserted = 0;
  for (let i = 0; i < fresh.length; i += 200) {
    const batch = fresh.slice(i, i + 200);
    const { error } = await db.from("taste_cards").insert(batch);
    if (error) {
      console.error(`batch at ${i} failed:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    process.stdout.write(`\r  inserted ${inserted}/${fresh.length}`);
  }
  console.log(`\n\nDone. taste_cards now holds ${existing.size + inserted} cards.`);
})().catch((err) => {
  console.error("seed failed:", err.message);
  process.exit(1);
});
