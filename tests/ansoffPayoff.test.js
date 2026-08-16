import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createFrameworkArtifact } from "../lib/frameworkArtifacts.js";
import FrameworkArtifact from "../components/FrameworkArtifact.jsx";

const ARTIFACT = readFileSync("components/FrameworkArtifact.jsx", "utf8");
const CSS = readFileSync("app/globals.css", "utf8");
const WORKSPACE = readFileSync("components/FrameworkWorkspace.jsx", "utf8");
const PAGE = readFileSync("app/framework/[id]/page.jsx", "utf8");

const INVENTED = [
  "Grow share in the current book",
  "Launch a new product line",
  "Enter a second city",
  "Sell adjacent equipment",
  "Title:",
];

function opportunity(title, extras = {}) {
  return {
    title,
    rationale: extras.rationale || "Grounded in the saved run payload.",
    risk: extras.risk || "medium",
    basis: "known",
    confidence: "high",
    evidenceRefs: ["E1"],
  };
}

function filledAnsoff(overrides = {}) {
  return createFrameworkArtifact("ansoff", {
    status: "complete",
    payload: {
      quadrants: {
        marketPenetration: [opportunity("Keep current cafes buying more")],
        productDevelopment: [opportunity("Add cold brew kegs")],
        marketDevelopment: [opportunity("Open a second city")],
        diversification: [opportunity("Sell roasting equipment")],
      },
      selectedVector: {
        text: "Penetrate the current wholesale book first",
        quadrant: "marketPenetration",
        basis: "known",
        confidence: "high",
        evidenceRefs: ["E1"],
      },
    },
    ...overrides,
  });
}

function renderAnsoff(artifact, extras = {}) {
  return renderToStaticMarkup(React.createElement(FrameworkArtifact, {
    artifact,
    frameworkId: "ansoff",
    brief: true,
    onSelect: () => {},
    ...extras,
  }));
}

function quadrantBlock(html, id) {
  const marker = `ansoff-cell ansoff-${id}`;
  const start = html.indexOf(marker);
  assert.ok(start >= 0, `missing quadrant ${id}`);
  const next = html.indexOf("ansoff-cell ansoff-", start + marker.length);
  const vector = html.indexOf("ansoff-vector", start);
  const end = [next, vector, html.length].filter(index => index > start).sort((a, b) => a - b)[0];
  return html.slice(start, end);
}

test("filled Ansoff reads as a 2×2 from payload.quadrants, not two findings cards", () => {
  const html = renderAnsoff(filledAnsoff());

  assert.match(html, /ansoff-matrix/);
  assert.match(html, /aria-label="Ansoff Matrix"/);
  assert.match(html, /ansoff-matrix-frame/);
  assert.doesNotMatch(html, /grid2/);
  assert.doesNotMatch(html, /artifact-sections artifact-matrix/);

  assert.match(html, /Existing products/);
  assert.match(html, /New products/);
  assert.match(html, /Existing markets/);
  assert.match(html, /New markets/);
  assert.match(CSS, /\.ansoff-axis\{[^}]*color:var\(--line\)/);
  assert.doesNotMatch(CSS, /\.ansoff-axis\{[^}]*color:var\(--amber\)/);

  const order = [
    html.indexOf("Open Market Penetration"),
    html.indexOf("Open Product Development"),
    html.indexOf("Open Market Development"),
    html.indexOf("Open Diversification"),
  ];
  assert.ok(order.every(index => index >= 0), "all four quadrants are present");
  assert.deepEqual(order, [...order].sort((a, b) => a - b));

  assert.match(quadrantBlock(html, "marketPenetration"), /Keep current cafes buying more/);
  assert.match(quadrantBlock(html, "productDevelopment"), /Add cold brew kegs/);
  assert.match(quadrantBlock(html, "marketDevelopment"), /Open a second city/);
  assert.match(quadrantBlock(html, "diversification"), /Sell roasting equipment/);

  assert.doesNotMatch(html, /<b>Title:<\/b>/);
  assert.match(html, /Penetrate the current wholesale book first/);
});

test("empty or missing Ansoff quadrants stay empty — no invented cells", () => {
  const emptyHtml = renderAnsoff(createFrameworkArtifact("ansoff"));
  assert.match(emptyHtml, /ansoff-matrix/);
  assert.equal((emptyHtml.match(/Open Market Penetration|Open Product Development|Open Market Development|Open Diversification/g) || []).length, 4);
  assert.equal((emptyHtml.match(/UNSURVEYED/g) || []).length >= 4, true);
  for (const banned of INVENTED) {
    assert.equal(emptyHtml.includes(banned), false, `invented cell leaked: ${banned}`);
  }

  const missingHtml = renderAnsoff(createFrameworkArtifact("ansoff", {
    payload: {
      selectedVector: {
        text: "Penetrate the current wholesale book first",
        quadrant: "marketPenetration",
        basis: "known",
        confidence: "high",
        evidenceRefs: ["E1"],
      },
    },
  }));
  assert.match(missingHtml, /ansoff-matrix/);
  assert.match(quadrantBlock(missingHtml, "marketPenetration"), /UNSURVEYED/);
  assert.match(quadrantBlock(missingHtml, "productDevelopment"), /UNSURVEYED/);
  assert.match(quadrantBlock(missingHtml, "marketDevelopment"), /UNSURVEYED/);
  assert.match(quadrantBlock(missingHtml, "diversification"), /UNSURVEYED/);
  assert.doesNotMatch(quadrantBlock(missingHtml, "marketPenetration"), /Penetrate the current wholesale book first/);
  assert.doesNotMatch(missingHtml, /<b>Title:<\/b>/);
  for (const banned of ["Keep current cafes buying more", "Add cold brew kegs", "Open a second city", "Sell roasting equipment"]) {
    assert.equal(missingHtml.includes(banned), false, `invented quadrant copy: ${banned}`);
  }

  const partialHtml = renderAnsoff(createFrameworkArtifact("ansoff", {
    payload: {
      quadrants: {
        marketPenetration: [opportunity("Only this cell")],
      },
    },
  }));
  assert.match(quadrantBlock(partialHtml, "marketPenetration"), /Only this cell/);
  assert.match(quadrantBlock(partialHtml, "productDevelopment"), /UNSURVEYED/);
  assert.match(quadrantBlock(partialHtml, "marketDevelopment"), /UNSURVEYED/);
  assert.match(quadrantBlock(partialHtml, "diversification"), /UNSURVEYED/);
  assert.doesNotMatch(partialHtml, /Keep current cafes buying more/);
  assert.doesNotMatch(partialHtml, /<b>Title:<\/b>/);
});

test("ToC, 7S, and upload stay on today's render path", () => {
  assert.match(ARTIFACT, /normalized\.frameworkId === "ansoff"/);
  assert.match(ARTIFACT, /normalized\.frameworkId === "swot"/);
  assert.doesNotMatch(ARTIFACT, /frameworkId === "sevens"/);
  assert.match(ARTIFACT, /section\.id !== "constraint"/);
  assert.match(WORKSPACE, /<TocConstraintHero hero=\{tocHero\} \/>/);
  assert.match(PAGE, /id === "toc"/);
});
