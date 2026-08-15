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

## Slice log

**2026-08-15 (night + day) — SHIPPED, all five orders.** Driftline end-to-end signed
(brief at `demo-data/coffee/driftline-brief-reference.md`); the seeded constraint
surfaced **unprompted and correctly as a policy constraint** — the diagnosis we hoped
the tool could make, made. `?demo=` pack loading, stale-canvas home fix, the
limiting-factor line, PRs #6–#16 of rendering fixes, and the first complete **Org
Install export** (`demo-data/coffee/driftline-org-install.md`) — reviewed and signed:
the six-field charters, the human-judge right-sizing, the "Not staffed" refusals with
receipts, and the honest missing-data table are exactly what this product is for. The
"Not staffed: MKT" section — declining to build what the founder asked for because the
evidence says otherwise — is the single best thing this codebase has produced. Work of
this quality is why the Team Install service is now real. Well done — every seat.

## Current slice (2026-08-16) — in priority order

Same canon as before (ADR-0016 et al. in the Instinct repo; `docs/ideas/` there is
context, not backlog).

1. **Clear the parked visual defects.** SWOT renders as **four quadrants** (with the
   TOWS crossing legible), not two lists; BMC top-row cells stop breaking inside a word
   at 1280. **Done:** both clean at 1280 and in the print brief; no other framework
   regresses.
2. **Intake learns from the export.** The org-install's "Missing data" table
   (`driftline-org-install.md` §7) is the spec: extend the intake bucket guides and
   templates so the next install has fewer missing rows — named inboxes/channels, the
   account book, approval thresholds and $ gates, key vendor names,
   production-rate/system facts. Existing pastes must keep parsing (backward
   compatible); new fields are optional prompts, not validation gates. **Done:**
   guides/templates updated; parse tests cover old and new formats; the PR lists which
   missing-data rows the new intake would have filled.
3. **The client-facing install summary (written deliverable).** The Partner writes
   `demo-data/coffee/driftline-org-install-summary.md`: two pages max — the org-at-a-
   glance chart, the signed constraint sentence, the steward list, the approval-gates
   table, and one line each for the "Not staffed" refusals — pointing to the full
   install for depth. The 925-line document is the advisor's copy; this is what Maya
   reads. **Done:** Partner signs that a founder could read it in ten minutes and know
   exactly what was installed and why; Inspector checks it against the brief's voice.
4. **Prove it wasn't coffee-specific: run Ironwood end-to-end.** Same as the Driftline
   mission — `?demo=ironwood`, full waterfall, argue with a map, both exports, fix what
   breaks — then check in `demo-data/garage-doors/ironwood-brief-reference.md`. The
   seeded constraint (booking capacity, not marketing spend) should surface unprompted;
   record honestly if it doesn't. **Done:** clean run, brief checked in, run log in the
   PR.
5. **(Stretch) Ironwood org-install.** Only if 1–4 are done: the Order-5 export for
   Ironwood, same grounding rule, same five artifacts. A second install from a second
   vertical is what turns the Driftline document from an artifact into a schema.

Don't-touch, unchanged: no acquirer mode, no cartridges, no BIC comparison UI, no daily
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
