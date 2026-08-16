import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FW, ORDER } from "../lib/frameworks.js";
import { getArtifactJsonSchema } from "../lib/frameworkArtifacts.js";
import { formatBizIntake } from "../lib/intake.js";
import { resolveFrameworkWorkspaceView } from "../lib/frameworkWorkspaceView.js";
import { agentOneLiner, filledCanvasNextMove, resolveNextMove, resolveNextSteps } from "../lib/nextSteps.js";

const READY_BIZ = formatBizIntake({
  url: "https://example.com",
  paragraph: "We sell compliance software to mid-market operations teams.",
});
const readyBuckets = { biz: READY_BIZ };

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
  const artifact = { ...sampleFromSchema(getArtifactJsonSchema(frameworkId)), status: "complete" };
  if (frameworkId === "raci") {
    artifact.payload.roles = [
      { id: "owner", name: "Owner", title: "Executive owner", type: "human" },
      { id: "worker", name: "Worker", title: "Delivery lead", type: "human" },
    ];
    artifact.payload.workItems[0].assignments = [
      { roleId: "owner", code: "A" },
      { roleId: "worker", code: "R" },
    ];
  }
  return artifact;
}

test("after BMC the one next move is Industry Map", () => {
  const artifacts = { bmc: completeArtifact("bmc") };
  const { recommended } = resolveNextSteps({ frameworkId: "bmc", artifacts, buckets: readyBuckets });
  assert.equal(recommended, "industrymap");
  assert.deepEqual(resolveNextMove({ frameworkId: "bmc", artifacts, buckets: readyBuckets }), {
    href: "/pipeline?select=industrymap",
    line: "Next: Industry Map",
    action: "Industry Map",
  });
});

test("RACI's one next move is Export", () => {
  assert.deepEqual(resolveNextMove({ frameworkId: "raci", artifacts: {}, buckets: readyBuckets }), {
    href: "/export",
    line: "Next: Export",
    action: "Open Export",
  });
});

test("no recommended ready framework means no next move", () => {
  assert.equal(resolveNextMove({ frameworkId: "industrymap", artifacts: {}, buckets: {} }), null);
});

// Next chapter in ORDER. Same one-line + one-button as BMC.
const WATERFALL_NEXT = [
  { id: "fiveforces", nextId: "pestle" },
  { id: "swot", nextId: "vrio" },
  { id: "threehorizons", nextId: "blueocean" },
  { id: "blueocean", nextId: "jtbd" },
  { id: "sevens", nextId: "bsc" },
];

function renderNextMove(nextMove) {
  if (!nextMove) return "";
  return renderToStaticMarkup(
    React.createElement(
      "p",
      { className: "next-move" },
      React.createElement("span", null, nextMove.line),
      React.createElement("a", { className: "btn", href: nextMove.href }, nextMove.action),
    ),
  );
}

