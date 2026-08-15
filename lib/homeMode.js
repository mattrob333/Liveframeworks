import { artifactIsComplete } from "@/lib/agentContext";

// After a BMC exists, `/` is that canvas. Intake is only for first-run
// or an explicit “New company” (`?new=1`). Autorun always opens the
// workspace so Draw can start the first canvas.
//
// Complete-only is the wrong gate: a stale BMC still has a map, and
// FrameworkWorkspace already shows it with the existing stale note.
// Missing or incomplete BMC (needs_input, legacy, empty) stay intake.

export function hasHomeCanvas(artifact) {
  return artifactIsComplete(artifact, "bmc") || artifact?.status === "stale";
}

export function resolveHomeMode({ ready, autorun, hasCanvas, wantNew }) {
  if (!ready) return "loading";
  if (autorun || (hasCanvas && !wantNew)) return "canvas";
  return "intake";
}

// Keep ?autorun=1 on first-run home until a BMC exists. HomeGate reads
// that flag via useSearchParams; Next.js syncs replaceState into it.
// Stripping the query before a canvas remounts FirstRunHome and the
// workspace abort()s the in-flight run as “Cancelled by user.”
export function autorunReplaceUrl({ home, hasCanvas }) {
  if (home && !hasCanvas) return null;
  return home ? "/" : "/framework/bmc";
}

// First-run home already is “new company.” Show the nav link after a
// canvas exists, on the reset form (`?new=1`), or on Pipeline when a
// company URL is loaded.
export function shouldShowNewCompany({ hasCanvas, wantNew, path, companyLoaded }) {
  if (hasCanvas || wantNew) return true;
  return path === "/pipeline" && Boolean(companyLoaded);
}
