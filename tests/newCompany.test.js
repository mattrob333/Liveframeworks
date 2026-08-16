import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyDemoBuckets } from "../lib/demoPacks.js";
import { currentConstraintLine } from "../lib/frameworkArtifacts.js";
import {
  agentDownloadName,
  buildAgentMarkdown,
  engagementMeta,
  listCompleteFrameworks,
} from "../lib/exportBrief.js";
import { shouldClearPriorCompany } from "../lib/homeMode.js";
import { readDemoPack } from "../lib/server/demoPacks.js";

const IRONWOOD_CONSTRAINT = "Inbound call answering and dispatch — concentrated in Carla Nunez plus two CSRs with no after-hours/weekend coverage — is THE constraint: it gates volume into repair and install simultaneously and is already causing lost and near-lost deals.";
const DRIFTLINE_CONSTRAINT = "Maya is the wholesale bottleneck — every account still routes through her inbox.";

function ironwoodLeftovers() {
  return {
    toc: {
      frameworkId: "toc",
      status: "stale",
      summary: "Garage-door dispatch is THE constraint.",
      payload: {
        constraint: {
          text: IRONWOOD_CONSTRAINT,
          type: "capacity",
          location: "inbound call answering",
          throughputMetric: "booked repair and install jobs",
          basis: "inferred",
          confidence: "high",
          evidenceRefs: [],
        },
      },
    },
    bmc: {
      frameworkId: "bmc",
      status: "stale",
      summary: "Ironwood Door Co. repair and install canvas.",
    },
  };
}

function driftlineToc() {
  return {
    frameworkId: "toc",
    status: "stale",
    payload: {
      constraint: {
        text: DRIFTLINE_CONSTRAINT,
        type: "policy",
        location: "founder inbox",
        throughputMetric: "wholesale accounts",
        basis: "known",
        confidence: "high",
        evidenceRefs: [],
      },
    },
  };
}

// Same sequence HomeGate runs: write ?demo= buckets, then drop the prior
// map only when those writes actually changed the company.
function applyNewCompanyDemo(buckets, store) {
  const applied = applyDemoBuckets(buckets, {
    getBucket: key => store.buckets[key] || "",
    setBucket: (key, value) => {
      store.buckets[key] = value;
      return { ok: true };
    },
  });
  const bucketsChanged = applied.ok && applied.writes.some(write => write.previous !== write.next);
  if (applied.ok && shouldClearPriorCompany({ bucketsChanged })) {
    store.artifacts = {};
    store.runs = {};
    store.cleared = true;
  } else {
    store.cleared = false;
  }
  return applied;
}

test("New company / Draw drops the prior map; ?new=1 alone does not", () => {
  assert.equal(shouldClearPriorCompany({}), false);
  assert.equal(shouldClearPriorCompany({ bucketsChanged: false, committingDraw: false }), false);
  assert.equal(shouldClearPriorCompany({ bucketsChanged: true }), true);
  assert.equal(shouldClearPriorCompany({ committingDraw: true }), true);
});

test("after Ironwood, ?new=1&demo=driftline leaves no Ironwood constraint in artifacts or export", () => {
  const ironwood = readDemoPack("garage-doors");
  const driftline = readDemoPack("coffee");
  const store = {
    buckets: { ...ironwood },
    artifacts: ironwoodLeftovers(),
    runs: { toc: [{ id: "ironwood-toc" }] },
  };

  assert.match(currentConstraintLine(store.artifacts.toc), /Carla Nunez/);
  assert.match(buildAgentMarkdown({ buckets: store.buckets, artifacts: store.artifacts }), /repair and install/);

  const switched = applyNewCompanyDemo(driftline, store);
  assert.equal(switched.ok, true);
  assert.equal(store.cleared, true);
  assert.match(store.buckets.biz, /driftline\.example/);
  assert.doesNotMatch(store.buckets.biz, /ironwooddoor\.example/);
  assert.deepEqual(store.artifacts, {});
  assert.deepEqual(store.runs, {});
  assert.equal(currentConstraintLine(store.artifacts.toc), "");
  assert.deepEqual(listCompleteFrameworks(store.artifacts), []);

  const markdown = buildAgentMarkdown({ buckets: store.buckets, artifacts: store.artifacts });
  assert.match(markdown, /driftline\.example/);
  assert.doesNotMatch(markdown, /Carla Nunez/);
  assert.doesNotMatch(markdown, /repair and install/);
  assert.doesNotMatch(markdown, /Ironwood Door/);
  assert.match(markdown, /No completed frameworks yet/);
  assert.equal(agentDownloadName(engagementMeta(store.buckets)), "driftline.example-brief.md");
});

test("a later Ironwood load is not stuck as Driftline, and a same-pack reload is not a wipe", () => {
  const ironwood = readDemoPack("garage-doors");
  const driftline = readDemoPack("coffee");
  const store = {
    buckets: { ...driftline },
    artifacts: { toc: driftlineToc() },
    runs: { toc: [{ id: "driftline-toc" }] },
  };

  const samePack = applyNewCompanyDemo(driftline, store);
  assert.equal(samePack.ok, true);
  assert.equal(store.cleared, false);
  assert.match(currentConstraintLine(store.artifacts.toc), /Maya/);
  assert.match(store.buckets.biz, /driftline\.example/);

  const back = applyNewCompanyDemo(ironwood, store);
  assert.equal(back.ok, true);
  assert.equal(store.cleared, true);
  assert.match(store.buckets.biz, /ironwooddoor\.example/);
  assert.doesNotMatch(store.buckets.biz, /driftline\.example/);
  assert.deepEqual(store.artifacts, {});
  assert.equal(currentConstraintLine(store.artifacts.toc), "");

  const markdown = buildAgentMarkdown({ buckets: store.buckets, artifacts: store.artifacts });
  assert.doesNotMatch(markdown, /Maya/);
  assert.doesNotMatch(markdown, /driftline\.example/);
  assert.match(markdown, /ironwooddoor\.example/);
});

test("HomeGate and New company Draw clear prior work; they do not invent a Driftline ToC", () => {
  const gate = readFileSync("components/HomeGate.jsx", "utf8");
  assert.match(gate, /applyDemoBuckets/);
  assert.match(gate, /shouldClearPriorCompany/);
  assert.match(gate, /clearCompanyWork/);
  assert.doesNotMatch(gate, /markDependentArtifactsStale/);
  assert.doesNotMatch(gate, /Carla/);
  assert.doesNotMatch(gate, /createFrameworkArtifact\("toc"/);

  const home = readFileSync("components/FirstRunHome.jsx", "utf8");
  assert.match(home, /shouldClearPriorCompany\(\{ committingDraw: true \}\)/);
  assert.match(home, /clearCompanyWork/);
  assert.doesNotMatch(home, /markDependentArtifactsStale/);

  const store = readFileSync("lib/store.js", "utf8");
  assert.match(store, /export const clearCompanyWork/);
  assert.match(store, /key !== PREFIX \+ "apikey"/);
  assert.match(store, /!key\.startsWith\(PREFIX \+ "bucket:"\)/);
});
