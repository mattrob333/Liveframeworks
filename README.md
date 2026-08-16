# LiveFrameworks

**The frameworks are alive now.** Sixteen classic business frameworks (Business Model
Canvas → Industry Map → Porter's Five Forces → PESTLE → SWOT/TOWS → VRIO → Ansoff →
Three Horizons → Blue Ocean → JTBD → VPC → Kano → 7S → Balanced Scorecard → Theory of
Constraints → RACI) run as connected agents against a company's evidence. The waterfall
ends in a signed constraint diagnosis and an agent-org install for the company analyzed.
Companion tool to Tier 4 Intelligence's *The Strategist's Framework Handbook*; registered
canon in the [Instinct design repo](https://github.com/mattrob333/instinct)
(`docs/source-repos.md`, ADR-0016).

## How it works

1. **Paste a company URL and one paragraph** on the home page. That is first-run — not a
   16-agent roster.
2. **The app draws the Business Model Canvas.** The Cartographer researches the company
   live and fills the nine boxes. Chat argues with the map; it never gates seeing it.
3. **Once a canvas exists, `/` is that canvas** — the daily home. The header carries the
   current limiting factor once the Theory of Constraints has run.
4. **The expert pipeline** (`/pipeline`) holds the full roster: intake buckets, the
   dependency graph, and every framework's dedicated page. Each validated artifact wakes
   the frameworks downstream.
5. **Export** (`/export`) is the client brief: on screen and printed (white letter
   document, constraint leads), plus a flattened `.md` download for feeding an agent.

## Grounding

Every agent runs under hard grounding rules: claims trace to a loaded bucket, a validated
upstream artifact, the user's own words, or live web research — anything else is labeled
inference. Every claim carries basis (`known / inferred / assumed / missing`), confidence,
and evidence references. Agents are told which upstream agents have NOT run and are
forbidden from citing them. A labeled hole beats a plausible patch, everywhere.

## Design

Warm-dark field manual: char and tobacco, cream ink, IBM Plex Mono, square corners, 1px
rules, one amber — reserved for the constraint. Print stays white paper. The visual
doctrine, quality gauntlets, and current work orders live in [PRODUCT.md](PRODUCT.md);
the agent team that builds this repo is chartered in [team/README.md](team/README.md).

## Demo data

`demo-data/` holds three fictional company packs (coffee, garage doors, SaaS) formatted
for the intake buckets, each paired with a real best-in-class profile compiled from
sourced public data. Load one with `/?demo=driftline`, `/?demo=ironwood`, or
`/?demo=quartermast`. Reference outputs (signed briefs, the Driftline org-install and its
client two-pager) are checked in beside the packs. See
[demo-data/README.md](demo-data/README.md).

## Run it

```bash
npm install
npm run dev        # local: http://localhost:3000
npm test           # node test runner
npm run build      # production build
```

Deploy: import at vercel.com/new, preset **Next.js**, no environment variables.

## Access model (honest version)

- **"Sign in" = bring your own Anthropic API key**, entered on first-run (revealed after
  URL + paragraph validate) or in Settings. It lives in `localStorage`, is sent
  per-request to the API routes, and is never stored server-side. The nav dot means a key
  is saved in this browser.
- **All state is per-browser**: buckets, artifacts, chats persist in `localStorage`.
  Clear the browser, lose the engagement (Export first). No accounts, no database — by
  design, for now.
- Models: `claude-sonnet-5` with Anthropic's `web_search` tool available to research
  agents.

## Roadmap

- Persistence + shareable brief (hosted engagements) — the product line
- The redesigned payoff surfaces (constraint reveal, industry map, canvas draw moment) —
  specs approved, implementation queued
- Firecrawl/favicon enrichment for competitor logos on the Industry Map
- Automated Team Install export (the org-compiler; see Instinct `docs/ideas/`)
- Live connectors (CRM, ledger, call recorder) replacing paste-in buckets

---

Tier 4 Intelligence · tier4intel.com
