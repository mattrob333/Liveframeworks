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
  assert.match(body, /overflow-wrap:normal/);
  assert.match(body, /word-break:normal/);
  assert.match(body, /min-width:0/);
  assert.doesNotMatch(body, /overflow-wrap:break-word/);
  assert.doesNotMatch(body, /overflow-wrap:anywhere/);
  assert.doesNotMatch(body, /word-break:break-all/);

  const title = cssRule(".bmc-cell .t");
  assert.match(title, /overflow-wrap:normal/);
  assert.match(title, /word-break:normal/);
  assert.doesNotMatch(title, /overflow-wrap:break-word/);
  assert.doesNotMatch(title, /word-break:break-all/);

  const digest = cssRule(".artifact-digest");
  assert.match(digest, /min-width:0/);
  assert.match(digest, /width:100%/);

  const item = cssRule(".artifact-digest li");
  assert.match(item, /overflow-wrap:normal/);
  assert.match(item, /word-break:normal/);
  assert.match(item, /overflow:visible/);
  assert.doesNotMatch(item, /overflow-wrap:break-word/);
  assert.doesNotMatch(item, /word-break:break-all/);
  assert.doesNotMatch(item, /-webkit-line-clamp/);
  assert.doesNotMatch(item, /overflow:hidden/);
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
  assert.match(html, /industry-map-band-subtitle">The parts of the market/);
  assert.match(html, /industry-map-band-subtitle">The companies standing on that ground/);
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

const SEVENS_TARGET = {
  strategy: "Documented wholesale sample-to-quote process owned independently of the founder.",
  structure: "A named wholesale owner sits beside roasting, not mid-word clipped into the founder.",
  systems: "Standing price sheet and reorder path — quoting no longer waits on one inbox.",
  sharedValues: "High-touch care stays in the product, not in every founder text.",
  style: "Hands-on care without personal involvement in every transaction.",
  staff: "Two packers plus a wholesale owner; packing capacity is a hard ceiling.",
  skills: "Sample roasting and quoting can move off Maya without inventing a new desk.",
};

function scoreElement(targetState) {
  return {
    score: 2,
    currentState: "Founder-owned wholesale sampling, quoting, and approval.",
    targetState,
    gaps: [],
    actions: [],
    basis: "known",
    confidence: "high",
    evidenceRefs: ["E1"],
  };
}

function driftlineSevens() {
  return createFrameworkArtifact("sevens", {
    status: "complete",
    title: "Driftline 7S",
    summary: "Hard elements converge on one founder.",
    generatedAt: "2026-08-11T00:00:00.000Z",
    evidence: [evidence],
    payload: {
      elements: {
        strategy: scoreElement(SEVENS_TARGET.strategy),
        structure: scoreElement(SEVENS_TARGET.structure),
        systems: scoreElement(SEVENS_TARGET.systems),
        sharedValues: scoreElement(SEVENS_TARGET.sharedValues),
        style: scoreElement(SEVENS_TARGET.style),
        staff: scoreElement(SEVENS_TARGET.staff),
        skills: scoreElement(SEVENS_TARGET.skills),
      },
      keyMisalignments: [claim("Structure, systems, staff, and skills converge on Maya.")],
    },
  });
}

test("7S scorecard wraps at a title-safe min, not seven 87px 1fr tracks", () => {
  const shared = cssRule(".artifact-scorecard");
  assert.match(shared, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);

  const sevens = cssRule('[data-framework="sevens"] .artifact-scorecard');
  const minMatch = sevens.match(/grid-template-columns:repeat\(auto-fit,minmax\((\d+)px,1fr\)\)/);
  assert.ok(minMatch, "7S must auto-fit columns with a px min, not seven equal 1fr tracks");
  const columnMin = Number(minMatch[1]);
  // STRUCTURE at 12px mono + 12px cell padding needs ~96px; 148px also holds
  // "independently" / "relationship" on Current/Target lines. Four 148px tracks
  // plus 8px gaps still fit in the 657px 1280+chat pane, so all seven S-elements wrap to two rows.
  assert.ok(columnMin >= 148, `7S column min ${columnMin}px cannot hold STRUCTURE at a word boundary`);
  assert.ok(4 * columnMin + 24 <= 657, `7S column min ${columnMin}px cannot wrap seven S-elements into a 657px pane`);
  assert.match(sevens, /min-width:0/);
  assert.match(sevens, /align-items:stretch/);
  assert.doesNotMatch(sevens, /repeat\(7,/);
  assert.doesNotMatch(sevens, /repeat\(7,1fr\)/);
  assert.doesNotMatch(sevens, /minmax\(0,1fr\)/);
});

test("7S titles and Target/Current lines wrap at word boundaries only", () => {
  const title = cssRule('[data-framework="sevens"] .artifact-section-title');
  assert.match(title, /overflow-wrap:normal/);
  assert.match(title, /word-break:normal/);
  assert.doesNotMatch(title, /overflow-wrap:break-word/);
  assert.doesNotMatch(title, /word-break:break-all/);
  assert.doesNotMatch(title, /overflow-wrap:anywhere/);

  const cell = cssRule('[data-framework="sevens"] .artifact-section');
  assert.match(cell, /overflow:visible/);
  assert.match(cell, /min-width:0/);
  assert.doesNotMatch(cell, /overflow:hidden/);

  const body = cssRule('[data-framework="sevens"] .artifact-section-content');
  assert.match(body, /overflow-wrap:normal/);
  assert.match(body, /word-break:normal/);
  assert.match(body, /overflow:visible/);
  assert.doesNotMatch(body, /overflow-wrap:break-word/);
  assert.doesNotMatch(body, /word-break:break-all/);
  assert.doesNotMatch(body, /overflow:hidden/);

  const details = cssRule('[data-framework="sevens"] .artifact-details');
  assert.match(details, /minmax\(0,1fr\)/);
  assert.match(details, /min-width:0/);

  const line = cssRule('[data-framework="sevens"] .artifact-details span');
  assert.match(line, /overflow-wrap:normal/);
  assert.match(line, /word-break:normal/);
  assert.match(line, /overflow:visible/);
  assert.doesNotMatch(line, /overflow-wrap:break-word/);
  assert.doesNotMatch(line, /overflow:hidden/);
  assert.doesNotMatch(line, /word-break:break-all/);
});

test("desktop ~1280 keeps all seven 7S elements via wrap; phones may stack at 700px", () => {
  assert.doesNotMatch(screenCss, /@media\(max-width:1280px\)/);
  const phone = mediaBlock("max-width:700px");
  assert.match(phone, /\[data-framework="sevens"\] \.artifact-scorecard\{grid-template-columns:1fr\}/);
  const mid = mediaBlock("max-width:1180px");
  assert.match(mid, /\.artifact-scorecard\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.doesNotMatch(mid, /\[data-framework="sevens"\]/);
});

test("7S markup keeps all seven elements and the Target words that were clipping", () => {
  const html = renderToStaticMarkup(
    React.createElement(FrameworkArtifact, {
      artifact: driftlineSevens(),
      frameworkId: "sevens",
      brief: true,
      onSelect: () => {},
    }),
  );
  assert.match(html, /data-framework="sevens"/);
  assert.match(html, /artifact-scorecard/);
  assert.match(html, /Open Strategy/);
  assert.match(html, /Open Structure/);
  assert.match(html, /Open Systems/);
  assert.match(html, /Open Shared Values/);
  assert.match(html, /Open Style/);
  assert.match(html, /Open Staff/);
  assert.match(html, /Open Skills/);
  assert.match(html, /<b>Target:<\/b> Documented wholesale sample-to-quote process owned independently of the founder\./);
  assert.match(html, /independently/);
  assert.match(html, /quoting/);
  assert.match(html, /High-touch/);
  assert.doesNotMatch(html, /independen(?!tly)/);
  assert.doesNotMatch(html, /High-(?!touch)/);
  assert.doesNotMatch(html, /ansoff-matrix/);
  assert.doesNotMatch(html, /bmc-grid/);
});

test("/export 7S stays seven columns and keeps Target words", () => {
  const html = renderToStaticMarkup(
    React.createElement(ExportBrief, {
      meta: engagementMeta({
        biz: formatBizIntake({
          url: "https://driftline.example",
          paragraph: "Small-batch coffee.",
        }),
      }),
      generatedAt: "2026-08-14T12:00:00.000Z",
      completeIds: ["sevens"],
      artifacts: { sevens: driftlineSevens() },
    }),
  );
  assert.match(html, /data-framework="sevens"/);
  assert.match(html, /artifact-scorecard/);
  assert.match(html, /Open Strategy/);
  assert.match(html, /Open Skills/);
  assert.match(html, /independently/);
  assert.match(html, /quoting/);
  assert.doesNotMatch(html, /ansoff-matrix/);
});
