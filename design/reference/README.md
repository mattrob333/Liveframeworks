# Design reference prototypes

**Landed 2026-08-17.** These are Claude Design exports (`.dc.html` format — they
reference a `support.js` runtime and use `sc-if`/`sc-for` template tags, so they don't
render standalone in a plain browser). Read them as the source of truth for **markup
structure, exact copy, colors/sizes, and the interaction script** — the embedded
`SCRIPT`/state logic at the bottom of each file documents intended behavior, including
the canvas prototype's honest event-class ledger script. Matt can screen-record the
live versions from Claude Design for side-by-side gauntlet judging.

The three approved page designs, one file each:

- `constraint-reveal.html` — the Theory of Constraints payoff page (final revision:
  marquee verdict, chain graphic, stakes band, value equation)
- `industry-map.html` — the Surveyor's chart (readability revision)
- `canvas-workspace.html` — the three-state canvas (draw / reveal / daily home)

## Rules of use

1. **These are the visual bar, not code.** Implementation is judged against them
   side-by-side (the gauntlet), but the app is built from the written specs in the
   design studies, against the real schema.
2. **Every `DEMO-ONLY` comment marks a lie the app must not tell.** Those elements
   render in the app only when their data contract ships (see PRODUCT.md Phase 1c/3a).
   Porting a DEMO-ONLY element literally is a defect, not a shortcut.
3. Prototypes are frozen once committed — revisions come through a new design loop,
   not edits here. The commit that adds each file names its spec revision.
