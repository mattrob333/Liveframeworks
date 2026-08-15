import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createFrameworkArtifact } from "../lib/frameworkArtifacts.js";
import { formatBizIntake } from "../lib/intake.js";
import { engagementMeta } from "../lib/exportBrief.js";
import FrameworkArtifact from "../components/FrameworkArtifact.jsx";
import ExportBrief from "../components/ExportBrief.jsx";

const css = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");
const screenCss = css.split("@media print")[0];

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

const PILOT = {
  customerRelationships: "Wholesale accounts: high-touch, founder-dependent personal relationship that becomes unreliable at scale (unpredictable reorder response times, no visibility into order status).",
  keyActivities: "Wholesale sampling, quoting, and new-account approval — entirely founder-owned, undocumented, averaging 9 days to two weeks.",
  customerSegments: "26 independent café wholesale accounts, generating the largest revenue share (~45%), plus an inbound waitlist the business cannot process.",
  revenueStreams: "Events, pop-ups, and one-off retail sales ≈17% of annual revenue.",
};

function cssRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...screenCss.matchAll(new RegExp(`${escaped}(?![\\w-])\\{([^}]+)\\}`, "g"))];
  assert.ok(matches.length, `missing CSS rule ${selector}`);
  return matches.map(match => match[1]).join(";");
}

