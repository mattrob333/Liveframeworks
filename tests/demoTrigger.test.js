import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { INTAKE } from "../lib/frameworks.js";
import { isBizIntakeReady } from "../lib/intake.js";
import { loadDemoBucketsForSlug } from "../lib/server/demoPacks.js";

test("landing ?demo= slugs load a pack or no-op, matching the select first-value pattern", () => {
  assert.equal(loadDemoBucketsForSlug(""), null);
  assert.equal(loadDemoBucketsForSlug(undefined), null);
  assert.equal(loadDemoBucketsForSlug("not-a-pack"), null);

  const driftline = loadDemoBucketsForSlug("driftline");
  const fromList = loadDemoBucketsForSlug(["driftline", "saas"]);
  assert.equal(isBizIntakeReady(driftline.biz), true);
  assert.equal(driftline.biz, fromList.biz);
  assert.equal(Object.keys(driftline).length, INTAKE.length);

  assert.match(loadDemoBucketsForSlug("ironwood").biz, /ironwooddoor\.example/);
  assert.match(loadDemoBucketsForSlug("quartermast").biz, /quartermast\.example/);
});

test("first-run, brief, export, nav, and pipeline do not mention the demo trigger", () => {
  const surfaces = [
    "components/FirstRunHome.jsx",
    "components/ExportBrief.jsx",
    "components/ExportPrintDocument.jsx",
    "components/Nav.jsx",
    "app/export/page.jsx",
    "app/pipeline/page.jsx",
  ];
  for (const file of surfaces) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, /\bdemo=/);
    assert.doesNotMatch(text, /demoBuckets/);
    assert.doesNotMatch(text, /Load demo/i);
    assert.doesNotMatch(text, /demo pack/i);
  }

  const landing = readFileSync("app/page.jsx", "utf8");
  assert.match(landing, /params\?\.demo/);
  assert.match(landing, /loadDemoBucketsForSlug/);

  const gate = readFileSync("components/HomeGate.jsx", "utf8");
  assert.match(gate, /applyDemoBuckets/);
  assert.match(gate, /setBucket/);
});
