# LiveFrameworks — product direction

Read this before changing UX, copy, or first-run flow.
This is the shared reasoning behind the `dev/first-run` work (PR #1) and the next slices.
Do not treat production (`https://liveframeworks.vercel.app`) as this direction until this branch is merged.

**Branch:** `dev/first-run` · **PR:** https://github.com/mattrob333/Liveframeworks/pull/1  
**Do not push to `main` unless Matthew says so.**

---

## The core problem

LiveFrameworks was a **tool dressed as a product**.

The landing sold: paste a URL, get a strategy team for the price of a coffee.
The app delivered: open the pipeline, bring an Anthropic key, chat until the Cartographer is `[SATISFIED]`, then unlock 16 handbook chapters.

Those are different jobs. The first is a product. The second is a live companion to *The Strategist's Framework Handbook*.

We are turning the first-run into a product without throwing away the tool. The pipeline stays. It is no longer the front door.

---

## Who it is for

**B2B. Advisors and consultants** (and strategy-fluent operators) running an engagement. Often screenshared with a founder or CEO.

Not a generic SMB owner. Not a B2C consumer app. The coffee line is a price joke, not a buyer.

Intake copy already knew this (your contact, client interview, leadership template). Design and first-run should know it too.

---

## What we changed on this branch (PR #1)

### First-run is the product

1. Home primary action is **company URL + one paragraph**, then Draw.
2. That auto-draws the Business Model Canvas. Chat **argues with the map**. It does not gate seeing it. No `[SATISFIED]` wall before the nine-box.
3. The 16-agent roster is **hidden on first-run home**.
4. **Pipeline is the expert view.** Intake buckets, spine, export, settings, framework pages, and the `lf:*` localStorage model stay. Do not break them.

Completing the handbook is a course. Shipping a canvas (and later a brief) they can take to Monday is a product.

Theory of Constraints is the real punchline ("the one thing that matters"). It stays **later**, not first-run. Do not add agents.

### QA / first-run integrity (also on this branch)

These were product bugs, not polish:

1. Empty API key must not save as success.
2. Empty intake must not save as success. Business bucket requires URL + description.
3. BMC must not be READY/ENABLED when the required bucket is empty.
4. Research / Draw must be disabled with no key. Do not error after click.
5. Selection lives in the URL (`/pipeline?select=bmc`). `/?select=*` redirects there. Unknown slugs say unknown.
6. Themed 404, not the default white Next page.
7. Mobile nav tap targets at least 44px.

---

## Locked UX (now on this branch)

1. **In-place key.** Hide the key field until URL + paragraph are valid. Then reveal a password input above Draw. Same primary button. Helper: “Key stays in this browser.” Settings keeps Remove / Reset. **Eating the first canvas (we pay for inference) is out.**
2. **Canvas is home after first run.** Once a complete BMC exists, `/` is that canvas (same workspace as `/framework/bmc`). Intake is a quiet “New company,” not the home form.
3. **Nav.** Brand is the company hostname from the URL, linking `/`. Pipeline and Export stay. **New company** appears only after a canvas exists (and on `/?new=1` / Pipeline when a company is loaded). No second workspace toolbar. No “API Key” label. A small status dot means key present. The key itself lives in Settings (and the in-place field on first run).
4. **● LIVE** only while a request is in flight. Idle: no indicator. No key: no LIVE; the composer says a key is needed. Never fake live.
5. **Filled canvas is a brief.** After an artifact exists, the page is the map + chat. One title: the company, then the map. Land on the map only — do not pre-open a cell. Click a region for a single inspector (what’s in the box, sources, Discuss). Gaps / assumptions / next questions tuck into that inspector, not a second card deck. Pipeline keeps the handbook chrome (roster, tool calls, unlock graph). The nine-box stays a nine-box on desktop; phones may stack.
6. **One next move.** After a filled framework, one quiet line and one button under the map (after BMC: “Next: Industry Map” → `/pipeline?select=industrymap`). RACI’s next move is “Open Export.” No roster, no locked rows, no wake counts on the canvas.
7. **Chat rail is the agent.** Icon + role name + one voice sentence. A chevron “How this was built” goes to Pipeline. No Update button. Chat still cannot write the locked artifact.
8. **Two exports, two files.** `/export` on screen **is** the client brief: company, date, optional intake paragraph as the lede, then only completed frameworks as the designed maps (BMC nine-box, Industry Map four bands). If BMC is the only lock, that is the whole on-screen brief — do not leave empty slots for the other 15. No digest overflow, no empty-cell placeholders, no “LiveFrameworks engagement.” stub. **Print is a document, not a screenshot of the app.** Portrait letter, ~0.75in, white paper, black ink. No cream, no desk grid, no cell fills, no amber, no `print-color-adjust`. Do not print the Osterwalder nine-box or the 12-col Industry Map. BMC on paper is nine headed sections in canvas order (Key Partnerships → … → Revenue Streams) with bullets. Industry Map on paper is the four-band sequence as headings only (no Terrain / Players / Flows / Time wrappers). Coverage, nav, the two buttons, and the site footer are screen-only. **Print brief** is the primary action (`window.print()` — not a Download PDF button). **Download for an agent** is the secondary consultant tool: flattened `.md` (headings + bullets, no JSON dump). The `.md` never becomes the preview. Do not put gaps, assumptions, or the 16-agent roster on the brief.

---

## Visual direction (now on this branch)

**Light is the default.** Dark tokens stay unused for a later operator toggle.

Keep the field-manual identity on paper:
- IBM Plex Mono
- square corners
- amber
- 1px rules
- quiet grid

**Invert the paper. Do not invent a new look.** Not generic SaaS gray.
The working surface (landing, canvas, pipeline, settings, export, 404, nav) matches a printed brief.

On a filled framework: body 14px, chrome / labels 12px minimum, dim ink no lighter than about `#5A5548`. Labels are ink, not faint orange-on-cream.

---

## Tonight's slice (2026-08-15) — in priority order, stop when out of night

Context first, code second: this repo is now registered canon in the Instinct design repo
([source-repos](https://github.com/mattrob333/instinct/blob/main/docs/source-repos.md),
[ADR-0016](https://github.com/mattrob333/instinct/blob/main/docs/adr/0016-engagement-seeds-the-framework-stack.md),
[component page](https://github.com/mattrob333/instinct/blob/main/docs/components/liveframeworks.md)).
Read ADR-0016 before working. The `docs/ideas/` directory there is **context, not backlog** —
build nothing from it tonight.

1. **Drive Driftline end-to-end and fix what breaks.** `demo-data/coffee/` holds four files
   that map to the four intake buckets (see `demo-data/README.md`). Paste all four, run the
   full waterfall BMC → … → ToC → RACI, argue with at least one map in chat, then produce
   both exports. Fix every crash, truncation, mis-rendered artifact section, dead link, or
   wrong next-move encountered — each fix its own commit. **Done:** a full clean run
   exists; the exported Driftline brief (`.md` download) is checked in as
   `demo-data/coffee/driftline-brief-reference.md`; a run log of what broke and what was
   fixed is in the PR/commit messages. The seeded constraint (wholesale bottlenecked
   through the founder) should surface in the ToC artifact without being told — if it
   doesn't, that is a finding to record, not a prompt to hand-edit.
2. **One-click demo load (dev ergonomics).** A quiet way to load a demo pack into all four
   buckets at once (e.g. a dev-only control on Pipeline or a `/?demo=driftline` param that
   fills `lf:bucket:*` from `demo-data/`). Must not appear in the client-facing brief or
   first-run surfaces. **Done:** one action fills all four buckets; works for all three
   packs; nothing visible changes for a normal user.
3. **Stale canvas keeps home.** `HomeGate` routes `/` back to the intake form when the BMC
   is stale (it checks complete-only). A stale canvas should render as the canvas with its
   existing stale note, not vanish into the landing form. **Done:** mark canvas stale →
   `/` still shows the map + stale note; `?new=1` still forces intake; tests cover
   `resolveHomeMode`.
4. **(Stretch) "Today's limiting factor."** Only if 1–3 are done: when a ToC artifact
   exists, the canvas header (under the company name) and the brief's lede carry one line —
   the current constraint in plain words. No new agents, no new surfaces; it is a rendering
   of the existing ToC artifact.
5. **The Org Install document (written deliverable, not code).** Once Order 1's full
   Driftline run is complete, write `demo-data/coffee/driftline-org-install.md` — the
   agent-org export for the analyzed company, drawn ONLY from the completed artifacts
   (org bucket, BMC, ToC constraint, RACI routing) and following the pattern in
   `team/README.md` and the Instinct repo's `docs/ideas/org-compiler.md`. Structure:
   - **`EXE ★ Chief of Staff`** — charter (six fields) + a routing table: every
     department ★ below it and what kinds of requests/events route to each + a daily
     cron instruction for it to check every ★, roster inline, escalation-to-owner rules.
   - **Departments sized to what Driftline actually needs** — derived from the
     constraint and RACI, not a fixed template (expect a wholesale desk, since that is
     the constraint; ops; marketing — whatever the artifacts justify). Per department:
     one **★ manager charter**, then 2–4 agents, each with: name in the `TEAM ★/· Role`
     convention, one-line description, skills, and the tools/scopes it would need from
     Driftline's systems (Shopify, QuickBooks, Slack per the intake).
   - **A cron routine per department** (roster inline, work-order source named, cadence
     justified by the department's rhythm) plus the EXE daily cron.
   - **A Trigger Map per department** — event-driven wiring to where Driftline's humans
     work, drawn from the systems in the intake (Slack, Shopify, QuickBooks): event
     source → condition → which ★ wakes → what it does → what cascades → where the loop
     closes back to the human. Rules: triggers fire ★ agents only, never workers;
     cascades happen by assignment, never trigger→trigger; an agent that writes to a
     channel is never woken by it; the schedule cron stays as the fallback heartbeat.
     Example shape: "Slack #wholesale, human message containing an order/lead → wakes
     WSL ★ → classifies, assigns quote prep, replies in-thread with status."
   - **The filled Operator's Manual** — the humans' half, per the template in the
     Instinct repo's `docs/ideas/operators-manual.md`: name the Owner and a Section
     Steward per department **from Driftline's actual org chart** (e.g. the wholesale
     lead stewards the wholesale desk), each with their 10-minute daily check-in, red
     flags, escalation boundaries, and the install's approval-queue rules.
   - **Grounding rule:** every department and every role must cite the artifact fact
     that justifies it (the constraint, an org gap, a RACI row, a canvas box). A role
     that cannot cite its reason does not ship. No generic org-chart filler. The same
     rule covers steward assignments — a steward is named because the org chart says
     that person owns that department's reality.
   **Done:** the file exists; the Partner's verdict says it reads like something Matt
   could paste into his agent runtime tomorrow and staff Driftline with; every role
   carries its citation. This document is the hand-built prototype of the productized
   "Team Install" export — treat its structure as a draft schema, and note in the run
   report what data the artifacts were missing that the export needed.

Tonight's don't-touch: no acquirer mode, no cartridges, no BIC comparison UI, no daily
brief, no persistence layer, no new frameworks or agents, nothing merged to `main`.
Run `npm test` and `npx next build` before every push.

---

## What is still a tool (on purpose, for now)

- BYO Anthropic key in `localStorage`. No accounts, no database.
- No shareable link, no hosted engagement.

**Persistence + a shareable brief is the product line.** Not more agents. That is the milestone after this UX slice.

---

## What not to do

- Do not put the 16-agent roster back on first-run home.
- Do not make Pipeline the landing CTA again.
- Do not reintroduce a chat-satisfaction gate before the canvas is visible.
- Do not add frameworks or agents to make it feel more complete.
- Do not merge to `main` or overwrite production as part of exploratory work.
- Do not clone this repo onto a local agent machine unless Matthew explicitly asks.

---

## How to tell you got it

A new user pastes a company URL and a paragraph, draws a canvas, and has something they could put on a call. The handbook is still there, one click into Pipeline, for the consultant who wants the full engagement.
