# LiveFrameworks

**The frameworks are alive now.** Seventeen classic business frameworks (Business Model Canvas → Porter → PESTLE → SWOT/TOWS → VRIO → Ansoff → Three Horizons → Blue Ocean → JTBD → VPC → Kano → 7S → BSC/OKRs → Theory of Constraints → RACI) run as connected agents against a company's evidence. Companion tool to Tier 4 Intelligence's *The Strategist's Framework Handbook*.

## How it works

1. **Load evidence** into the nine intake buckets (paste text, upload .txt/.md/.csv/.json, or copy the interview template and fill it in). Partial evidence is fine.
2. **Satisfy the Cartographer.** The Business Model Canvas agent starts online. Chat with it — it reads your buckets, researches the company URL on the live web, interviews you for missing boxes, then delivers a nine-box first pass and declares `[SATISFIED]`.
3. **The roster wakes up.** Satisfaction activates the downstream agents, with the canvas as shared state. Each agent runs the same loop: read evidence + upstream outputs, ask for what's missing, deliver a first pass, wake its dependents.
4. **Every framework has a dedicated page** — template graphic, tools, working documents, its locked output, and its own chat. Standby agents will still talk to you; they'll tell you what to finish first.
5. **Export** compiles evidence + all locked outputs into one markdown snapshot for the company.

## Grounding

Every agent runs under hard grounding rules: claims must trace to a loaded bucket, an included upstream output, the user's own words, or a live web search — anything else must be labeled as inference. Agents are explicitly told which upstream agents have NOT run and are forbidden from citing them.

## Deploy (Vercel)

```bash
npm install
npm run dev        # local: http://localhost:3000
```

To ship: import this repo at vercel.com/new, framework preset **Next.js**, no environment variables needed. Done.

## Access model (honest version)

- **"Sign in" = bring your own Anthropic API key**, entered on the Settings page. It lives in `localStorage`, is sent per-request to the `/api/chat` edge proxy, and is never stored server-side.
- **All state is per-browser**: buckets, outputs, activation, chats persist in `localStorage`. Clear the browser, lose the engagement (Export first). No accounts, no database — by design, for now.
- Chat model: `claude-sonnet-5`, with Anthropic's `web_search` tool enabled for the five web-enabled agents.

## Roadmap

- Real auth + hosted storage (per-engagement workspaces, shareable links)
- Populated template graphics (agent output parsed into the nine boxes)
- Live connectors (CRM, ledger, call recorder) replacing paste-in buckets
- Structured JSON outputs and machine-readable shared state
- Attested delegation layer at Stage 08

---

Tier 4 Intelligence · tier4intel.com
