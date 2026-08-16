import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createFrameworkArtifact, getArtifactJsonSchema } from "../lib/frameworkArtifacts.js";
import {
  FIRST_RUN_EMPTY_COPY,
  NEEDS_INPUT_COPY,
  collectArtifactQuestions,
  filledCanvasConstraintLine,
  pipelineLauncherHref,
  resolveFrameworkWorkspaceView,
} from "../lib/frameworkWorkspaceView.js";

function sampleFromSchema(schema) {
  if (schema.const !== undefined) return schema.const;
  if (schema.enum) return schema.enum[0];
  const type = Array.isArray(schema.type) ? schema.type.find(value => value !== "null") : schema.type;
  if (type === "object") {
    return Object.fromEntries(Object.entries(schema.properties || {}).map(([key, value]) => [key, sampleFromSchema(value)]));
  }
  if (type === "array") return [sampleFromSchema(schema.items)];
  if (type === "number") return schema.minimum ?? 1;
  if (type === "string") return "x";
  return null;
}

function completeArtifact(frameworkId) {
  return { ...sampleFromSchema(getArtifactJsonSchema(frameworkId)), status: "complete" };
}

test("complete and stale maps stay on the canvas even if a later run needs input", () => {
  const complete = completeArtifact("ansoff");
  const stale = { ...complete, status: "stale" };
  const needsInputRun = { status: "needs_input" };

  assert.equal(resolveFrameworkWorkspaceView(complete, null, "ansoff"), "map");
  assert.equal(resolveFrameworkWorkspaceView(stale, null, "ansoff"), "map");
  assert.equal(resolveFrameworkWorkspaceView(complete, needsInputRun, "ansoff"), "map");
  assert.equal(resolveFrameworkWorkspaceView(stale, needsInputRun, "ansoff"), "map");
});

test("a needs_input artifact or latest run is not the first-run empty state", () => {
  const artifact = {
    frameworkId: "ansoff",
    status: "needs_input",
    nextQuestions: ["Which segment is the beachhead?", "  ", "What is the capacity constraint?"],
  };

  assert.equal(resolveFrameworkWorkspaceView(artifact, null, "ansoff"), "needs_input");
  assert.equal(resolveFrameworkWorkspaceView(null, { status: "needs_input" }, "ansoff"), "needs_input");
  assert.deepEqual(collectArtifactQuestions(artifact), [
    "Which segment is the beachhead?",
    "What is the capacity constraint?",
  ]);
  assert.equal(pipelineLauncherHref("ansoff"), "/pipeline?select=ansoff");
  assert.equal(NEEDS_INPUT_COPY.includes("paste a company URL"), false);
  assert.ok(FIRST_RUN_EMPTY_COPY.includes("paste a company URL"));
});

test("true empty and legacy stay distinct from needs_input", () => {
  const legacy = { frameworkId: "ansoff", status: "legacy" };

  assert.equal(resolveFrameworkWorkspaceView(null, null, "ansoff"), "empty");
  assert.equal(resolveFrameworkWorkspaceView(null, { status: "failed" }, "ansoff"), "empty");
  assert.equal(resolveFrameworkWorkspaceView(legacy, null, "ansoff"), "legacy");
  assert.equal(resolveFrameworkWorkspaceView(legacy, { status: "needs_input" }, "ansoff"), "needs_input");
});

test("filled canvas constraint line is ToC constraint.text; absent or unfilled is blank", () => {
  const toc = createFrameworkArtifact("toc", {
    payload: {
      constraint: {
        text: "Wholesale quotes bottleneck through the founder.",
        type: "capacity",
        location: "Founder desk",
        throughputMetric: "quotes per week",
        basis: "known",
        confidence: "high",
        evidenceRefs: [],
      },
    },
  });

  assert.equal(
    filledCanvasConstraintLine("map", toc),
    "Wholesale quotes bottleneck through the founder.",
  );
  assert.equal(filledCanvasConstraintLine("map", null), "");
  assert.equal(filledCanvasConstraintLine("map", createFrameworkArtifact("toc")), "");
  assert.equal(filledCanvasConstraintLine("empty", toc), "");
  assert.equal(filledCanvasConstraintLine("needs_input", toc), "");
  assert.equal(filledCanvasConstraintLine("legacy", toc), "");
});

test("filled canvas header renders the constraint under the company name", () => {
  const workspace = readFileSync("components/FrameworkWorkspace.jsx", "utf8");
  assert.match(workspace, /filledCanvasConstraintLine\(/);
  assert.match(workspace, /getArtifact\("toc"\)/);
  assert.match(workspace, /<h1>\{pageTitle\}<\/h1>\s*\{constraintLine && <p className="framework-constraint">\{constraintLine\}<\/p>\}/);
});
