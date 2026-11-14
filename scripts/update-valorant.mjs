// Fetches your Valorant rank + last matches from the (unofficial, free) HenrikDev API
// and writes data/valorant.json for the website to display.
// Runs inside GitHub Actions (see .github/workflows/valorant.yml) so the API key stays secret.
//
// Env: HENRIK_API_KEY (secret), VAL_NAME, VAL_TAG, VAL_REGION (na|eu|ap|kr|latam|br), VAL_QUEUE (default "competitive"; "all" = every mode; or e.g. "unrated")

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.henrikdev.xyz";
const MAX_GAMES = 10;

/* ---------- pure transform (unit-tested) ---------- */

const arr = (x) => (Array.isArray(x) ? x : []);

export function transform({ mmr, matches, tierIcons = {}, queue = "competitive" }) {
  const d = mmr?.data;
  if (!d?.account) throw new Error("Unexpected MMR response (no data.account)");
  const puuid = d.account.puuid;
  const cur = d.current || {};

  const games = [];
  for (const m of arr(matches?.data)) {
    const q = m.metadata?.queue?.id;
    if (queue && q && q !== queue) continue;

    // v4 returns players as a flat array; older shapes nest them under all_players.
    const players = Array.isArray(m.players) ? m.players : arr(m.players?.all_players);
    const me = players.find((p) => p.puuid === puuid);
    const teams = arr(m.teams);
    if (!me) continue;
    const key = (v) => String(v ?? "").toLowerCase();
    const mine = teams.find((t) => key(t.team_id) === key(me.team_id));
    const theirs = teams.find((t) => t !== mine);
    if (!mine) continue;

    const result = mine.won ? "W" : theirs?.won ? "L" : "D";
    games.push({
      result,
      map: m.metadata?.map?.name ?? null,
      score: mine.rounds ? `${mine.rounds.won}-${mine.rounds.lost}` : null,
      agent: me.agent?.name ?? null,
      kills: me.stats?.kills ?? null,
      deaths: me.stats?.deaths ?? null,
      assists: me.stats?.assists ?? null,
      startedAt: m.metadata?.started_at ?? null,
    });
  }
  games.sort((a, b) => Date.parse(b.startedAt || 0) - Date.parse(a.startedAt || 0));
  const last = games.slice(0, MAX_GAMES);

  return {
    player: { name: d.account.name, tag: d.account.tag },
    rank: {
      tier: cur.tier?.name ?? "Unranked",
      tierId: cur.tier?.id ?? 0,
      rr: cur.rr ?? 0,
      lastChange: cur.last_change ?? null,
      icon: tierIcons[cur.tier?.id] ?? null,
      leaderboard: cur.leaderboard_placement?.rank ?? null,
    },
    peak: d.peak?.tier ? { tier: d.peak.tier.name, tierId: d.peak.tier.id } : null,
    games: last,
    summary: {
      wins: last.filter((g) => g.result === "W").length,
      losses: last.filter((g) => g.result === "L").length,
      draws: last.filter((g) => g.result === "D").length,
    },
    lastMatchAt: last[0]?.startedAt ?? null,
  };
}

/* ---------- I/O ---------- */

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  if (!res.ok) {
    const msg = body?.errors?.[0]?.message || text.slice(0, 200);
    throw new Error(`${res.status} from ${url.replace(/api_key=[^&]+/, "api_key=***")}: ${msg}`);
  }
  return body;
}

async function loadTierIcons() {
  // Public, key-less API with the rank icons. Optional: failure just means no icon.
  try {
    const j = await getJson("https://valorant-api.com/v1/competitivetiers");
    const set = arr(j.data).at(-1); // newest episode
    const out = {};
    for (const t of arr(set?.tiers)) if (t.largeIcon) out[t.tier] = t.largeIcon;
    return out;
  } catch (e) {
    console.warn("Could not load rank icons (continuing without):", e.message);
    return {};
  }
}

async function main() {
  const { HENRIK_API_KEY: key, VAL_NAME: name, VAL_TAG: tag } = process.env;
  const region = (process.env.VAL_REGION || "eu").toLowerCase();
  const rawQueue = (process.env.VAL_QUEUE || "competitive").toLowerCase();
  const queue = rawQueue === "all" ? "" : rawQueue; // "" = no filter
  if (!key || !name || !tag) {
    console.error("Missing HENRIK_API_KEY, VAL_NAME or VAL_TAG. See README.md.");
    process.exit(1);
  }
  const headers = { Authorization: key };
  const id = `${region}/pc/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;

  const mmr = await getJson(`${API}/valorant/v3/mmr/${id}`, headers);
  const q = new URLSearchParams({ size: String(MAX_GAMES) });
  if (queue) q.set("mode", queue);
  const matches = await getJson(`${API}/valorant/v4/matches/${id}?${q}`, headers);
  const tierIcons = await loadTierIcons();

  const data = transform({ mmr, matches, tierIcons, queue });

  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "valorant.json");
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
  const strip = ({ updatedAt, ...rest } = {}) => JSON.stringify(rest);
  if (prev && strip(prev) === strip(data)) {
    console.log("No changes — leaving data/valorant.json as is.");
    return;
  }
  fs.writeFileSync(file, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2) + "\n");
  console.log(`Wrote data/valorant.json: ${data.rank.tier} ${data.rank.rr}RR, ${data.games.map((g) => g.result).join("")}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
