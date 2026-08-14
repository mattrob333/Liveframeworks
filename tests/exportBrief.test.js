import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FW, INTAKE, ORDER } from "../lib/frameworks.js";
import { createFrameworkArtifact, getArtifactJsonSchema } from "../lib/frameworkArtifacts.js";
import { formatBizIntake } from "../lib/intake.js";
import {
  agentDownloadName,
  buildAgentMarkdown,
  coverageLine,
  engagementMeta,
  flattenFrameworkMarkdown,
  formatBriefDate,
  listCompleteFrameworks,
} from "../lib/exportBrief.js";
import ExportBrief from "../components/ExportBrief.jsx";

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

function completeBmcArtifact() {
  return createFrameworkArtifact("bmc", {
    status: "complete",
    title: "Example BMC",
    summary: "A grounded nine-box business model.",
    generatedAt: "2026-08-11T00:00:00.000Z",
    evidence: [evidence],
    gaps: [claim("Unknown renewal terms")],
    assumptions: [claim("Buyers already have a compliance owner")],
    nextQuestions: ["Who signs the annual attestation?"],
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

function assertNoJsonDump(text) {
  assert.doesNotMatch(text, /```json/);
  assert.doesNotMatch(text, /"keyPartners"/);
  assert.doesNotMatch(text, /"basis":/);
  assert.doesNotMatch(text, /"schemaVersion"/);
}

test("agent markdown flattens a complete BMC and skips the rest of the roster", () => {
  const markdown = buildAgentMarkdown({
    buckets: { biz: READY_BIZ },
    artifacts: { bmc: completeBmcArtifact() },
    generatedAt: "2026-08-14T12:00:00.000Z",
  });

  assert.match(markdown, /^# example\.com/m);
  assert.match(markdown, /We sell compliance software/);
  assert.match(markdown, /Company: https:\/\/example\.com\//);
  assert.match(markdown, /Generated: 2026-08-14T12:00:00.000Z/);
  assert.match(markdown, /## Evidence/);
  assert.match(markdown, /### Business description & URL/);
  assert.match(markdown, /## Business Model Canvas/);
  assert.match(markdown, /### Key Partnerships/);
  assert.match(markdown, /- Cloud infrastructure partners/);
  assert.match(markdown, /### Gaps/);
  assert.match(markdown, /- Unknown renewal terms/);
  assert.match(markdown, /### Assumptions/);
  assert.match(markdown, /### Next questions/);
  assert.match(markdown, /### Sources/);
  assert.match(markdown, /## Coverage/);
  assert.match(markdown, /Complete: 1 of 16 frameworks/);
  assert.match(markdown, /Done: Business Model Canvas/);
  assert.match(markdown, /Not complete: Industry Map/);
  assert.doesNotMatch(markdown, /## SWOT/);
  assert.doesNotMatch(markdown, /## Porter's Five Forces/);
  assertNoJsonDump(markdown);
});

test("incomplete frameworks are omitted from the agent file and the brief roster", () => {
  const incomplete = createFrameworkArtifact("swot", { status: "ready", summary: "Draft only." });
  const artifacts = { bmc: completeBmcArtifact(), swot: incomplete };
  assert.deepEqual(listCompleteFrameworks(artifacts), ["bmc"]);

  const markdown = flattenFrameworkMarkdown("bmc", artifacts.bmc);
  assert.match(markdown, /## Business Model Canvas/);
  assert.match(markdown, /### Value Propositions/);
  assert.match(markdown, /- Reduce compliance overhead/);
  assertNoJsonDump(markdown);
});

test("coverage and download name stay quiet and human", () => {
  assert.equal(coverageLine(1, 1), "1 of 4 evidence · 1 of 16 frameworks");
  assert.equal(INTAKE.length, 4);
  assert.equal(ORDER.length, 16);
  assert.equal(formatBriefDate("2026-08-14T12:00:00.000Z"), "14 August 2026");
  assert.equal(agentDownloadName({ company: "example.com" }), "example.com-brief.md");
  assert.equal(agentDownloadName({}), "liveframeworks-brief.md");
  const meta = engagementMeta({ biz: READY_BIZ });
  assert.equal(meta.title, "example.com");
  assert.equal(meta.paragraph, "We sell compliance software to mid-market operations teams.");
});

test("HTML brief prints only the completed BMC — no empty roster slots", () => {
  const artifact = completeBmcArtifact();
  const html = renderToStaticMarkup(
    React.createElement(ExportBrief, {
      meta: engagementMeta({ biz: READY_BIZ }),
      generatedAt: "2026-08-14T12:00:00.000Z",
      completeIds: ["bmc"],
      artifacts: { bmc: artifact },
    }),
  );

  assert.match(html, /example\.com/);
  assert.match(html, /14 August 2026/);
  assert.match(html, /We sell compliance software/);
  assert.match(html, /bmc-grid/);
  assert.match(html, /bmc-kp/);
  assert.match(html, /bmc-vp/);
  assert.match(html, /A grounded nine-box business model/);
  assert.doesNotMatch(html, /<h2[^>]*>Business Model Canvas/);
  assert.doesNotMatch(html, /Industry Map/);
  assert.doesNotMatch(html, /SWOT/);
  assert.doesNotMatch(html, /The Cartographer/);
  assert.doesNotMatch(html, /LiveFrameworks engagement/);
  assert.doesNotMatch(html, /```json/);
  ORDER.filter(id => id !== "bmc").forEach(id => {
    assert.doesNotMatch(html, new RegExp(`<h2[^>]*>${FW[id].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  });
});

test("without an intake paragraph the brief is company and date — no engagement stub", () => {
  const html = renderToStaticMarkup(
    React.createElement(ExportBrief, {
      meta: { title: "LiveFrameworks", company: "", url: "", paragraph: "" },
      generatedAt: "2026-08-14T12:00:00.000Z",
      completeIds: ["bmc"],
      artifacts: { bmc: completeBmcArtifact() },
    }),
  );

  assert.match(html, /LiveFrameworks/);
  assert.match(html, /14 August 2026/);
  assert.match(html, /bmc-grid/);
  assert.doesNotMatch(html, /LiveFrameworks engagement/);
  assert.doesNotMatch(html, /export-engagement/);
});

test("a second completed framework becomes a titled section, still no empty slots", () => {
  const html = renderToStaticMarkup(
    React.createElement(ExportBrief, {
      meta: engagementMeta({ biz: READY_BIZ }),
      generatedAt: "2026-08-14T12:00:00.000Z",
      completeIds: ["bmc", "industrymap"],
      artifacts: {
        bmc: completeBmcArtifact(),
        industrymap: completeArtifact("industrymap"),
      },
    }),
  );

  assert.match(html, /bmc-grid/);
  assert.match(html, /Industry Map/);
  assert.doesNotMatch(html, /SWOT/);
  assert.doesNotMatch(html, /RACI/);
  assertNoJsonDump(html);
});

test("print CSS hides nav, export chrome, and the site footer", () => {
  const cssPath = fileURLToPath(new URL("../app/globals.css", import.meta.url));
  const print = readFileSync(cssPath, "utf8").split("@media print")[1] || "";
  assert.match(print, /\.topnav/);
  assert.match(print, /\.export-chrome/);
  assert.match(print, /footer/);
  assert.match(print, /display:\s*none/);
  assert.match(print, /size:\s*landscape/);
  assert.match(print, /width:\s*100%/);
  assert.match(print, /10% 10% 10% 10% 10% 10% 10% 10% 10% 10%/);
});
