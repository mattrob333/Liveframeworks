import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ORDER } from "../lib/frameworks.js";
import {
  createFrameworkArtifact,
  firstFeedsForwardClaim,
  getArtifactJsonSchema,
  normalizeFrameworkArtifact,
  objectSchema,
  validateFrameworkArtifact,
} from "../lib/frameworkArtifacts.js";
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

function oldBmcArtifact() {
  return {
    schemaVersion: 1,
    frameworkId: "bmc",
    revision: 1,
    title: "Example BMC",
    summary: "A grounded nine-box business model.",
    generatedAt: "2026-08-11T00:00:00.000Z",
    evidence: [evidence],
    assumptions: [],
    gaps: [],
    nextQuestions: [],
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
  };
}

function oldIndustryMapArtifact() {
  return {
    schemaVersion: 1,
    frameworkId: "industrymap",
    revision: 1,
    title: "Industry Map",
    summary: "Pre-1c map with no verdict or logos.",
    generatedAt: "2026-08-11T00:00:00.000Z",
    evidence: [evidence],
    assumptions: [],
    gaps: [],
    nextQuestions: [],
    payload: {
      map: {
        segments: [claim("Emergency repair")],
        glossary: [claim("Roll-up")],
        expertsAndSources: [claim("Trade press")],
        players: [{
          name: "AppDirect",
          position: "leader",
          revenue: null,
          marketShare: null,
          growth: null,
          geography: null,
          basis: "known",
          confidence: "high",
          evidenceRefs: ["E1"],
        }],
        technologyFlows: [claim("AI answering")],
        economicFlows: [claim("Missed calls cost revenue")],
        personnelFlows: [claim("Technicians move with roll-ups")],
        history: [claim("Founded from a box truck")],
        future: [claim("Consolidation continues")],
      },
    },
  };
}

function listDemoFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) listDemoFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

test("objectSchema marks listed keys optional and keeps the rest required", () => {
  const schema = objectSchema({
    name: { type: "string" },
    url: { type: "string" },
  }, { optional: ["url"] });

  assert.deepEqual(schema.required, ["name"]);
  assert.equal(schema.additionalProperties, false);
  assert.ok(schema.properties.url);

  const missingRequired = [];
  const missingOptional = [];
  const validate = (value, errors) => {
    (schema.required || []).forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(value, key)) errors.push(`${key} is required.`);
    });
  };
  validate({ url: "https://example.com" }, missingRequired);
  validate({ name: "Acme" }, missingOptional);
  assert.ok(missingRequired.some(error => error.includes("name")));
  assert.deepEqual(missingOptional, []);

  const explicit = objectSchema({
    name: { type: "string" },
    url: { type: "string" },
  }, { required: ["name"] });
  assert.deepEqual(explicit.required, ["name"]);
});

test("old demo and fixture artifacts normalize clean with no validation banner", () => {
  const demoRoot = path.join(process.cwd(), "demo-data");
  const demoFiles = listDemoFiles(demoRoot);
  const jsonArtifacts = demoFiles.filter(file => file.endsWith(".json"));
  assert.deepEqual(jsonArtifacts, [], "demo-data has no checked-in JSON artifacts; intake/brief files are not schema subjects");

  for (const frameworkId of ORDER) {
    const empty = createFrameworkArtifact(frameworkId);
    const emptyResult = validateFrameworkArtifact(empty, frameworkId, { requireContent: false });
    assert.equal(emptyResult.valid, true, `${frameworkId} empty: ${emptyResult.errors.join("; ")}`);

    const sampled = completeArtifact(frameworkId);
    const sampledResult = validateFrameworkArtifact(sampled, frameworkId, { requireContent: true });
    assert.equal(sampledResult.valid, true, `${frameworkId} sampled: ${sampledResult.errors.join("; ")}`);
    assert.equal(sampled.payload?.readout, undefined);
    assert.equal(sampled.payload?.map?.verdict, undefined);
  }

  const oldShapes = [oldBmcArtifact(), oldIndustryMapArtifact()];
  for (const artifact of oldShapes) {
    const result = validateFrameworkArtifact(artifact, artifact.frameworkId, { requireContent: true });
    assert.equal(result.valid, true, `${artifact.frameworkId} old shape: ${result.errors.join("; ")}`);
    const html = renderToStaticMarkup(
      React.createElement(FrameworkArtifact, { artifact, frameworkId: artifact.frameworkId, onSelect: () => {} }),
    );
    assert.doesNotMatch(html, /Showing the safe normalized view/);
    assert.doesNotMatch(html, /contract (issue was|issues were) detected/);
  }
});

