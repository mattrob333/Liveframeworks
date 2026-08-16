import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  apparatusPropsFromGrounding,
  apparatusSegments,
  formatBasis,
  formatConfidence,
  formatKind,
  formatSourceCount,
} from "../lib/apparatus.js";
import Apparatus from "../components/Apparatus.jsx";
import FrameworkArtifact from "../components/FrameworkArtifact.jsx";
import { createFrameworkArtifact } from "../lib/frameworkArtifacts.js";

test("known / high / computed source counts become the caps line", () => {
  assert.deepEqual(formatBasis("known"), { type: "caps", text: "KNOWN" });
  assert.deepEqual(formatConfidence("high"), { type: "caps", text: "HIGH" });
  assert.deepEqual(formatSourceCount(2), { type: "caps", text: "2 SOURCES" });
  assert.deepEqual(formatSourceCount(1), { type: "caps", text: "1 SOURCE" });
  assert.deepEqual(formatSourceCount(["E1", "E2"]), { type: "caps", text: "2 SOURCES" });
  assert.deepEqual(
    apparatusSegments({ basis: "known", confidence: "high", sourceCount: 2 }),
    [
      { type: "caps", text: "KNOWN" },
      { type: "caps", text: "HIGH" },
      { type: "caps", text: "2 SOURCES" },
    ],
  );
});

test("medium becomes MED; high and low stay whole; unknown confidence is omitted", () => {
  assert.deepEqual(formatConfidence("medium"), { type: "caps", text: "MED" });
  assert.deepEqual(formatConfidence("MEDIUM"), { type: "caps", text: "MED" });
  assert.deepEqual(formatConfidence("low"), { type: "caps", text: "LOW" });
  assert.equal(formatConfidence("likely"), null);
  assert.equal(formatConfidence(""), null);
});

test("inferred and assumed are hedge italics; missing and unknown basis are omitted", () => {
  assert.deepEqual(formatBasis("inferred"), { type: "hedge", text: "inferred" });
  assert.deepEqual(formatBasis("assumed"), { type: "hedge", text: "assumed" });
  assert.equal(formatBasis("missing"), null);
  assert.equal(formatBasis("guessed"), null);
});

test("source count is omitted when it cannot be computed honestly", () => {
  assert.equal(formatSourceCount(0), null);
  assert.equal(formatSourceCount(-1), null);
  assert.equal(formatSourceCount(null), null);
  assert.equal(formatSourceCount(undefined), null);
  assert.equal(formatSourceCount([]), null);
  assert.equal(formatSourceCount("2"), null);
  assert.equal(formatSourceCount({ length: 2 }), null);
});

test("evidence kind uses the existing four words only", () => {
  assert.deepEqual(formatKind("web"), { type: "caps", text: "WEB" });
  assert.deepEqual(formatKind("intake"), { type: "caps", text: "INTAKE" });
  assert.deepEqual(formatKind("upstream"), { type: "caps", text: "UPSTREAM" });
  assert.deepEqual(formatKind("chat"), { type: "caps", text: "CHAT" });
  assert.equal(formatKind("interview"), null);
});

test("grounding helper counts evidenceRefs and does not invent a count", () => {
  assert.deepEqual(
    apparatusPropsFromGrounding({
      basis: "inferred",
      confidence: "medium",
      evidenceRefs: ["E1"],
    }),
    { basis: "inferred", confidence: "medium", sourceCount: ["E1"] },
  );
  assert.deepEqual(
    apparatusPropsFromGrounding({ basis: "known", confidence: "high" }),
    { basis: "known", confidence: "high", sourceCount: null },
  );
  assert.equal(apparatusPropsFromGrounding(null), null);
});

test("Apparatus renders middots, italic hedges, and computed counts", () => {
  const known = renderToStaticMarkup(React.createElement(Apparatus, {
    basis: "known",
    confidence: "high",
    sourceCount: ["E1", "E2"],
  }));
  assert.match(known, /class="apparatus"/);
  assert.match(known, /KNOWN/);
  assert.match(known, /HIGH/);
  assert.match(known, /2 SOURCES/);
  assert.match(known, / · /);
  assert.doesNotMatch(known, /2 SOURCES · /);

  const hedge = renderToStaticMarkup(React.createElement(Apparatus, {
    basis: "inferred",
    confidence: "medium",
    sourceCount: 1,
  }));
  assert.match(hedge, /\[<em>inferred<\/em>\]/);
  assert.match(hedge, /MED/);
  assert.match(hedge, /1 SOURCE/);
  assert.doesNotMatch(hedge, /INFERRED/);
  assert.doesNotMatch(hedge, /MEDIUM/);

  const assumed = renderToStaticMarkup(React.createElement(Apparatus, {
    basis: "assumed",
    confidence: "low",
  }));
  assert.match(assumed, /\[<em>assumed<\/em>\]/);
  assert.match(assumed, /LOW/);
  assert.doesNotMatch(assumed, /SOURCES/);
  assert.doesNotMatch(assumed, /UNSOURCED/);

  assert.equal(renderToStaticMarkup(React.createElement(Apparatus, {
    basis: "missing",
    sourceCount: 0,
  })), "");
});

test("artifact-meta and source-kind call sites use Apparatus, not colored chips", () => {
  const html = renderToStaticMarkup(React.createElement(FrameworkArtifact, {
    artifact: createFrameworkArtifact("fiveforces", {
      payload: {
        forces: {
          rivalry: {
            score: 3,
            direction: "rising",
            findings: [{
              text: "Price pressure from regional rivals",
              basis: "known",
              confidence: "high",
              evidenceRefs: ["E1", "E2"],
            }],
          },
        },
      },
      evidence: [{
        id: "E1",
        kind: "web",
        title: "Industry note",
        sourceKey: null,
        artifactRevision: null,
        messageId: null,
        url: "https://example.com/note",
        retrievedAt: null,
      }],
    }),
  }));
  assert.match(html, /artifact-meta/);
  assert.match(html, /KNOWN/);
  assert.match(html, /HIGH/);
  assert.match(html, /2 SOURCES/);
  assert.match(html, /artifact-source-kind/);
  assert.match(html, /WEB/);
  assert.doesNotMatch(html, /artifact-basis/);
  assert.doesNotMatch(html, /basis-known/);
  assert.doesNotMatch(html, /confidence-high/);
  assert.doesNotMatch(html, /source-web/);
  assert.doesNotMatch(html, />web</);
});
