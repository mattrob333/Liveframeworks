import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { INTAKE, ORDER } from "../lib/frameworks.js";
import {
  ARTIFACT_SCHEMA_VERSION,
  createFrameworkArtifact,
  currentConstraintLine,
  getArtifactDefinition,
  getArtifactJsonSchema,
  getArtifactSections,
  validateFrameworkArtifact,
} from "../lib/frameworkArtifacts.js";
import {
  artifactIsComplete,
  buildContextSnapshot,
  deriveActiveAgents,
  getAffectedFrameworks,
  getBucketAffectedFrameworks,
  shouldReplaceCurrentArtifact,
} from "../lib/agentContext.js";
import { formatBizIntake } from "../lib/intake.js";
import { ANSOFF_IGNORE_ANSWER_DIRECTION } from "../lib/frameworkRunFollowUp.js";
import FrameworkArtifact from "../components/FrameworkArtifact.jsx";

const claim = text => ({ text, basis: "known", confidence: "high", evidenceRefs: ["E1"] });
const evidence = {
  id: "E1",
  kind: "intake",
  title: "Business description",
  sourceKey: "biz",
  artifactRevision: null,
  messageId: null,
  url: null,
  retrievedAt: null,
};

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
    const keys = Array.isArray(schema.required) ? schema.required : Object.keys(schema.properties || {});
    return Object.fromEntries(keys.filter(key => schema.properties?.[key]).map(key => [key, sampleFromSchema(schema.properties[key])]));
  }
  if (type === "array") return [sampleFromSchema(schema.items)];
  if (type === "number") return schema.minimum ?? 1;
  if (type === "string") return "x";
  if (type === "boolean") return false;
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

function completeBmcArtifact() {
  return createFrameworkArtifact("bmc", {
    status: "complete",
    title: "Example BMC",
    summary: "A grounded nine-box business model.",
    generatedAt: "2026-08-11T00:00:00.000Z",
    evidence: [evidence],
    payload: {
      boxes: {
        keyPartners: [claim("Cloud infrastructure partners")],
        keyActivities: [claim("Build and operate the product")],
        keyResources: [claim("Engineering team and platform")],
        valuePropositions: [claim("Reduce compliance overhead")],
        customerRelationships: [claim("High-touch onboarding")],
        channels: [claim("Direct sales and marketplaces")],
        customerSegments: [claim("Mid-market regulated teams")],
        costStructure: [claim("Engineering and cloud compute")],
        revenueStreams: [claim("Subscription and implementation fees")],
      },
    },
  });
}

test("all 16 frameworks expose a schema and canonical renderer definition", () => {
  assert.equal(ORDER.length, 16);
  for (const frameworkId of ORDER) {
    const definition = getArtifactDefinition(frameworkId);
    const schema = getArtifactJsonSchema(frameworkId);
    assert.ok(definition, `${frameworkId} definition missing`);
    assert.ok(definition.sections.length > 0, `${frameworkId} sections missing`);
    assert.equal(schema.type, "object");
    assert.equal(schema.properties.frameworkId.const, frameworkId);
    assert.equal(schema.properties.schemaVersion.const, ARTIFACT_SCHEMA_VERSION);
    const structural = validateFrameworkArtifact(createFrameworkArtifact(frameworkId), frameworkId, { requireContent: false });
    assert.equal(structural.valid, true, `${frameworkId}: ${structural.errors.join("; ")}`);
  }
});

test("the validated dependency DAG unlocks the exact nine waterfall waves", () => {
  const expectedWaves = [
    ["bmc"],
    ["industrymap", "jtbd", "sevens"],
    ["fiveforces", "pestle", "vrio", "vpc"],
    ["swot", "blueocean"],
    ["ansoff", "kano"],
    ["threehorizons"],
    ["bsc"],
    ["toc"],
    ["raci"],
  ];
  const artifacts = {};
  const previouslyReady = new Set();

  for (const expected of expectedWaves) {
    const ready = deriveActiveAgents(artifacts, readyBuckets);
    const newlyReady = ready.filter(key => !previouslyReady.has(key));
    assert.deepEqual(newlyReady, expected);
    newlyReady.forEach(key => {
      previouslyReady.add(key);
      artifacts[key] = completeArtifact(key);
    });
  }

  assert.deepEqual(deriveActiveAgents(artifacts, readyBuckets), ORDER);
});

test("Business Model Canvas validates only when every canonical box has supported content", () => {
  const artifact = completeBmcArtifact();
  const result = validateFrameworkArtifact(artifact, "bmc", { requireContent: true });
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(getArtifactSections("bmc", artifact).length, 9);

  artifact.payload.boxes.channels = [];
  const incomplete = validateFrameworkArtifact(artifact, "bmc", { requireContent: true });
  assert.equal(incomplete.valid, false);
  assert.ok(incomplete.errors.some(error => error.includes("Channels")));
});

