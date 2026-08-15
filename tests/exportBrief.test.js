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
import ExportPrintDocument from "../components/ExportPrintDocument.jsx";

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

test("print CSS is a white letter document, not a canvas screenshot", () => {
  const cssPath = fileURLToPath(new URL("../app/globals.css", import.meta.url));
  const print = readFileSync(cssPath, "utf8").split("@media print")[1] || "";
  assert.match(print, /\.topnav/);
  assert.match(print, /\.export-chrome/);
  assert.match(print, /footer/);
  assert.match(print, /\.export-brief\{display:none/);
  assert.match(print, /size:\s*letter/);
  assert.match(print, /margin:\s*\.75in/);
  assert.match(print, /background:#fff/);
  assert.doesNotMatch(print, /print-color-adjust/);
  assert.doesNotMatch(print, /landscape/);
  assert.doesNotMatch(print, /10% 10% 10%/);
  assert.doesNotMatch(print, /bmc-kp/);
  assert.doesNotMatch(print, /F4F0E6/);
  assert.match(print, /\.export-print-doc li\{[^}]*overflow-wrap:normal/);
  assert.match(print, /\.export-print-doc li\{[^}]*word-break:normal/);
  assert.match(print, /\.export-print-sec h3\{[^}]*overflow-wrap:normal/);
  assert.doesNotMatch(print, /overflow-wrap:break-word/);
  assert.doesNotMatch(print, /word-break:break-all/);
});

test("print document stacks BMC as headed sections, not a nine-box", () => {
  const html = renderToStaticMarkup(
    React.createElement(ExportPrintDocument, {
      meta: engagementMeta({ biz: READY_BIZ }),
      generatedAt: "2026-08-14T12:00:00.000Z",
      completeIds: ["bmc"],
      artifacts: { bmc: completeBmcArtifact() },
    }),
  );
  const headings = [...html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map(match => match[1]);
  assert.deepEqual(headings, [
    "Key Partnerships",
    "Key Activities",
    "Key Resources",
    "Value Propositions",
    "Customer Relationships",
    "Channels",
    "Customer Segments",
    "Cost Structure",
    "Revenue Streams",
  ]);
  assert.match(html, /<h2[^>]*>Business Model Canvas/);
  assert.match(html, /Cloud infrastructure partners/);
  assert.doesNotMatch(html, /bmc-grid/);
  assert.doesNotMatch(html, /bmc-kp/);
  assert.doesNotMatch(html, /No supported finding yet/);
  assert.doesNotMatch(html, /Terrain/);
  assert.doesNotMatch(html, /SWOT/);
});

test("print document lists Industry Map in four-band heading sequence", () => {
  const artifact = completeArtifact("industrymap");
  artifact.payload.map.players = [
    { name: "AppDirect", position: "leader", revenue: null, marketShare: null, growth: null, geography: null, basis: "known", confidence: "high", evidenceRefs: [] },
    { name: "Stripe", position: "entrant", revenue: null, marketShare: null, growth: null, geography: null, url: "https://stripe.com", basis: "known", confidence: "high", evidenceRefs: [] },
  ];
  const html = renderToStaticMarkup(
    React.createElement(ExportPrintDocument, {
      meta: engagementMeta({ biz: READY_BIZ }),
      generatedAt: "2026-08-14T12:00:00.000Z",
      completeIds: ["bmc", "industrymap"],
      artifacts: { bmc: completeBmcArtifact(), industrymap: artifact },
    }),
  );
  const headings = [...html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map(match => match[1].replace(/&amp;/g, "&"));
  const mapHeadings = headings.slice(9);
  assert.deepEqual(mapHeadings, [
    "Segments & Suppliers",
    "Glossary",
    "Experts & Key Sources",
    "Market Leaders & New Entrants",
    "Technology Flows",
    "Economic Flows",
    "Personnel Flows",
    "How It Looked 5-10 Years Ago",
    "The Five-Year Map",
  ]);
  assert.doesNotMatch(html, />Terrain</);
  assert.doesNotMatch(html, />Players</);
  assert.doesNotMatch(html, />Flows</);
  assert.doesNotMatch(html, />Time</);
  assert.doesNotMatch(html, /industry-map/);
  assert.doesNotMatch(html, /player-chip/);
  assert.match(html, /href="https:\/\/stripe\.com\/?"/);
  assert.doesNotMatch(html, /href="https:\/\/appdirect\.com"/);
});

function tocWithConstraint(text) {
  return createFrameworkArtifact("toc", {
    status: "complete",
    payload: {
      constraint: {
        text,
        type: "capacity",
        location: "Founder desk",
        throughputMetric: "quotes per week",
        basis: "known",
        confidence: "high",
        evidenceRefs: [],
      },
    },
  });
}

test("ToC constraint is one line on the on-screen brief lede; no ToC means no line", () => {
  const constraint = "Wholesale quotes bottleneck through the founder.";
  const withToc = renderToStaticMarkup(
    React.createElement(ExportBrief, {
      meta: engagementMeta({ biz: READY_BIZ }),
      generatedAt: "2026-08-14T12:00:00.000Z",
      completeIds: ["bmc"],
      artifacts: { bmc: completeBmcArtifact(), toc: tocWithConstraint(constraint) },
    }),
  );
  assert.match(withToc, /We sell compliance software/);
  assert.match(withToc, /export-constraint/);
  assert.match(withToc, /Wholesale quotes bottleneck through the founder\./);
  assert.doesNotMatch(withToc, /Today's limiting factor/);

  const withoutToc = renderToStaticMarkup(
    React.createElement(ExportBrief, {
      meta: engagementMeta({ biz: READY_BIZ }),
      generatedAt: "2026-08-14T12:00:00.000Z",
      completeIds: ["bmc"],
      artifacts: { bmc: completeBmcArtifact() },
    }),
  );
  assert.match(withoutToc, /We sell compliance software/);
  assert.doesNotMatch(withoutToc, /export-constraint/);
  assert.doesNotMatch(withoutToc, /Wholesale quotes bottleneck/);

  const emptyToc = renderToStaticMarkup(
    React.createElement(ExportBrief, {
      meta: engagementMeta({ biz: READY_BIZ }),
      generatedAt: "2026-08-14T12:00:00.000Z",
      completeIds: ["bmc"],
      artifacts: { bmc: completeBmcArtifact(), toc: createFrameworkArtifact("toc") },
    }),
  );
  assert.doesNotMatch(emptyToc, /export-constraint/);
});

test("print brief lede also carries the ToC constraint when present", () => {
  const constraint = "Wholesale quotes bottleneck through the founder.";
  const withToc = renderToStaticMarkup(
    React.createElement(ExportPrintDocument, {
      meta: engagementMeta({ biz: READY_BIZ }),
      generatedAt: "2026-08-14T12:00:00.000Z",
      completeIds: ["bmc"],
      artifacts: { bmc: completeBmcArtifact(), toc: tocWithConstraint(constraint) },
    }),
  );
  assert.match(withToc, /Wholesale quotes bottleneck through the founder\./);

  const withoutToc = renderToStaticMarkup(
    React.createElement(ExportPrintDocument, {
      meta: engagementMeta({ biz: READY_BIZ }),
      generatedAt: "2026-08-14T12:00:00.000Z",
      completeIds: ["bmc"],
      artifacts: { bmc: completeBmcArtifact() },
    }),
  );
  assert.doesNotMatch(withoutToc, /Wholesale quotes bottleneck/);
});