test("Five Forces, SWOT, Three Horizons, Blue Ocean, and 7S show one next move when filled, none when not", () => {
  for (const { id, nextId } of WATERFALL_NEXT) {
    const filledArtifacts = { [id]: completeArtifact(id) };
    const expected = {
      href: `/pipeline?select=${nextId}`,
      line: `Next: ${FW[nextId].name}`,
      action: FW[nextId].name,
    };

    assert.equal(resolveFrameworkWorkspaceView(filledArtifacts[id], null, id), "map");
    assert.deepEqual(
      filledCanvasNextMove("map", { frameworkId: id, artifacts: filledArtifacts, buckets: readyBuckets }),
      expected,
    );

    const filledHtml = renderNextMove(
      filledCanvasNextMove("map", { frameworkId: id, artifacts: filledArtifacts, buckets: readyBuckets }),
    );
    assert.match(filledHtml, /class="next-move"/);
    assert.match(filledHtml, new RegExp(`Next: ${FW[nextId].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(filledHtml, new RegExp(`href="/pipeline\\?select=${nextId}"`));
    assert.equal((filledHtml.match(/class="btn"/g) || []).length, 1);

    assert.equal(resolveFrameworkWorkspaceView(null, null, id), "empty");
    assert.equal(filledCanvasNextMove("empty", { frameworkId: id, artifacts: filledArtifacts, buckets: readyBuckets }), null);
    assert.equal(filledCanvasNextMove("map", { frameworkId: id, artifacts: {}, buckets: {} }), null);
    assert.equal(filledCanvasNextMove("needs_input", { frameworkId: id, artifacts: filledArtifacts, buckets: readyBuckets }), null);
    assert.equal(filledCanvasNextMove("legacy", { frameworkId: id, artifacts: filledArtifacts, buckets: readyBuckets }), null);
    assert.equal(renderNextMove(filledCanvasNextMove("empty", { frameworkId: id, artifacts: filledArtifacts, buckets: readyBuckets })), "");
  }
});

test("filled canvas still renders one next-move line and one button under the map", () => {
  const workspace = readFileSync("components/FrameworkWorkspace.jsx", "utf8");
  assert.match(workspace, /filledCanvasNextMove\(/);
  assert.match(workspace, /<p className="next-move">\s*<span>\{nextMove\.line\}<\/span>\s*<Link className="btn" href=\{nextMove\.href\}>\{nextMove\.action\}<\/Link>\s*<\/p>/);
  assert.doesNotMatch(workspace, /wakes/);
  assert.doesNotMatch(workspace, /locked/);
});

// Completed 16/16 run: every feed is done, so recommended is null. The map
// must still point at the next ORDER sibling — same chrome as a first fill.
const COMPLETED_RUN_NEXT = [
  { id: "bmc", nextId: "industrymap" },
  { id: "industrymap", nextId: "fiveforces" },
  ...WATERFALL_NEXT,
];

function expectedMove(nextId) {
  return {
    href: `/pipeline?select=${nextId}`,
    line: `Next: ${FW[nextId].name}`,
    action: FW[nextId].name,
  };
}

test("completed 16/16 run still shows one next-move on BMC, Industry Map, and the five", () => {
  const artifacts = Object.fromEntries(ORDER.map(id => [id, completeArtifact(id)]));
  for (const { id, nextId } of COMPLETED_RUN_NEXT) {
    const expected = expectedMove(nextId);

    assert.equal(resolveFrameworkWorkspaceView(artifacts[id], null, id), "map");
    assert.equal(resolveNextSteps({ frameworkId: id, artifacts, buckets: readyBuckets }).recommended, null);
    assert.deepEqual(
      filledCanvasNextMove("map", { frameworkId: id, artifacts, buckets: readyBuckets }),
      expected,
    );

    const filledHtml = renderNextMove(
      filledCanvasNextMove("map", { frameworkId: id, artifacts, buckets: readyBuckets }),
    );
    const namePattern = FW[nextId].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "(?:'|&#x27;)");
    assert.match(filledHtml, /class="next-move"/);
    assert.match(filledHtml, new RegExp(`Next: ${namePattern}`));
    assert.match(filledHtml, new RegExp(`href="/pipeline\\?select=${nextId}"`));
    assert.equal((filledHtml.match(/class="btn"/g) || []).length, 1);
  }
});

test("unfilled BMC, Industry Map, and the five show no next-move", () => {
  for (const { id } of COMPLETED_RUN_NEXT) {
    assert.equal(resolveFrameworkWorkspaceView(null, null, id), "empty");
    assert.equal(filledCanvasNextMove("empty", { frameworkId: id, artifacts: {}, buckets: {} }), null);
    assert.equal(filledCanvasNextMove("map", { frameworkId: id, artifacts: {}, buckets: {} }), null);
    assert.equal(filledCanvasNextMove("needs_input", { frameworkId: id, artifacts: {}, buckets: {} }), null);
    assert.equal(filledCanvasNextMove("legacy", { frameworkId: id, artifacts: {}, buckets: {} }), null);
    assert.equal(renderNextMove(filledCanvasNextMove("map", { frameworkId: id, artifacts: {}, buckets: {} })), "");
  }
});

test("agent one-liner is the first voice sentence", () => {
  assert.equal(agentOneLiner(FW.bmc), "Before anyone optimizes anything, I draw the map.");
});
