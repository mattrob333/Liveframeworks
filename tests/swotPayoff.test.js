import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createFrameworkArtifact } from "../lib/frameworkArtifacts.js";
import { formatBizIntake } from "../lib/intake.js";
import { engagementMeta } from "../lib/exportBrief.js";
import FrameworkArtifact from "../components/FrameworkArtifact.jsx";
import ExportBrief from "../components/ExportBrief.jsx";
import ExportPrintDocument from "../components/ExportPrintDocument.jsx";

const ARTIFACT = readFileSync("components/FrameworkArtifact.jsx", "utf8");
const CSS = readFileSync("app/globals.css", "utf8");
const PRINT = readFileSync("components/ExportPrintDocument.jsx", "utf8");

const INVENTED = [
  "Invent a new channel",
  "Hire a sales team",
  "Enter a second city",
  "Cut prices",
  "Title:",
];

function claim(text) {
  return { text, basis: "known", confidence: "high", evidenceRefs: ["E1"] };
}

function filledSwot(overrides = {}) {
  return createFrameworkArtifact("swot", {
    status: "complete",
    payload: {
      quadrants: {
        strengths: [claim("Roast quality wins on taste")],
        weaknesses: [claim("Founder-mediated wholesale queue")],
        opportunities: [claim("Northgate distributor pilot")],
        threats: [claim("Rivals quote in three days")],
      },
      tows: {
        so: [claim("Pitch Northgate once a quote SLA exists")],
        st: [claim("Adopt a wholesale portal against faster rivals")],
        wo: [claim("Assign a wholesale owner for the waitlist")],
        wt: [claim("Cap new wholesale intake until throughput is fixed")],
      },
    },
    ...overrides,
  });
}

function renderSwot(artifact, extras = {}) {
  return renderToStaticMarkup(React.createElement(FrameworkArtifact, {
    artifact,
    frameworkId: "swot",
    brief: true,
    onSelect: () => {},
    ...extras,
  }));
}

function cellBlock(html, id) {
  const marker = `swot-cell swot-${id}`;
  const start = html.indexOf(marker);
  assert.ok(start >= 0, `missing cell ${id}`);
  const next = html.indexOf("swot-cell swot-", start + marker.length);
  const end = next > start ? next : html.length;
  return html.slice(start, end);
}

test("filled SWOT reads as two 2×2 frames from payload fields, not two lists", () => {
  const html = renderSwot(filledSwot());

  assert.match(html, /swot-matrix/);
  assert.match(html, /swot-quadrants/);
  assert.match(html, /swot-tows/);
  assert.match(html, /aria-label="SWOT"/);
  assert.match(html, /aria-label="TOWS"/);
  assert.doesNotMatch(html, /grid2/);
  assert.doesNotMatch(html, /artifact-sections/);
  assert.doesNotMatch(html, /ansoff-matrix/);

  assert.match(html, /Helpful/);
  assert.match(html, /Harmful/);
  assert.match(html, /Internal/);
  assert.match(html, /External/);
  assert.match(CSS, /\.swot-axis\{[^}]*color:var\(--line\)/);
  assert.doesNotMatch(CSS, /\.swot-axis\{[^}]*color:var\(--amber\)/);

  const quadrantOrder = [
    html.indexOf("Open Strengths"),
    html.indexOf("Open Weaknesses"),
    html.indexOf("Open Opportunities"),
    html.indexOf("Open Threats"),
  ];
  assert.ok(quadrantOrder.every(index => index >= 0), "all four SWOT quadrants are present");
  assert.deepEqual(quadrantOrder, [...quadrantOrder].sort((a, b) => a - b));

  const towsOrder = [
    html.indexOf("Open SO Strategies"),
    html.indexOf("Open WO Strategies"),
    html.indexOf("Open ST Strategies"),
    html.indexOf("Open WT Strategies"),
  ];
  assert.ok(towsOrder.every(index => index >= 0), "all four TOWS cells are present");
  assert.deepEqual(towsOrder, [...towsOrder].sort((a, b) => a - b));
  assert.ok(quadrantOrder[3] < towsOrder[0], "TOWS cross follows the SWOT quadrants");

  assert.match(cellBlock(html, "strengths"), /Roast quality wins on taste/);
  assert.match(cellBlock(html, "weaknesses"), /Founder-mediated wholesale queue/);
  assert.match(cellBlock(html, "opportunities"), /Northgate distributor pilot/);
  assert.match(cellBlock(html, "threats"), /Rivals quote in three days/);
  assert.match(cellBlock(html, "so"), /Pitch Northgate once a quote SLA exists/);
  assert.match(cellBlock(html, "wo"), /Assign a wholesale owner for the waitlist/);
  assert.match(cellBlock(html, "st"), /Adopt a wholesale portal against faster rivals/);
  assert.match(cellBlock(html, "wt"), /Cap new wholesale intake until throughput is fixed/);

  assert.doesNotMatch(html, /<b>Title:<\/b>/);
  assert.match(ARTIFACT, /payload\.quadrants\.\*/);
  assert.match(ARTIFACT, /payload\.tows\.\*/);
});

