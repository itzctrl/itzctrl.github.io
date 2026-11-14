(() => {
  "use strict";
  const cfg = window.SITE_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  /* ───────── basics ───────── */
  $("year").textContent = new Date().getFullYear();
  $("mainLink").href = cfg.LINK_URL || "#";
  $("mainLinkLabel").textContent = "Visit " + (cfg.LINK_LABEL || "");
  if (cfg.GITHUB_URL) $("ghLink").href = cfg.GITHUB_URL;

  /* ───────── tabs ───────── */
  const VIEWS = ["home", "projects", "about", "valorant", "contact"];
  const TITLES = { home: "itzCtrl", projects: "Projects · itzCtrl", about: "About · itzCtrl", valorant: "Valorant · itzCtrl", contact: "Contact · itzCtrl" };
  let current = null;
  function route() {
    let v = location.hash.replace(/^#\/?/, "");
    if (!VIEWS.includes(v)) v = "home";
    document.querySelectorAll(".view").forEach((s) => { s.hidden = s.dataset.view !== v; });
    document.querySelectorAll(".menu a").forEach((a) => {
      if (a.dataset.tab === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.title = TITLES[v];
    if (v !== current) window.scrollTo(0, 0);
    current = v;
  }
  window.addEventListener("hashchange", route);
  route();

  /* ───────── Discord modal ───────── */
  const modal = $("discordModal");
  const idOk = cfg.DISCORD_ID && !String(cfg.DISCORD_ID).startsWith("YOUR_");
  $("modalHandle").textContent = "@" + (cfg.DISCORD_USERNAME || "");
  $("openDiscordApp").href = idOk ? `discord://-/users/${cfg.DISCORD_ID}` : "#";
  $("openDiscordWeb").href = idOk ? `https://discord.com/users/${cfg.DISCORD_ID}` : "https://discord.com/app";
  $("discordBtn").addEventListener("click", () => modal.showModal());
  $("discordBtn2").addEventListener("click", () => modal.showModal());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
  $("copyHandle").addEventListener("click", async (e) => {
    try { await navigator.clipboard.writeText(cfg.DISCORD_USERNAME); e.target.textContent = "Copied!"; }
    catch { e.target.textContent = "@" + cfg.DISCORD_USERNAME; }
    setTimeout(() => (e.target.textContent = "Copy username"), 1800);
  });

  /* ───────── Valorant ───────── */
  const h = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  };
  const ago = (iso) => {
    const t = Date.parse(iso);
    if (!t) return "";
    const s = Math.max(0, (Date.now() - t) / 1000);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    for (const [u, n] of [["day", 86400], ["hour", 3600], ["minute", 60]]) if (s >= n) return rtf.format(-Math.floor(s / n), u);
    return "just now";
  };
  const safeImg = (url) => (typeof url === "string" && /^https:\/\//.test(url) ? url : null);

  function rankRow(d) {
    const row = h("div", "rank-row");
    const src = safeImg(d.rank.icon);
    if (src) {
      const img = h("img", "rank-icon"); img.src = src; img.alt = ""; img.loading = "lazy";
      img.addEventListener("error", () => img.remove());
      row.appendChild(img);
    }
    const box = h("div");
    box.appendChild(h("div", "rank-name", d.rank.tier));
    const rr = h("div", "rr-line");
    rr.appendChild(h("b", null, `${d.rank.rr} RR`));
    const lc = d.rank.lastChange;
    if (typeof lc === "number" && lc !== 0) rr.appendChild(h("span", "delta " + (lc > 0 ? "up" : "down"), (lc > 0 ? "+" : "") + lc));
    box.appendChild(rr);
    const bar = h("div", "bar"); const fill = h("i");
    fill.style.width = Math.max(0, Math.min(100, d.rank.rr)) + "%";
    bar.appendChild(fill); box.appendChild(bar);
    row.appendChild(box);
    return row;
  }

  function formStrip(games) {
    const f = h("div", "form");
    f.setAttribute("role", "img");
    f.setAttribute("aria-label", "Last results: " + games.map((g) => ({ W: "win", L: "loss", D: "draw" }[g.result])).join(", "));
    games.forEach((g) => {
      const s = h("span", g.result, g.result);
      s.title = [g.map, g.score, g.agent].filter(Boolean).join(" · ");
      f.appendChild(s);
    });
    return f;
  }

  function record(d) {
    const s = d.summary || {};
    return `${s.wins ?? 0}W · ${s.losses ?? 0}L` + (s.draws ? ` · ${s.draws}D` : "");
  }

  function notLinked(container, compact) {
    container.replaceChildren();
    if (compact) container.appendChild(h("span", "label", "Valorant"));
    const p = h("div", "panel empty-state");
    p.appendChild(h("strong", null, "Not linked yet"));
    p.appendChild(h("p", "muted", "Rank and recent games will show up here once the Valorant sync is set up (see README)."));
    if (compact) { container.appendChild(p.firstChild); container.appendChild(p.lastChild); } else container.appendChild(p);
  }

  function renderCompact(d) {
    const c = $("valCompact");
    c.replaceChildren();
    const top = h("div", "val-top");
    top.append(h("span", "label", "Valorant"), h("span", "val-id", `${d.player.name}#${d.player.tag}`));
    c.append(top, rankRow(d));
    if (d.games.length) {
      c.appendChild(formStrip(d.games));
      const m = h("div", "form-meta");
      const b = h("b", null, record(d));
      m.append("Last " + d.games.length + ": ", b);
      c.appendChild(m);
    }
  }

  function renderFull(d) {
    const root = $("valFull");
    root.replaceChildren();
    const wrap = h("div", "grid val-full");

    const left = h("article", "panel");
    const top = h("div", "val-top");
    top.append(h("span", "label", "Competitive"), h("span", "val-id", `${d.player.name}#${d.player.tag}`));
    left.append(top, rankRow(d));
    const stats = h("div", "stat-grid");
    const stat = (k, v) => { const w = h("div"); w.append(h("span", null, k), h("b", null, v)); stats.appendChild(w); };
    stat("Peak", d.peak?.tier ?? "—");
    stat("Last " + d.games.length, d.games.length ? record(d) : "—");
    if (d.rank.leaderboard) stat("Leaderboard", "#" + d.rank.leaderboard);
    stat("Last match", d.lastMatchAt ? ago(d.lastMatchAt) : "—");
    left.appendChild(stats);
    if (d.games.length) left.appendChild(formStrip(d.games));

    const right = h("article", "panel");
    right.appendChild(h("span", "label", "Recent games"));
    const list = h("div", "games");
    if (!d.games.length) list.appendChild(h("p", "muted", "No recent competitive games found."));
    d.games.forEach((g) => {
      const row = h("div", "game");
      row.appendChild(h("span", "badge " + g.result, g.result));
      const main = h("div", "game-main");
      main.appendChild(h("b", null, g.map || "Unknown map"));
      main.appendChild(h("small", null, [g.agent, g.score].filter(Boolean).join(" · ")));
      const end = h("div", "game-end");
      if (g.kills != null) end.appendChild(h("b", null, `${g.kills}/${g.deaths}/${g.assists}`));
      end.appendChild(document.createTextNode(g.startedAt ? ago(g.startedAt) : ""));
      row.append(main, end);
      list.appendChild(row);
    });
    right.appendChild(list);
    wrap.append(left, right);
    root.appendChild(wrap);
    if (d.updatedAt) root.appendChild(h("p", "stale", "Synced " + ago(d.updatedAt) + " · data from the unofficial HenrikDev API"));
  }

  async function loadValorant() {
    try {
      const res = await fetch("data/valorant.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      const d = await res.json();
      if (!d || !d.rank || !d.player) throw new Error("not linked");
      d.games = Array.isArray(d.games) ? d.games : [];
      renderCompact(d);
      renderFull(d);
    } catch {
      notLinked($("valCompact"), true);
      notLinked($("valFull"), false);
    }
  }
  loadValorant();
})();