test("needs_input and malformed artifacts never unlock downstream agents", () => {
  const artifacts = { bmc: { frameworkId: "bmc", status: "needs_input" } };
  assert.deepEqual(deriveActiveAgents(artifacts, readyBuckets), ["bmc"]);

  artifacts.bmc = completeArtifact("bmc");
  assert.deepEqual(deriveActiveAgents(artifacts, readyBuckets), ["bmc", "industrymap", "jtbd", "sevens"]);

  artifacts.industrymap = completeArtifact("industrymap");
  artifacts.fiveforces = completeArtifact("fiveforces");
  artifacts.pestle = completeArtifact("pestle");
  artifacts.vrio = completeArtifact("vrio");
  artifacts.jtbd = completeArtifact("jtbd");
  artifacts.sevens = completeArtifact("sevens");
  assert.deepEqual(deriveActiveAgents(artifacts, readyBuckets), [
    "bmc", "industrymap", "fiveforces", "pestle", "swot", "vrio", "blueocean", "jtbd", "vpc", "sevens",
  ]);
});

test("validated readiness is bound to the framework-map slot", () => {
  const misplaced = completeArtifact("fiveforces");
  assert.equal(artifactIsComplete(misplaced, "bmc"), false);
  assert.deepEqual(deriveActiveAgents({ bmc: misplaced }, readyBuckets), ["bmc"]);
});

test("Business Model Canvas stays locked until the required URL + paragraph bucket is loaded", () => {
  assert.deepEqual(deriveActiveAgents({}, {}), []);
  assert.deepEqual(deriveActiveAgents({}, { biz: "just a sentence with no url" }), []);
  assert.deepEqual(deriveActiveAgents({}, readyBuckets), ["bmc"]);
});

test("every bucket mutation invalidates all agents that receive shared context", () => {
  for (const source of INTAKE) {
    assert.deepEqual(getBucketAffectedFrameworks(source.key), ORDER, source.key);
  }
  assert.deepEqual(getBucketAffectedFrameworks("unknown"), []);
});

test("needs_input preserves complete, stale, and legacy current artifacts", () => {
  const complete = completeBmcArtifact();
  const stale = { ...complete, status: "stale" };
  const legacy = {
    frameworkId: "bmc",
    status: "legacy",
    payload: { legacyText: "Original plain-text canvas" },
  };

  assert.equal(shouldReplaceCurrentArtifact(complete, "needs_input", "bmc"), false);
  assert.equal(shouldReplaceCurrentArtifact(stale, "needs_input", "bmc"), false);
  assert.equal(shouldReplaceCurrentArtifact(legacy, "needs_input", "bmc"), false);
  assert.equal(shouldReplaceCurrentArtifact({ ...legacy, frameworkId: "fiveforces" }, "needs_input", "bmc"), true);
  assert.equal(shouldReplaceCurrentArtifact(null, "needs_input", "bmc"), true);
  assert.equal(shouldReplaceCurrentArtifact({ frameworkId: "bmc", status: "needs_input" }, "needs_input", "bmc"), true);
  assert.equal(shouldReplaceCurrentArtifact(legacy, "complete", "bmc"), true);
});

test("context snapshots preserve full evidence and exact direct upstream revisions", () => {
  const longEvidence = "x".repeat(12_000);
  const upstream = { ...completeArtifact("bmc"), revision: 3, summary: "Current business model" };
  upstream.payload.boxes.valuePropositions = [{ ...claim("Grounded offer"), evidenceRefs: ["x"] }];
  const snapshot = buildContextSnapshot(
    "fiveforces",
    { biz: longEvidence, market: "Competitor A" },
    { bmc: upstream },
    "Create Five Forces",
  );

  assert.equal(snapshot.buckets.find(item => item.key === "biz").content.length, 12_000);
  assert.equal(snapshot.manifest.truncationApplied, false);
  assert.deepEqual(snapshot.manifest.omissions, []);
  assert.equal(snapshot.directArtifacts.length, 1);
  assert.equal(snapshot.directArtifacts[0].revision, 3);
  assert.match(snapshot.trustBoundary, /untrusted evidence/i);
});

test("chat answers travel as authoritative clarifications and change the input fingerprint", () => {
  const chats = {
    bmc: [
      { role: "assistant", content: "Which segment pays the bills?" },
      { role: "user", content: "Mid-market manufacturers are 80% of revenue." },
      { role: "user", content: "" },
      { sys: true, content: "system notice" },
    ],
    industrymap: [{ role: "user", content: "We only sell in North America." }],
  };
  const withChats = buildContextSnapshot("fiveforces", { biz: "desc" }, {}, "Run it", chats);
  assert.equal(withChats.userClarifications.length, 2);
  assert.equal(withChats.userClarifications[0].statement, "Mid-market manufacturers are 80% of revenue.");
  assert.equal(withChats.manifest.clarificationCount, 2);
  assert.match(withChats.trustBoundary, /first-party/);

  const withoutChats = buildContextSnapshot("fiveforces", { biz: "desc" }, {}, "Run it");
  assert.equal(withoutChats.userClarifications.length, 0);
  assert.notEqual(withChats.inputFingerprint, withoutChats.inputFingerprint);
});