test("empty or missing SWOT quadrants and TOWS stay empty — no invented cells", () => {
  const emptyHtml = renderSwot(createFrameworkArtifact("swot"));
  assert.match(emptyHtml, /swot-matrix/);
  assert.match(emptyHtml, /swot-quadrants/);
  assert.match(emptyHtml, /swot-tows/);
  assert.equal((emptyHtml.match(/Open Strengths|Open Weaknesses|Open Opportunities|Open Threats/g) || []).length, 4);
  assert.equal((emptyHtml.match(/Open SO Strategies|Open ST Strategies|Open WO Strategies|Open WT Strategies/g) || []).length, 4);
  assert.ok((emptyHtml.match(/No supported finding yet/g) || []).length >= 8);
  for (const banned of INVENTED) {
    assert.equal(emptyHtml.includes(banned), false, `invented cell leaked: ${banned}`);
  }

  const missingHtml = renderSwot(createFrameworkArtifact("swot", { payload: {} }));
  assert.match(cellBlock(missingHtml, "strengths"), /No supported finding yet/);
  assert.match(cellBlock(missingHtml, "weaknesses"), /No supported finding yet/);
  assert.match(cellBlock(missingHtml, "opportunities"), /No supported finding yet/);
  assert.match(cellBlock(missingHtml, "threats"), /No supported finding yet/);
  assert.match(cellBlock(missingHtml, "so"), /No supported finding yet/);
  assert.match(cellBlock(missingHtml, "st"), /No supported finding yet/);
  assert.match(cellBlock(missingHtml, "wo"), /No supported finding yet/);
  assert.match(cellBlock(missingHtml, "wt"), /No supported finding yet/);
  for (const banned of ["Roast quality wins on taste", "Pitch Northgate", "Assign a wholesale owner"]) {
    assert.equal(missingHtml.includes(banned), false, `invented SWOT copy: ${banned}`);
  }

  const partialHtml = renderSwot(createFrameworkArtifact("swot", {
    payload: {
      quadrants: {
        strengths: [claim("Only this cell")],
      },
    },
  }));
  assert.match(cellBlock(partialHtml, "strengths"), /Only this cell/);
  assert.match(cellBlock(partialHtml, "weaknesses"), /No supported finding yet/);
  assert.match(cellBlock(partialHtml, "opportunities"), /No supported finding yet/);
  assert.match(cellBlock(partialHtml, "threats"), /No supported finding yet/);
  assert.match(cellBlock(partialHtml, "so"), /No supported finding yet/);
  assert.doesNotMatch(partialHtml, /Roast quality wins on taste/);
  assert.doesNotMatch(partialHtml, /<b>Title:<\/b>/);
});

test("/export screen SWOT stays two 2×2 frames, not artifact-sections", () => {
  const html = renderToStaticMarkup(React.createElement(ExportBrief, {
    meta: engagementMeta({
      biz: formatBizIntake({
        url: "https://driftline.example",
        paragraph: "Small-batch coffee.",
      }),
    }),
    generatedAt: "2026-08-14T12:00:00.000Z",
    completeIds: ["swot"],
    artifacts: { swot: filledSwot() },
  }));
  assert.match(html, /swot-matrix/);
  assert.match(html, /swot-quadrants/);
  assert.match(html, /swot-tows/);
  assert.match(html, /Open Strengths/);
  assert.match(html, /Open SO Strategies/);
  assert.match(html, /Roast quality wins on taste/);
  assert.doesNotMatch(html, /artifact-sections/);
  assert.doesNotMatch(html, /grid2/);
});

test("print SWOT is four quadrant headings then the TOWS cross, not two lists", () => {
  const html = renderToStaticMarkup(React.createElement(ExportPrintDocument, {
    meta: engagementMeta({
      biz: formatBizIntake({
        url: "https://driftline.example",
        paragraph: "Small-batch coffee.",
      }),
    }),
    generatedAt: "2026-08-14T12:00:00.000Z",
    completeIds: ["swot"],
    artifacts: { swot: filledSwot() },
  }));
  const headings = [...html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map(match => match[1]);
  assert.deepEqual(headings, [
    "Strengths",
    "Weaknesses",
    "Opportunities",
    "Threats",
    "SO Strategies",
    "ST Strategies",
    "WO Strategies",
    "WT Strategies",
  ]);
  assert.match(html, /<h2[^>]*>SWOT/);
  assert.match(html, /Roast quality wins on taste/);
  assert.match(html, /Pitch Northgate once a quote SLA exists/);
  assert.doesNotMatch(html, /swot-matrix/);
  assert.doesNotMatch(html, /artifact-sections/);
  assert.doesNotMatch(html, /grid2/);
  assert.match(PRINT, /SWOT_PRINT_ORDER/);
});
