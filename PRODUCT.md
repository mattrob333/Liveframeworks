# LiveFrameworks — product direction

Read this before changing UX, copy, or first-run flow.
This is the shared reasoning behind the `dev/first-run` work (PR #1) and the next slices.
Production (`https://liveframeworks.vercel.app`) tracks `main`, which carries this direction as of the 2026-08-16 release.

**Branch:** `dev/first-run` (working) · **`main` is the released line as of 2026-08-16**
— Matt authorized the merge (PR #1). Continue developing on `dev/first-run`; releases to
`main` remain Matt's explicit call, never part of exploratory work.

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

## Visual direction (REVERSED by Matt, 2026-08-16 — dark is the default)

**Warm-dark field manual is the app's default surface.** The constraint-reveal design
study proved it: char and tobacco with cream ink and one glowing amber reads as MORE
premium on a screenshare, not less — because it is the same paper with the lights off,
never a navy SaaS console. The old cool-blue `--dark-*` tokens were wrong and are gone.

The palette (now live in `globals.css :root`): bg `#211D15` · panel `#282318` · panel2
`#322C1E` · ink `#E9E2CF` · dim `#9C927C` (no darker — it must hold 4.5:1 on bg) ·
faint `#403927` · amber `#E39A2B` + `--amber-dim` wash · ok `#8FBF6F` · danger `#C96A6A`.

Unchanged laws:
- IBM Plex Mono, square corners, 1px rules, quiet grid — the identity survives the flip
- Body 14px, labels 12px minimum
- Amber is reserved for the constraint and its argument chain — the flip makes this
  MORE important: on dark, amber genuinely glows, so a second glowing element is twice
  the crime
- **Print is white paper, black ink, always.** The `@media print` block is hardcoded to
  `#fff`/`#111` and must stay hardcoded — physical paper has no dark mode. The on-screen
  `/export` preview renders dark like the rest of the app; the printed page does not.
- Light-paper palette is preserved in a comment block in `:root` for a later
  client-light toggle. Do not delete it.

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

**2026-08-16 (Saturday) — the functional slice closed; dark shipped; RELEASED TO MAIN.**
G2 signed (SWOT quadrants + BMC), the Maya two-pager
(`demo-data/coffee/driftline-org-install-summary.md`), G3 Ironwood end-to-end signed
including the company-bleed fix (ToC roster now scoped to the loaded company — a real
bug the second vertical flushed out). The Ironwood constraint (booking capacity, not
marketing spend) surfaced unprompted — **two verticals, two unprompted correct
diagnoses.** Dark sweep D1–D5 complete: amber discipline merged, print verified
diff-clean, empty states clean (D1; D3's full map re-sign in dark never flew — it
carries into the next slice), LoadingState fixed (#28). G1
export overhaul merged (#29): the client brief leads with the constraint and drops all
tool chrome. Everything merged to `main` on Matt's order — 150/150 tests, clean build.

**Parked, honestly:** G4 — the Ironwood org-install draft exists only on the Floor
Lead's runner disk (payload limit; two-strike rule correctly invoked; needs a human
commit path). G5 — a defect list of agent-voice issues on the reference briefs, filed
unfixed. Quartermast never started. Partner sign-off on real `/export` renders is
blocked by login-walled Vercel previews — either drop preview protection or attach one
saved render per vertical.

## THE DESIGN PHASE (2026-08-17 →) — implementing the three approved pages

Three design studies produced three signed specifications, and Claude Design built HTML
reference prototypes: the **constraint reveal** (Theory of Constraints payoff), the
**Industry Map**, and the **canvas workspace + draw moment**. The prototypes are
**landed in `design/reference/`** (2026-08-17) — Phase 2 is unblocked. They are the
visual bar, NOT code to port literally: every
`DEMO-ONLY` comment marks content the app's data cannot honestly produce yet. Work the
phases in order; each is its own slice and its own PR chain.

### Phase 1 — Foundations (everything else builds on this; do first, alone)

1a. **The readability ladder, system-wide.** New floors replace the old ones: body
    16px/1.65 (~62ch max), box/claim digests 15px/1.5 (16px ≥1440), section/band
    headers 24px/600 with 15px plain-English subtitles, labels/apparatus 13px dim —
    **nothing below 13px anywhere**. Sweep every surface; the old 12px floor is dead.
    Every dense element gains a HOW-TO-READ one-liner (14px dim italic); every
    framework page gains its WHY-THIS-STEP note (generated from `FW[id].insight`).
    **Done:** a G6 gauntlet pass — the two-meter test AND the smart-12-year-old test
    ("know what you're looking at within one sentence of arriving") on every page,
    judged by the Inspector.
1b. **Colorless provenance, everywhere.** Kill green/amber in `.artifact-meta`,
    `.artifact-source-kind`, `.toc-proof-chips`: the apparatus is 13px dim plain caps,
    `[inferred]`/`[assumed]` italic in brackets, `medium`→`MED`, counts computed.
    UNSURVEYED dashed blocks for missing data. One shared `Apparatus` component.
1c. **Schema plumbing, one PR.** Build the optional-properties variant of
    `objectSchema` (playerSchema's hand-rolled `required` is the precedent), THEN add
    as optional-with-backfill: `bmc.readout`, `industrymap.map.verdict {headline,
    subline, grounding}`, player `logoUrl/logoStatus/logoFetchedAt/logoSource`,
    per-claim `feedsForward` (max one per artifact, renderer enforces first-wins).
    Old artifacts must normalize clean — zero validation-banner regressions. Update
    generation prompts to write `readout`/`verdict` (with the empty-fallback rule: an
    absent thesis beats a hollow one).
1d. **The event-type allowlist (structural honesty).** `interpretRunEvent` passes the
    raw event type through; the run UI renders ONLY an allowlisted set (phase /
    search_query / search_results / writing / research_complete / result / error) — so
    fabricated narration is impossible by construction, not by discipline. Two
    generations of designers independently invented fake research lines; the code must
    make the lie unrepresentable.

### Phase 2 — The three pages (one slice each, in this order, each G-judged against
its reference prototype in `design/reference/` plus its written spec)

2a. **The canvas workspace + draw moment** (first — it's every user's first three
    minutes): survey ledger replacing LoadingState on the bmc path (append-only
    logLines, live-line amber caret, quiet cancel, failure keeps the ledger), the
    empty nine-box frame at final geometry, the hard cut (no stagger, no settle),
    survey stamp once per revision, readout thesis in the masthead, dim box titles +
    the nine plain-English glosses, digest sort by grounding, UNSURVEYED empty boxes,
    inspector fixes (scrollIntoView — a real shipped bug — plus ×/Esc close).
2b. **The constraint reveal**: five-act document (marquee verdict + precision line,
    stakes band with visceral labels, value-equation block, chain graphic with solid
    flow triangles and the pinch, argument spine, ledger, people, record), per the
    revised spec including the Hormozi block. Data honesty: the stakes numbers render
    ONLY from sourced fields/benchmarks with labels; where the artifact lacks a field
    the element is absent, never faked.
2c. **The Industry Map**: marquee verdict, territories shelf + player field with
    monogram plates (deterministic algorithm + unit test), YOU-ARE-HERE client tile
    (synthesized fallback mandatory), flows band with the feeds-forward lamp, time
    spine, legend, UNSURVEYED close, trademark footer lines.

### Phase 3 — Enrichment (after 2c, behind config)

3a. **Firecrawl logo enrichment**: a server-side post-pass at artifact-generation time
    keyed on `player.url` — favicon → og:image → apple-touch-icon; reject <24px and
    generic CMS defaults; re-host the asset (never hotlink); write
    `logoUrl/logoStatus/logoFetchedAt/logoSource`. API key via server env var
    (`FIRECRAWL_API_KEY`) — absent key = feature silently off, monograms forever
    (the fallback IS the design). Never recolor/distort third-party marks.
3b. **(Experiment, flagged) Exa search for research**: optionally route agent research
    through Exa alongside Anthropic web_search where it measurably improves source
    quality; judged by comparing evidence libraries on the demo verticals. `EXA_API_KEY`
    env var, same absent-key rule. Do not replace web_search until the comparison wins.

### Phase 4 — Close the record

Ironwood org-install landed (once the file reaches the repo), Quartermast end-to-end
(G3) + its org-install (G4 blind), the G5 voice pass on all reference briefs, and D3
finally flown: every framework map re-signed in dark at the G2 bar.

Standing rules, unchanged: tests + build green before every push; judge signatures in
PRs; a parked gauntlet with an honest defect list beats a quietly lowered bar; no
acquirer mode, no cartridges, no persistence layer, no new frameworks or agents;
releases to `main` only on Matt's explicit order.

### Appended 2026-08-16: THE DARK SWEEP (takes priority over remaining orders above)

Matt reversed the visual doctrine: warm-dark is now the app's default (see Visual
direction). The base token flip is already committed — every surface now inherits the
warm-dark palette. Your job is the sweep and the judgment:

D1. **Audit every surface at 1280 in dark**: landing/first-run, canvas + inspector,
    pipeline (all 16 node states), every framework page, settings, export preview,
    404, loading states, chat rail. Hunt: illegible dim-on-dark text (dim is `#9C927C`,
    never darker), washed-out 1px rules, amber-wash blocks that now vanish or now
    scream, hover states that lost contrast, any surface that accidentally kept a
    light-paper assumption (hardcoded light color, wrong-direction shadow, etc.).
    Each fix its own commit.
D2. **Print integrity**: `window.print()` from /export must produce the identical
    white-letter document as before the flip — zero visual diff. The `@media print`
    block is hardcoded and should already guarantee this; verify, don't assume.
D3. **G2 gauntlet re-run in dark**: the nine-box, Industry Map, SWOT quadrants, 7S at
    1280 — same Strategyzer-grade bar, new surface. The Inspector signs each.
D4. **Amber discipline audit**: on dark, amber glows for real. Sweep every surface for
    amber that is now doing decoration rather than marking the constraint/argument
    chain; demote to ink/dim. The reveal design's law is now app law.
D5. Loading/LoadingState module: verify the amber-wash grid and shimmer read correctly
    on dark panels (module uses tokens with light fallbacks — fallbacks never fire,
    but the wash opacities may need a nudge).

Done for the sweep = every page signed in dark at G2, print diff-clean, and one
screenshot set (all pages, 1280) in the PR for Matt's morning read.

---

## The Gauntlet (appended 2026-08-16) — quality bars and the loop protocol

The slice above says *what*; this section says *how good*, and how you know. Each
surface has a **named reference**. Work on a surface is not DONE until the named judge
has compared the output against its reference and signed the bar — in the PR, quoting
the gauntlet ID. "The builder thinks it's good" is not a state in this system.

**The loop:** builder ships → Test Pilot re-flies the *whole* affected flow (never just
the changed screen) → the judge compares against the reference and either **SIGNS**
("meets G-n: <one sentence why>") or returns a **numbered defect list** (every gap, not
the top three) → builder fixes → loop. **Three loops maximum per gauntlet per slice** —
if it hasn't passed in three, park it with the defect list in the run report; grinding a
fourth loop hides the finding that the bar needs different work. Judges judge the
artifact, never the effort.

| ID | Surface | Named reference (judge against THIS, blind) | Judge |
|---|---|---|---|
| **G1** | The client brief — print and on-screen `/export` | The engagement summary a top-tier strategy consultancy leaves with a founder — the document a client pays five figures for and forwards to their board. Zero rendering defects at 1280 and on paper; every claim traceable to evidence or labeled inference; the constraint story reads as a narrative, not a data dump. | Partner (content), Inspector (form) |
| **G2** | The nine-box and framework maps on screen | Strategyzer's printed Business Model Canvas poster — the real Osterwalder artifact. Side-by-side at 1280: ours must look like the professionally typeset original, not a web app imitating it. No cell breaks inside a word, no clipped column, no orphaned label, at 1280 and 1440. | Inspector |
| **G3** | The full waterfall run | A zero-intervention pass on **all three demo packs**: `?demo=` → BMC → … → ToC → RACI → both exports, with no crash, no dead-end, no artifact stuck `needs_input` without a visible, human-readable reason. The Morning Line bar: a stranger screensharing this to a client never has to apologize for the tool. | Test Pilot flies, Partner signs |
| **G4** | Org installs | The signed Driftline install is now the internal reference. Every subsequent install (Ironwood, then Quartermast) must survive a **blind** comparison: the Partner reads it without being told which company, and finds the same grounding density, the same honest missing-data table, the same right-sizing and refusals. | Partner |
| **G5** | Agent voice in chat and artifacts | The field-manual voice of this repo's own copy: mono, declarative, specific, zero slop tells (no "game-changer", no breathless triads, no summarizing the take back at the reader). Every chat claim carries an evidence ref or says "inference." | Inspector (voice), Partner (evidence) |

### The next 12 hours, sequenced — work top to bottom, mark each DONE before advancing

1. Slice orders 1–2 (SWOT quadrants + BMC word-break; intake learns from the export) →
   **G2 loop** on every framework surface touched.
2. Slice order 3 (client-facing Driftline install summary) → **G1 loop** (it is a
   client-facing document; both judges).
3. Slice order 4 (Ironwood end-to-end) → **G3 loop** on the garage-doors pack; fixes
   discovered here re-run the Driftline pack too before signing (no fixing one vertical
   by breaking another).
4. **G1 full pass** on the print + screen brief for BOTH verticals — this is the
   gauntlet most likely to reveal parked-defect ghosts; loop it hard.
5. Slice order 5 (Ironwood org-install) → **G4 blind comparison**.
6. If all signed and hours remain: **Quartermast end-to-end (G3), then its org-install
   (G4)** — three verticals signed is the full house.
7. Remaining time: **G5 sweep** — read the Cartographer's and Conductor's actual chat
   output and artifact prose against the bar; file defects as numbered findings even if
   unfixed by end of window.

Rules for the window: every DONE is a judge's signature in a PR, never a self-mark; a
parked gauntlet with an honest defect list is a valid outcome, a quietly lowered bar is
not; tests and build green before every push, as always. End-of-window deliverable: the
run report lists each gauntlet as SIGNED / PARKED(defects) / NOT-REACHED, in order.
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