function mediaBlock(query) {
  const needle = `@media(${query})`;
  const blocks = [];
  let from = 0;
  while (from < screenCss.length) {
    const start = screenCss.indexOf(needle, from);
    if (start < 0) break;
    const open = screenCss.indexOf("{", start);
    let depth = 0;
    let end = -1;
    for (let i = open; i < screenCss.length; i += 1) {
      if (screenCss[i] === "{") depth += 1;
      if (screenCss[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) break;
    blocks.push(screenCss.slice(open + 1, end));
    from = end + 1;
  }
  assert.ok(blocks.length, `missing @media(${query})`);
  return blocks.join("\n");
}

function driftlineBmc() {
  return createFrameworkArtifact("bmc", {
    status: "complete",
    title: "Driftline BMC",
    summary: "A grounded nine-box business model.",
    generatedAt: "2026-08-11T00:00:00.000Z",
    evidence: [evidence],
    payload: {
      boxes: {
        keyPartners: [claim("Shopify and a packaging supplier")],
        keyActivities: [claim(PILOT.keyActivities)],
        keyResources: [claim("Two packers and the founder")],
        valuePropositions: [claim("Small-batch coffee for independent cafés")],
        customerRelationships: [claim(PILOT.customerRelationships)],
        channels: [claim("Shopify form and founder texts")],
        customerSegments: [claim(PILOT.customerSegments)],
        costStructure: [claim("Green coffee, packing, and founder time")],
        revenueStreams: [claim(PILOT.revenueStreams)],
      },
    },
  });
}

test("BMC nine-box columns can shrink so digest text wraps instead of clipping mid-word", () => {
  const grid = cssRule(".bmc-grid");
  assert.match(grid, /grid-template-columns:repeat\(10,minmax\(0,1fr\)\)/);
  assert.match(grid, /min-width:0/);
  assert.doesNotMatch(grid, /grid-template-columns:repeat\(10,1fr\)/);

  const cell = cssRule(".bmc-cell");
  assert.match(cell, /align-items:stretch/);
  assert.match(cell, /min-width:0/);
  assert.doesNotMatch(cell, /align-items:flex-start/);

  const body = cssRule(".bmc-cell .d");
  assert.match(body, /overflow-wrap:break-word/);
  assert.match(body, /word-break:normal/);
  assert.match(body, /min-width:0/);
  assert.doesNotMatch(body, /word-break:break-all/);

  const digest = cssRule(".artifact-digest");
  assert.match(digest, /min-width:0/);
  assert.match(digest, /width:100%/);

  const item = cssRule(".artifact-digest li");
  assert.match(item, /overflow-wrap:break-word/);
  assert.match(item, /word-break:normal/);
  assert.doesNotMatch(item, /word-break:break-all/);
});

test("BMC canvas rows may grow; overflow cannot slice a word at ~1280", () => {
  const canvas = cssRule(".framework-artifact-canvas");
  assert.match(canvas, /minmax\(210px,auto\) minmax\(210px,auto\) minmax\(180px,auto\)/);
  assert.doesNotMatch(canvas, /grid-template-rows:210px 210px 180px/);

  const canvasCell = cssRule(".framework-artifact-canvas .bmc-cell");
  assert.match(canvasCell, /overflow:visible/);
  assert.doesNotMatch(canvasCell, /overflow:hidden/);

  const body = cssRule(".bmc-cell .d");
  assert.match(body, /overflow:visible/);
  assert.doesNotMatch(body, /overflow:hidden/);
});

test("desktop ~1280 keeps the BMC nine-box; phones may stack at 800px", () => {
  assert.doesNotMatch(screenCss, /@media\(max-width:1280px\)/);
  const restack = mediaBlock("max-width:800px");
  assert.match(restack, /\.bmc-grid\{grid-template-columns:1fr 1fr/);
  assert.match(screenCss, /\.bmc-kp\{grid-column:1\/3;grid-row:1\/3\}/);
  assert.match(screenCss, /\.bmc-vp\{grid-column:5\/7;grid-row:1\/3\}/);
  assert.match(screenCss, /\.bmc-cs\{grid-column:9\/11;grid-row:1\/3\}/);
  assert.match(screenCss, /\.bmc-cost\{grid-column:1\/6;grid-row:3\/4\}/);
  assert.match(screenCss, /\.bmc-rev\{grid-column:6\/11;grid-row:3\/4\}/);
});

test("pilot BMC markup keeps the words that were clipping mid-word at ~1280", () => {
  const html = renderToStaticMarkup(
    React.createElement(FrameworkArtifact, {
      artifact: driftlineBmc(),
      frameworkId: "bmc",
      brief: true,
      onSelect: () => {},
    }),
  );
  assert.match(html, /bmc-grid/);
  assert.match(html, /framework-artifact-canvas/);
  assert.match(html, /bmc-kp/);
  assert.match(html, /bmc-cr/);
  assert.match(html, /bmc-cs/);
  assert.match(html, /bmc-rev/);
  assert.match(html, /Wholesale accounts: high-touch/);
  assert.match(html, /quoting/);
  assert.match(html, /26 independent/);
  assert.match(html, /one-off retail/);
  assert.doesNotMatch(html, /Wholesale accounts: high-(?![a-z])/);
  assert.doesNotMatch(html, /26 independen(?!t)/);
  assert.doesNotMatch(html, /one-off retai(?!l)/);
});

test("/export BMC stays a nine-box on screen", () => {
  const html = renderToStaticMarkup(
    React.createElement(ExportBrief, {
      meta: engagementMeta({
        biz: formatBizIntake({
          url: "https://driftline.example",
          paragraph: "Small-batch coffee.",
        }),
      }),
      generatedAt: "2026-08-14T12:00:00.000Z",
      completeIds: ["bmc"],
      artifacts: { bmc: driftlineBmc() },
    }),
  );
  assert.match(html, /bmc-grid/);
  assert.match(html, /framework-artifact-canvas/);
  assert.match(html, /bmc-kp/);
  assert.match(html, /bmc-vp/);
  assert.match(html, /bmc-cs/);
  assert.match(html, /Wholesale accounts: high-touch/);
  assert.match(html, /26 independent/);
  assert.match(html, /one-off retail/);
  assert.doesNotMatch(html, /grid2/);
});

test("Industry Map CSS is four stacked bands, not a flattened 3-up tile", () => {
  const map = cssRule(".industry-map");
  assert.match(map, /flex-direction:column/);
  assert.doesNotMatch(map, /grid-template-columns:repeat\(12/);
  assert.doesNotMatch(map, /repeat\(3,/);

  const band = cssRule(".industry-map-band");
  assert.match(band, /grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(band, /display:contents/);
  assert.doesNotMatch(band, /repeat\(3,/);

  const label = cssRule(".industry-map-band-label");
  assert.match(label, /grid-column:1\/-1/);

  const phone = mediaBlock("max-width:800px");
  assert.match(phone, /\.industry-map-band\{grid-template-columns:1fr\}/);
  assert.doesNotMatch(screenCss, /@media\(max-width:1280px\)/);
});

test("Industry Map markup is Terrain / Players / Flows / Time — nine cells, four bands", () => {
  const html = renderToStaticMarkup(
    React.createElement(FrameworkArtifact, {
      artifact: createFrameworkArtifact("industrymap"),
      frameworkId: "industrymap",
      brief: true,
      onSelect: () => {},
    }),
  );
  const bands = html.match(/industry-map-band /g) || [];
  assert.equal(bands.length, 4);
  assert.match(html, /industry-map-band-label">Terrain</);
  assert.match(html, /industry-map-band-label">Players</);
  assert.match(html, /industry-map-band-label">Flows</);
  assert.match(html, /industry-map-band-label">Time</);
  assert.match(html, /industry-map-terrain/);
  assert.match(html, /industry-map-players/);
  assert.match(html, /industry-map-flows/);
  assert.match(html, /industry-map-time/);
  assert.match(html, /industry-map-segments/);
  assert.match(html, /industry-map-glossary/);
  assert.match(html, /industry-map-expertsAndSources/);
  assert.match(html, /industry-map-technologyFlows/);
  assert.match(html, /industry-map-economicFlows/);
  assert.match(html, /industry-map-personnelFlows/);
  assert.match(html, /industry-map-history/);
  assert.match(html, /industry-map-future/);
  assert.doesNotMatch(html, /grid2/);
  assert.doesNotMatch(html, /artifact-sections/);
  assert.doesNotMatch(html, /artifact-force-map/);
});

test("/export Industry Map stays four bands; BMC stays a nine-box", () => {
  const html = renderToStaticMarkup(
    React.createElement(ExportBrief, {
      meta: engagementMeta({
        biz: formatBizIntake({
          url: "https://driftline.example",
          paragraph: "Small-batch coffee.",
        }),
      }),
      generatedAt: "2026-08-14T12:00:00.000Z",
      completeIds: ["bmc", "industrymap"],
      artifacts: {
        bmc: driftlineBmc(),
        industrymap: createFrameworkArtifact("industrymap"),
      },
    }),
  );
  assert.match(html, /bmc-grid/);
  assert.match(html, /bmc-kp/);
  assert.match(html, /bmc-vp/);
  assert.equal((html.match(/industry-map-band /g) || []).length, 4);
  assert.match(html, /industry-map-band-label">Terrain</);
  assert.match(html, /industry-map-band-label">Players</);
  assert.match(html, /industry-map-band-label">Flows</);
  assert.match(html, /industry-map-band-label">Time</);
  assert.doesNotMatch(html, /grid2/);
});
