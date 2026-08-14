import test from "node:test";
import assert from "node:assert/strict";
import { FW, ORDER, SOURCES } from "../lib/frameworks.js";
import { getArtifactJsonSchema } from "../lib/frameworkArtifacts.js";
import { artifactIsComplete, deriveActiveAgents } from "../lib/agentContext.js";
import { formatBizIntake } from "../lib/intake.js";
import { resolveNextSteps } from "../lib/nextSteps.js";

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

// Derive the expected wake count for a fed id the same way the resolver does,
// so the assertion tracks the real dependency graph instead of a guess.
function expectedWakes(id, artifacts, buckets) {
  const before = new Set(deriveActiveAgents(artifacts, buckets));
  const simulated = { ...artifacts, [id]: completeArtifact(id) };
  const after = deriveActiveAgents(simulated, buckets);
  return after.filter(other => other !== id && !before.has(other) && !artifactIsComplete(artifacts[other], other)).length;
}

test("bmc-only state recommends Industry Map and locks its downstream forces", () => {
  const artifacts = { bmc: completeArtifact("bmc") };
  const { steps, recommended } = resolveNextSteps({ frameworkId: "bmc", artifacts, buckets: readyBuckets });

  assert.deepEqual(steps.map(step => step.id).sort(), [...FW.bmc.feeds].sort());
  assert.equal(recommended, "industrymap");

  const industrymap = steps.find(step => step.id === "industrymap");
  assert.equal(industrymap.status, "ready");
  assert.equal(industrymap.wakes, expectedWakes("industrymap", artifacts, readyBuckets));
  assert.equal(industrymap.wakes, 3);

  const jtbd = steps.find(step => step.id === "jtbd");
  const sevens = steps.find(step => step.id === "sevens");
  assert.equal(jtbd.status, "ready");
  assert.equal(sevens.status, "ready");

  const fiveforces = steps.find(step => step.id === "fiveforces");
  assert.equal(fiveforces.status, "locked");
  assert.ok(fiveforces.missing.includes(FW.industrymap.name));
  assert.deepEqual(
    fiveforces.missing.sort(),
    SOURCES.fiveforces.filter(source => !artifactIsComplete(artifacts[source], source)).map(source => FW[source].name).sort(),
  );
});

test("done steps sort after ready and locked steps", () => {
  const artifacts = { bmc: completeArtifact("bmc"), jtbd: completeArtifact("jtbd") };
  const { steps } = resolveNextSteps({ frameworkId: "bmc", artifacts, buckets: readyBuckets });
  const statuses = steps.map(step => step.status);
  const firstDone = statuses.indexOf("done");
  assert.notEqual(firstDone, -1);
  assert.ok(statuses.slice(0, firstDone).every(status => status !== "done"));
  assert.equal(steps[steps.length - 1].id, "jtbd");
  assert.equal(steps[steps.length - 1].status, "done");
});

test("raci has no feeds and returns an empty next-steps set", () => {
  const artifacts = {};
  ORDER.filter(id => id !== "raci").forEach(id => { artifacts[id] = completeArtifact(id); });
  const result = resolveNextSteps({ frameworkId: "raci", artifacts, buckets: readyBuckets });
  assert.deepEqual(result, { steps: [], recommended: null });
});

test("resolveNextSteps does not mutate its inputs", () => {
  const artifacts = { bmc: completeArtifact("bmc") };
  const artifactsCopy = JSON.parse(JSON.stringify(artifacts));
  const buckets = { biz: READY_BIZ };
  const bucketsCopy = JSON.parse(JSON.stringify(buckets));

  resolveNextSteps({ frameworkId: "bmc", artifacts, buckets });

  assert.deepEqual(artifacts, artifactsCopy);
  assert.deepEqual(buckets, bucketsCopy);
});