test("a needs_input follow-up snapshot carries prior questions and the run direction", () => {
  const prior = {
    frameworkId: "ansoff",
    status: "needs_input",
    nextQuestions: [
      "What is current market share in the beachhead segment?",
      "What capacity is available for a penetration push?",
    ],
  };
  const first = buildContextSnapshot("ansoff", { biz: "desc" }, { ansoff: prior }, "");
  assert.deepEqual(first.priorQuestions, prior.nextQuestions);
  assert.equal(first.manifest.priorQuestionCount, 2);
  assert.equal(first.userClarifications.length, 0);

  const directed = buildContextSnapshot(
    "ansoff",
    { biz: "desc" },
    { ansoff: prior },
    `Read the saved context, research the company, and create the Ansoff Matrix.\n\nAdditional direction: ${ANSOFF_IGNORE_ANSWER_DIRECTION}`,
  );
  assert.deepEqual(directed.priorQuestions, prior.nextQuestions);
  assert.equal(directed.userClarifications.length, 1);
  assert.equal(directed.userClarifications[0].statement, ANSOFF_IGNORE_ANSWER_DIRECTION);
  assert.equal(directed.userClarifications[0].agent, "The Route Setter");
  assert.notEqual(first.inputFingerprint, directed.inputFingerprint);

  const emptyFirst = buildContextSnapshot("ansoff", { biz: "desc" }, {}, ANSOFF_IGNORE_ANSWER_DIRECTION);
  assert.deepEqual(emptyFirst.priorQuestions, []);
  assert.equal(emptyFirst.userClarifications.length, 0);
});

test("stale propagation reaches every transitive descendant and snapshots preserve legacy text", () => {
  assert.deepEqual(getAffectedFrameworks(["bmc"], false), ORDER.filter(key => key !== "bmc"));
  assert.deepEqual(getAffectedFrameworks(["jtbd"], false), ["vpc", "kano", "bsc", "toc", "raci"]);

  const snapshot = buildContextSnapshot("bmc", {}, {
    bmc: {
      frameworkId: "bmc",
      status: "legacy",
      title: "Legacy output",
      summary: "The complete original plain-text canvas",
      payload: { legacyText: "The complete original plain-text canvas" },
    },
  });
  assert.equal(snapshot.manifest.legacyArtifactCount, 1);
  assert.equal(snapshot.legacyArtifacts[0].content, "The complete original plain-text canvas");
});

test("top-level grounded claims resolve evidence and duplicate evidence ids are rejected", () => {
  const artifact = completeBmcArtifact();
  artifact.assumptions = [{ ...claim("Assumed procurement window"), evidenceRefs: ["MISSING-ASSUMPTION"] }];
  artifact.gaps = [{ ...claim("Unknown renewal terms"), evidenceRefs: ["MISSING-GAP"] }];

  const unresolved = validateFrameworkArtifact(artifact, "bmc", { requireContent: true });
  assert.equal(unresolved.valid, false);
  assert.ok(unresolved.errors.some(error => error.includes("MISSING-ASSUMPTION")));
  assert.ok(unresolved.errors.some(error => error.includes("MISSING-GAP")));

  artifact.assumptions = [claim("Assumed procurement window")];
  artifact.gaps = [claim("Unknown renewal terms")];
  artifact.evidence = [evidence, { ...evidence, title: "Duplicate evidence entry" }];
  const duplicate = validateFrameworkArtifact(artifact, "bmc", { requireContent: true });
  assert.equal(duplicate.valid, false);
  assert.ok(duplicate.errors.some(error => error.includes("Evidence id E1 is duplicated")));
});

test("RACI renders its canonical Roles section as the default selectable region", () => {
  const artifact = completeArtifact("raci");
  artifact.payload.roles[0].name = "Morgan";
  artifact.payload.workItems.push({
    ...structuredClone(artifact.payload.workItems[0]),
    id: "work-2",
    name: "Second governed work item",
  });
  const html = renderToStaticMarkup(
    React.createElement(FrameworkArtifact, { artifact, frameworkId: "raci", onSelect: () => {} }),
  );
  assert.match(html, /aria-label="Open Roles"/);
  assert.match(html, /aria-pressed="true"/);
  assert.ok(html.includes("Morgan"));

  const workMatrixHtml = renderToStaticMarkup(
    React.createElement(FrameworkArtifact, {
      artifact,
      frameworkId: "raci",
      selectedSectionId: "workItems",
      onSelect: () => {},
    }),
  );
  assert.doesNotMatch(workMatrixHtml, /<tr[^>]*role="button"/);
  assert.equal((workMatrixHtml.match(/aria-selected="true"/g) || []).length, 0);
  assert.equal((workMatrixHtml.match(/aria-selected="false"/g) || []).length, 2);
});

