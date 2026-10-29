/* Tells Bing (and the other IndexNow engines: Yandex, Seznam, Naver) which
 * pages changed, on every production deploy.
 *
 * WHY
 * Google finds changes through the sitemap's lastmod in its own time; Bing
 * takes an explicit list, and the engines and AI assistants that search with
 * Bing's index (DuckDuckGo, Yahoo, Copilot, ChatGPT search) only see a page
 * once Bing has it. IndexNow is the documented way to say "these URLs
 * changed": one POST, no account, verified by the key file in public/.
 *
 * WHAT IT SENDS
 * The URLs whose lastmod (data/lastmod.json, which only moves when a page's
 * title, description or body really changes) is within the last three days,
 * so each edit is announced on the deploy that ships it and not again.
 *
 * It runs only on Vercel production builds, never fails a build (a network
 * problem here is logged and ignored), and gives up after ten seconds.
 */
const fs = require("fs");
const path = require("path");

const KEY = "b6b4cae72d5d0d5a3b2f2ef63aef49b6";
const HOST = "www.savorscout.net";
const DAYS = 3;

async function main() {
  if (process.env.VERCEL_ENV !== "production") {
    console.log("indexnow: not a production deploy, nothing sent");
    return;
  }
  const lastmod = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "lastmod.json"), "utf8"));
  const since = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10);
  const urls = Object.entries(lastmod).filter(([, v]) => v.d >= since).map(([u]) => u).slice(0, 10000);
  if (!urls.length) {
    console.log(`indexnow: no pages changed since ${since}`);
    return;
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
      signal: ctl.signal,
    });
    console.log(`indexnow: sent ${urls.length} changed pages, HTTP ${res.status}`);
  } catch (e) {
    console.log(`indexnow: not sent (${e.message}); the build carries on`);
  } finally {
    clearTimeout(timer);
  }
}

main().catch((e) => console.log(`indexnow: skipped (${e.message})`));
