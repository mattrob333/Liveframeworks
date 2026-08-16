# Design reference prototypes

The Claude Design HTML prototypes for the three approved page designs land here, one
file each, named:

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
