import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FW, ORDER } from "../lib/frameworks.js";
import WhyThisStep from "../components/WhyThisStep.jsx";
import { HOW_TO_READ, howToReadFor } from "../lib/howToRead.js";
import HowToRead from "../components/HowToRead.jsx";
import FrameworkArtifact from "../components/FrameworkArtifact.jsx";
import { createFrameworkArtifact } from "../lib/frameworkArtifacts.js";

const CSS = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");
const LOADER = readFileSync(fileURLToPath(new URL("../components/LoadingState.module.css", import.meta.url)), "utf8");
const [screenCss, printCss = ""] = CSS.split("@media print");

const TOKENS = {
  "--type-body": 16,
  "--type-digest": 15,
  "--type-label": 13,
  "--type-howto": 14,
  "--type-header": 24,
  "--type-subtitle": 15,
};

function tokenPx(name) {
  const match = CSS.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:(\\d+(?:\\.\\d+)?)px`));
  assert.ok(match, `missing type token ${name}`);
  return Number(match[1]);
}

function fontSizePx(value) {
  const raw = value.trim();
  const varMatch = raw.match(/^var\((--type-[\w-]+)(?:,\s*([^)]+))?\)$/);
  if (varMatch) {
    if (TOKENS[varMatch[1]] != null) return TOKENS[varMatch[1]];
    if (varMatch[2]) return fontSizePx(varMatch[2]);
    return null;
  }
  const clamp = raw.match(/^clamp\((\d+(?:\.\d+)?)px,/);
  if (clamp) return Number(clamp[1]);
  const px = raw.match(/^(\d+(?:\.\d+)?)px$/);
  if (px) return Number(px[1]);
  return null;
}

function declaredFontSizes(css, file) {
  return [...css.matchAll(/font-size:([^;}{]+)/g)].map(match => {
    const value = match[1].trim();
    return { file, value, px: fontSizePx(value) };
  });
}

test("Phase 1a type tokens replace the old 12px floor", () => {
  assert.equal(tokenPx("--type-body"), 16);
  assert.match(CSS, /--type-body-lh:1\.65/);
  assert.match(CSS, /--type-measure:62ch/);
  assert.equal(tokenPx("--type-digest"), 15);
  assert.match(CSS, /--type-digest-lh:1\.5/);
  assert.equal(tokenPx("--type-label"), 13);
  assert.equal(tokenPx("--type-howto"), 14);
  assert.equal(tokenPx("--type-header"), 24);
  assert.match(CSS, /--type-header-weight:600/);
  assert.equal(tokenPx("--type-subtitle"), 15);
  assert.match(CSS, /@media\(min-width:1440px\)\{\s*:root\{--type-digest:16px\}/);
});

test("body and box digests use the new floors", () => {
  assert.match(screenCss, /body\{[^}]*font-size:var\(--type-body\)/);
  assert.match(screenCss, /body\{[^}]*line-height:var\(--type-body-lh\)/);
  assert.match(screenCss, /\.bmc-cell \.d\{[^}]*font-size:var\(--type-digest\)/);
  assert.match(screenCss, /\.artifact-digest li\{[^}]*font-size:var\(--type-digest\)/);
  assert.match(screenCss, /\.artifact-digest li\{[^}]*line-height:var\(--type-digest-lh\)/);
  assert.match(screenCss, /\.artifact-section-content\{[^}]*font-size:var\(--type-digest\)/);
});

test("nothing below 13px in app type CSS", () => {
  const declarations = [
    ...declaredFontSizes(CSS, "app/globals.css"),
    ...declaredFontSizes(LOADER, "components/LoadingState.module.css"),
  ];
  assert.ok(declarations.length > 20, "expected to find font-size declarations");
  const unknown = declarations.filter(item => item.px == null);
  assert.deepEqual(unknown, [], "unresolved font-size values");
  const tooSmall = declarations.filter(item => item.px < 13);
  assert.deepEqual(tooSmall, [], "sub-13px font-size is a Phase 1a defect");
});

test("section and band headers are 24px / 600 with 15px subtitles", () => {
  assert.match(screenCss, /\.stage-title\{[^}]*font-size:var\(--type-header\)/);
  assert.match(screenCss, /\.stage-title\{[^}]*font-weight:var\(--type-header-weight\)/);
  assert.match(screenCss, /\.stage-role\{[^}]*font-size:var\(--type-subtitle\)/);
  assert.match(screenCss, /\.industry-map-band-label\{[^}]*font-size:var\(--type-header\)/);
  assert.match(screenCss, /\.industry-map-band-subtitle\{[^}]*font-size:var\(--type-subtitle\)/);
  assert.match(screenCss, /\.export-fw h2\{[^}]*font-size:var\(--type-header\)/);
  assert.match(screenCss, /\.export-fw-subtitle\{[^}]*font-size:var\(--type-subtitle\)/);
});

test("HOW-TO-READ copy exists for every framework and named dense surface", () => {
  for (const id of ORDER) {
    assert.ok(howToReadFor(id), `missing HOW-TO-READ for ${id}`);
    assert.doesNotMatch(howToReadFor(id), /lorem|DEMO-ONLY/i);
  }
  for (const id of ["pipeline", "export", "exportPrint", "tocRoster", "evidence"]) {
    assert.ok(HOW_TO_READ[id], `missing HOW-TO-READ for ${id}`);
  }
  const html = renderToStaticMarkup(React.createElement(HowToRead, { of: "bmc" }));
  assert.match(html, /how-to-read/);
  assert.match(html, /Nine boxes, one business/);
  const map = renderToStaticMarkup(React.createElement(FrameworkArtifact, {
    artifact: createFrameworkArtifact("bmc"),
    frameworkId: "bmc",
    brief: true,
  }));
  assert.match(map, /how-to-read/);
  assert.match(map, /Nine boxes, one business/);
});

test("WHY-THIS-STEP is generated from FW insight and skipped when missing", () => {
  for (const id of ORDER) {
    assert.ok(String(FW[id].insight || "").trim(), `missing insight for ${id} — page would skip WHY-THIS-STEP`);
  }
  const html = renderToStaticMarkup(React.createElement(WhyThisStep, { insight: FW.bmc.insight }));
  assert.match(html, /why-this-step/);
  assert.match(html, /Why this step/);
  assert.ok(html.includes(FW.bmc.insight));
  assert.equal(renderToStaticMarkup(React.createElement(WhyThisStep, { insight: "" })), "");
  assert.equal(renderToStaticMarkup(React.createElement(WhyThisStep, { insight: "   " })), "");
  const workspace = readFileSync(fileURLToPath(new URL("../components/FrameworkWorkspace.jsx", import.meta.url)), "utf8");
  assert.match(workspace, /<WhyThisStep insight=\{framework\.insight\} \/>/);
});

test("print block stays hardcoded white paper / #111 ink", () => {
  assert.match(printCss, /html,body\{background:#fff;color:#111\}/);
  assert.match(printCss, /\.export-print-doc\{display:block;background:#fff;color:#111/);
  assert.match(printCss, /\.export-print-doc h1\{[^}]*color:#111/);
  assert.match(printCss, /\.export-print-date\{font-size:13px;color:#111/);
  assert.match(printCss, /\.export-print-fw h2\{[^}]*color:#111/);
  assert.match(printCss, /\.export-print-sec h3\{[^}]*color:#111/);
  assert.doesNotMatch(printCss, /var\(--bg\)|var\(--line\)|var\(--amber\)|#211D15|#E9E2CF|#E39A2B/);
});
