import { artifactIsComplete } from "@/lib/agentContext";
import { currentConstraintLine } from "@/lib/frameworkArtifacts";

export const FIRST_RUN_EMPTY_COPY =
  "Return home, paste a company URL and one paragraph, and the canvas will draw itself. Or open the pipeline to launch this framework.";

export const NEEDS_INPUT_COPY =
  "The agent needs more input before this map can be drawn. These questions are waiting in the pipeline launcher.";

export function collectArtifactQuestions(artifact) {
  if (!Array.isArray(artifact?.nextQuestions)) return [];
  return artifact.nextQuestions.map(question => String(question || "").trim()).filter(Boolean);
}

export function pipelineLauncherHref(frameworkId) {
  return `/pipeline?select=${encodeURIComponent(frameworkId || "")}`;
}

// Complete and stale maps stay on the canvas. A finished needs_input run is
// not "never run" — show the questions instead of first-run empty copy.
export function resolveFrameworkWorkspaceView(artifact, latestRun, expectedFrameworkId) {
  if (artifactIsComplete(artifact, expectedFrameworkId) || artifact?.status === "stale") {
    return "map";
  }
  if (artifact?.status === "needs_input" || latestRun?.status === "needs_input") {
    return "needs_input";
  }
  if (artifact?.status === "legacy") {
    return "legacy";
  }
  return "empty";
}

// Filled canvas only. Empty / needs_input / legacy headers stay as they are.
export function filledCanvasConstraintLine(view, tocArtifact) {
  if (view !== "map") return "";
  return currentConstraintLine(tocArtifact);
}
