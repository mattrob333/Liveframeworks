# LiveFrameworks design system

## Product and interaction model

LiveFrameworks is an evidence-grounded strategy workspace. The pipeline is the durable home screen: users load evidence, see a dependency graph of 15 framework agents, launch ready frameworks, and watch validated outputs unlock downstream work. Framework work begins in a focused drawer that preserves the pipeline beneath it. A completed run opens a full, structured framework workspace with follow-up chat alongside it; closing returns to the updated pipeline.

Primary journey:

1. Select an intake bucket, paste or upload evidence, and save it.
2. Click a ready framework node.
3. Review context readiness and launch the prefilled action: "Read the saved context, research the company, and create the [framework]."
4. Show explicit reading, researching, structuring, and validating progress with an elapsed timer and retryable failure states.
5. Render the populated framework template with citations, provenance, gaps, and assumptions.
6. Click any framework region to inspect its expanded analysis below the template.
7. Follow up in chat without silently overwriting the locked artifact.
8. Close the workspace and see newly ready downstream nodes on the pipeline.

## Visual language

Preserve the existing analytical console identity. This is not a generic SaaS dashboard.

- Background: near-black `#0B0D10` with a quiet 48px technical grid.
- Surfaces: `#101318` and `#171B24`.
- Primary text: `#E8E6E1`; secondary: `#6B7280`; borders: `#2A2F3A`.
- Accent/action: amber `#FFB020`; selected tint `rgba(255,176,32,.13)`.
- Success/ready: green `#7BC96F`.
- Typography: IBM Plex Mono only, weights 400 and 600.
- Corners: square. No pill-heavy UI, glassmorphism, or decorative shadows.
- Borders: one-pixel lines; dashed lines for provisional/working state; two-pixel amber left rules for agent/system emphasis.
- Density: information-rich, with readable 12-14px body copy and enough space to scan dense research findings.

## Layout

- Use a fluid desktop shell instead of the current narrow 1200px container: `width: min(100% - 40px, 1720px)` with sensible inner gaps. On ultra-wide screens, the artifact receives the extra width rather than leaving large empty margins.
- Keep the persistent top navigation aligned to the same fluid shell.
- Pipeline content remains visible when a framework launches. Use an anchored right-side launcher drawer at roughly 68-76vw, capped near 1180px, with an opaque panel and a narrow dimmed glimpse of the pipeline behind it.
- The completed framework workspace is a full page, not a cramped drawer. At wide desktop sizes, use a two-column grid such as `minmax(0, 1fr) minmax(360px, 430px)` with a 24-32px gap.
- The artifact column owns most available width and may grow past 1000px. Do not scale the entire UI down on wide screens.
- The chat rail is sticky with 2.5vh top and bottom breathing room: `position: sticky; top: 2.5vh; height: 95vh; align-self: start`. Its message list scrolls internally, while the artifact and detail analysis scroll in the page.
- A sticky workspace utility bar includes a keyboard-reachable "Close - Back to pipeline" action.
- Mobile: the launcher becomes a full-screen sheet; artifact and chat become tabs or a deliberate stacked sequence.

## Framework artifact interaction

- Every agent must return a validated structured artifact that populates the appropriate visual template. Never show the canonical template as static placeholder copy after generation.
- Every meaningful cell, quadrant, row, node, horizon, or scorecard section is a real button with selected, hover, and focus states.
- Selecting a region updates an expanded detail panel immediately below the template. The detail panel includes:
  - concise assessment and current position;
  - supporting findings and evidence links;
  - claim basis (`Known`, `Inferred`, `Assumed`, `Missing`) and confidence;
  - implications, risks, gaps, and next questions;
  - an optional explicit action to discuss that region in chat.
- The selected region remains visually highlighted while its detail is shown. Preserve selection in the URL or local workspace state so a reload does not reset the user's place.
- Business Model Canvas uses the canonical nine-box geometry. Other frameworks use appropriate reusable primitives: force map, matrix, score table, timeline, paired canvas, scorecard, and workflow map.
- The interaction pattern is consistent across all 15 frameworks, but the framework semantics and geometry remain specific rather than being flattened into generic sections.

## Components and states

- Framework node states: blocked, ready, researching, generating, validating, complete, stale, failed.
- Ready nodes use green status plus amber hover. Blocked nodes remain visible and name missing prerequisites.
- Framework launcher: context summary, exact saved sources to be read, one dominant amber CTA, and an optional instruction composer.
- Run progress: persistent step list plus a restrained 3x3 pixel-grid activity indicator and live elapsed timer. Preserve the run on reload.
- Structured result cells: title, concise findings, claim basis, confidence, and evidence links.
- Chat is secondary to the artifact after completion. Follow-up chat cannot mutate the locked result without an explicit "Apply update" or "Regenerate" action.
- Failures show provider/status details in plain language and offer retry; never collapse into only "connection issue."

## Loading state adaptation

- The supplied BeautifulUI-style loader is compatible with this Next.js/React app after adaptation.
- Keep it as a client component in `.jsx`, remove TypeScript-only annotations, and replace Tailwind utilities with project CSS because Tailwind is not installed.
- Map `--ink` and `--ink-3` to the LiveFrameworks text/dim tokens and add local `pixel-on` and `shimmer-text` keyframes.
- Use the Drive pattern for reading/researching, Orbit for validation, and a static dim grid under `prefers-reduced-motion` while the elapsed timer continues.
- Pair animation with explicit phase text and progress steps; the loader is feedback, not the only status signal.

## Motion and feedback

- Keep motion restrained: 150-200ms panel/outline transitions, a short drawer entrance, and subtle progress-state changes.
- Respect reduced motion.
- When completion unlocks downstream work, briefly highlight newly ready pipeline nodes after close.

## Responsive behavior

- At 1440px and wider: fluid workspace up to about 1720px; large artifact column plus 360-430px chat rail.
- At 1000-1439px: reduce outer gutters and use a 340-390px chat rail.
- At 700-999px: use a nearly full-width launcher; completed artifact and chat stack, with chat no longer sticky.
- Below 700px: use a full-screen framework sheet; result and chat are tabs or stacked; dense templates may use intentional horizontal scrolling rather than illegible scaling.
- Business Model Canvas must preserve meaningful canonical relationships at all widths. It can move to a reduced-column arrangement on small screens, but never shrink text below readable size.

## Accessibility

- Minimum 4.5:1 contrast for body copy.
- Every clickable card and artifact region is a semantic button or link with visible focus.
- The launcher traps focus, closes with Escape, restores focus to the launching node, and has an accessible dialog label.
- Selected detail regions expose `aria-pressed` or equivalent state and connect to their detail panel with accessible labeling.
- Loading phases use an `aria-live` status without announcing every timer tick.
- Status is conveyed with text and icon, never color alone.
