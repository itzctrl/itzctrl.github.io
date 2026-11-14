# itzctrl.github.io

Personal site on **GitHub Pages**. Pure static files, no backend, no login.

```
index.html / style.css / script.js / config.js   the website
assets/                                          images
data/valorant.json                               Valorant stats (written automatically by the Action)
scripts/update-valorant.mjs                      fetches your rank + last games
.github/workflows/valorant.yml                   runs the script every ~20 min and commits the result
```

Until you finish the Valorant setup below, the Valorant card says "Not linked yet" and everything else works.

## How the Valorant card works

GitHub Pages can't hide an API key, so the key never touches the website. Instead a **GitHub Action** runs on a schedule,
asks the free, unofficial [HenrikDev API](https://docs.henrikdev.xyz) for your rank/RR and last matches, and commits a small
`data/valorant.json`. The site just reads that file. It only commits when something changed (new game / RR change).

Shown: Riot ID, rank, RR (+ last RR change), peak rank, and your last 10 **competitive** games as W / L (with map, score, agent, K/D/A on the Valorant tab).

## Setup (about 5 minutes)

1. **Get a free API key.** Go to <https://api.henrikdev.xyz/dashboard/> → *API Keys* → *Generate New Key*.
2. **Add it to your repo.** GitHub repo `itzctrl.github.io` → *Settings → Secrets and variables → Actions*:
   - Tab **Secrets** → *New repository secret*: name `HENRIK_API_KEY`, value = your key.
   - Tab **Variables** → *New repository variable* (three of them):
     - `VAL_NAME` = your Riot ID name (the part before `#`)
     - `VAL_TAG`  = your tag (the part after `#`, without the `#`)
     - `VAL_REGION` = `eu`, `na`, `ap`, `kr`, `latam` or `br`
3. **Let the Action write to the repo.** *Settings → Actions → General → Workflow permissions* → **Read and write permissions** → Save.
4. **Run it once.** *Actions* tab → *Update Valorant stats* → **Run workflow**. After ~30 seconds `data/valorant.json` appears in the repo
   and the card goes live (Pages takes a minute to redeploy). After that it updates itself.

If the run fails, open it in the Actions tab: the log says why (wrong Riot ID/region, bad key, rate limit...). A failed run never
overwrites the old data.

## Good to know

- **Unofficial API.** HenrikDev isn't run by Riot. Riot's own API doesn't hand out rank/match history to personal sites, so this is the practical free option. If it ever changes or goes down, the card just keeps showing the last saved data.
- **Private profile / no recent games:** the card shows your rank and an empty form strip.
- **Other game modes:** add a repository variable `VAL_QUEUE` = `all` (every mode) or e.g. `unrated`. Leave it unset for competitive only.
- **Scheduled runs pause** after 60 days without repo activity (a GitHub rule). If the card stops updating, press *Run workflow* once.
- **Editing text:** Projects, About and Contact copy lives directly in `index.html`; Discord/GitHub/Binxa links are in `config.js`.
- **Colours / fonts:** the pastel light and dark colour sets are the two `:root` blocks at the top of `style.css` (dark mode follows the visitor's system setting).
