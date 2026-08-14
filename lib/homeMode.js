// After a complete BMC exists, `/` is that canvas. Intake is only for
// first-run or an explicit “New company” (`?new=1`). Autorun always
// opens the workspace so Draw can start the first canvas.

export function resolveHomeMode({ ready, autorun, hasCanvas, wantNew }) {
  if (!ready) return "loading";
  if (autorun || (hasCanvas && !wantNew)) return "canvas";
  return "intake";
}