test("new fields are optional and backfill to empty or undefined, never invented content", () => {
  const bmc = normalizeFrameworkArtifact(oldBmcArtifact(), "bmc");
  assert.equal(bmc.payload.readout, "");
  const bmcWithThesis = normalizeFrameworkArtifact({
    ...oldBmcArtifact(),
    payload: { ...oldBmcArtifact().payload, readout: "Wholesale still runs through one phone." },
  }, "bmc");
  assert.equal(bmcWithThesis.payload.readout, "Wholesale still runs through one phone.");

  const map = normalizeFrameworkArtifact(oldIndustryMapArtifact(), "industrymap");
  assert.equal(map.payload.map.verdict, undefined);
  assert.equal(map.payload.map.players[0].logoUrl, undefined);
  assert.equal(map.payload.map.players[0].logoStatus, undefined);
  assert.equal(map.payload.map.players[0].logoFetchedAt, undefined);
  assert.equal(map.payload.map.players[0].logoSource, undefined);
  assert.equal(map.payload.map.economicFlows[0].feedsForward, undefined);

  const withVerdict = normalizeFrameworkArtifact({
    ...oldIndustryMapArtifact(),
    payload: {
      ...oldIndustryMapArtifact().payload,
      map: {
        ...oldIndustryMapArtifact().payload.map,
        verdict: { headline: "Your territory is being bought." },
      },
    },
  }, "industrymap");
  assert.equal(withVerdict.payload.map.verdict.headline, "Your territory is being bought.");
  assert.equal(withVerdict.payload.map.verdict.subline, "");
  assert.deepEqual(withVerdict.payload.map.verdict.grounding, {
    basis: "missing",
    confidence: "low",
    evidenceRefs: [],
  });

  const playerWithLogo = {
    ...oldIndustryMapArtifact().payload.map.players[0],
    logoUrl: "https://cdn.example/a1.png",
    logoStatus: "ok",
    logoFetchedAt: "2026-08-16T00:00:00.000Z",
    logoSource: "favicon",
  };
  const withLogo = validateFrameworkArtifact({
    ...oldIndustryMapArtifact(),
    payload: {
      ...oldIndustryMapArtifact().payload,
      map: { ...oldIndustryMapArtifact().payload.map, players: [playerWithLogo] },
    },
  }, "industrymap", { requireContent: true });
  assert.equal(withLogo.valid, true, withLogo.errors.join("; "));
  assert.equal(withLogo.artifact.payload.map.players[0].logoUrl, "https://cdn.example/a1.png");
});

test("feedsForward keeps the first true claim and ignores later flags", () => {
  const first = { ...claim("Technology shift"), feedsForward: true };
  const second = { ...claim("Missed-call economics"), feedsForward: true };
  const artifact = {
    ...oldIndustryMapArtifact(),
    payload: {
      ...oldIndustryMapArtifact().payload,
      map: {
        ...oldIndustryMapArtifact().payload.map,
        technologyFlows: [first],
        economicFlows: [second],
      },
    },
  };

  assert.equal(firstFeedsForwardClaim(artifact), first);
  assert.equal(firstFeedsForwardClaim(oldIndustryMapArtifact()), null);
  assert.equal(firstFeedsForwardClaim({
    ...artifact,
    payload: {
      ...artifact.payload,
      map: {
        ...artifact.payload.map,
        technologyFlows: [{ ...claim("No lamp"), feedsForward: false }],
        economicFlows: [second],
      },
    },
  }), second);

  const allowed = validateFrameworkArtifact(artifact, "industrymap", { requireContent: true });
  assert.equal(allowed.valid, true, allowed.errors.join("; "));
});

test("generation prompts include the empty-fallback rule for readout and verdict", () => {
  const source = readFileSync("lib/server/frameworkRun.js", "utf8");
  assert.match(source, /EMPTY_THESIS_FALLBACK_RULE/);
  assert.match(source, /An absent thesis beats a hollow one/);
  assert.match(source, /Do not invent a thesis/);
  assert.match(source, /payload\.readout/);
  assert.match(source, /map\.verdict/);
  assert.match(source, /An absent thesis beats a hollow one\. If the evidence does not support a real thesis, omit the field or leave it empty\. Do not invent a thesis\./);
});
