import test from "node:test";
import assert from "node:assert/strict";
import { FW } from "../lib/frameworks.js";
import { getArtifactJsonSchema } from "../lib/frameworkArtifacts.js";
import { formatBizIntake } from "../lib/intake.js";
import { agentOneLiner, resolveNextMove, resolveNextSteps } from "../lib/nextSteps.js";

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

test("agent one-liner is the first voice sentence", () => {
  assert.equal(agentOneLiner(FW.bmc), "Before anyone optimizes anything, I draw the map.");
});