test("Industry Map is four bands on one 12-column grid, not a 2-col masonry", () => {
  const artifact = completeArtifact("industrymap");
  artifact.payload.map.players = [
    { name: "AppDirect", position: "leader", revenue: null, marketShare: null, growth: null, geography: null, basis: "known", confidence: "high", evidenceRefs: ["E1"] },
    { name: "Stripe", position: "entrant", revenue: null, marketShare: null, growth: null, geography: null, url: "https://stripe.com", basis: "known", confidence: "high", evidenceRefs: ["E1"] },
  ];
  artifact.evidence = [{
    id: "E1",
    kind: "web",
    title: "AppDirect",
    sourceKey: null,
    artifactRevision: null,
    messageId: null,
    url: "https://www.appdirect.com",
    retrievedAt: null,
  }];
  const html = renderToStaticMarkup(
    React.createElement(FrameworkArtifact, { artifact, frameworkId: "industrymap", brief: true, onSelect: () => {} }),
  );
  assert.match(html, /industry-map/);
  assert.equal((html.match(/industry-map-band /g) || []).length, 4);
  assert.match(html, /industry-map-band-label">Terrain</);
  assert.match(html, /industry-map-band-label">Players</);
  assert.match(html, /industry-map-band-label">Flows</);
  assert.match(html, /industry-map-band-label">Time</);
  assert.match(html, /industry-map-terrain/);
  assert.match(html, /industry-map-players/);
  assert.match(html, /industry-map-flows/);
  assert.match(html, /industry-map-time/);
  assert.match(html, /industry-map-players-strip/);
  assert.match(html, /player-chip/);
  assert.doesNotMatch(html, /industry-map-players-strip[^>]*artifact-findings/);
  assert.doesNotMatch(html, /grid2/);
  assert.match(html, /href="https:\/\/stripe\.com\/?"/);
  assert.match(html, /href="https:\/\/www\.appdirect\.com\/?"/);
  assert.doesNotMatch(html, /href="https:\/\/appdirect\.com"/);
});

test("industry map players may omit url and still validate", () => {
  const artifact = completeArtifact("industrymap");
  artifact.payload.map.players = [{
    name: "AppDirect",
    position: "leader",
    revenue: null,
    marketShare: null,
    growth: null,
    geography: null,
    basis: "known",
    confidence: "high",
    evidenceRefs: ["E1"],
  }];
  const result = validateFrameworkArtifact(artifact, "industrymap", { requireContent: false });
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("a player without a url and without a matching evidence title stays plain text", () => {
  const artifact = completeArtifact("industrymap");
  artifact.payload.map.players = [
    { name: "AppDirect", position: "leader", revenue: null, marketShare: null, growth: null, geography: null, basis: "known", confidence: "high", evidenceRefs: [] },
  ];
  const html = renderToStaticMarkup(
    React.createElement(FrameworkArtifact, { artifact, frameworkId: "industrymap", brief: true, onSelect: () => {} }),
  );
  assert.match(html, /AppDirect/);
  assert.doesNotMatch(html, /href=/);
  assert.doesNotMatch(html, /appdirect\.com/i);
});

test("brief BMC keeps the nine-box and drops handbook chrome", () => {
  const artifact = completeBmcArtifact();
  artifact.gaps = [claim("Unknown renewal terms")];
  const html = renderToStaticMarkup(
    React.createElement(FrameworkArtifact, { artifact, frameworkId: "bmc", brief: true, onSelect: () => {} }),
  );
  assert.match(html, /bmc-grid/);
  assert.match(html, /bmc-kp/);
  assert.match(html, /bmc-vp/);
  assert.doesNotMatch(html, /Structured framework/);
  assert.doesNotMatch(html, /Current position/);
  assert.doesNotMatch(html, /Gaps/);
  assert.doesNotMatch(html, /Evidence used/);
});

test("currentConstraintLine reads ToC payload.constraint.text and is blank without it", () => {
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
    currentConstraintLine(toc),
    "Wholesale quotes bottleneck through the founder.",
  );
  assert.equal(currentConstraintLine(null), "");
  assert.equal(currentConstraintLine(undefined), "");
  assert.equal(currentConstraintLine(createFrameworkArtifact("toc")), "");
  assert.equal(currentConstraintLine(createFrameworkArtifact("bmc")), "");
  assert.equal(currentConstraintLine({
    frameworkId: "toc",
    payload: { constraint: { text: "   " } },
  }), "");
});
