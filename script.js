(() => {
  const cfg = window.SITE_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  $("year").textContent = new Date().getFullYear();
  $("mainLink").href = cfg.LINK_URL || "#";
  $("mainLinkLabel").textContent = cfg.LINK_LABEL || "Visit";

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  const glow = $("glow");
  window.addEventListener("pointermove", (e) => {
    glow.style.left = e.clientX + "px";
    glow.style.top = e.clientY + "px";
  }, { passive: true });

  const modal = $("discordModal");
  const idOk = cfg.DISCORD_ID && !cfg.DISCORD_ID.startsWith("YOUR_");
  $("modalHandle").textContent = "@" + (cfg.DISCORD_USERNAME || "");
  $("openDiscordApp").href = idOk ? `discord://-/users/${cfg.DISCORD_ID}` : "#";
  $("openDiscordWeb").href = idOk ? `https://discord.com/users/${cfg.DISCORD_ID}` : "https://discord.com/app";
  $("discordBtn").addEventListener("click", () => modal.showModal());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
  $("copyHandle").addEventListener("click", async (e) => {
    try { await navigator.clipboard.writeText(cfg.DISCORD_USERNAME); e.target.textContent = "Copied!"; }
    catch { e.target.textContent = "@" + cfg.DISCORD_USERNAME; }
    setTimeout(() => (e.target.textContent = "Copy username"), 1800);
  });
})();
