import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  applyUploadedFiles,
  companyHostname,
  formatBizIntake,
  isBizIntakeReady,
  normalizeCompanyUrl,
  parseBizIntake,
  resolvePipelineSelect,
  validateBizIntake,
  validateBucketSave,
} from "../lib/intake.js";
import { validateApiKey } from "../lib/apiKey.js";
import { getArtifactJsonSchema } from "../lib/frameworkArtifacts.js";
import { hasHomeCanvas, resolveHomeMode, shouldShowNewCompany } from "../lib/homeMode.js";
import { interpretRunEvent } from "../lib/frameworkRunClient.js";

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

function completeBmc() {
  return { ...sampleFromSchema(getArtifactJsonSchema("bmc")), status: "complete" };
}

function homeMode({ artifact = null, ready = true, autorun = false, wantNew = false } = {}) {
  return resolveHomeMode({ ready, autorun, hasCanvas: hasHomeCanvas(artifact), wantNew });
}

test("company URLs normalize with or without a scheme", () => {
  assert.equal(normalizeCompanyUrl("https://acme.test/path"), "https://acme.test/path");
  assert.equal(normalizeCompanyUrl("acme.test"), "https://acme.test/");
  assert.equal(normalizeCompanyUrl("not a url"), "");
  assert.equal(normalizeCompanyUrl(""), "");
});

test("biz intake requires both a URL and a paragraph", () => {
  assert.equal(validateBizIntake({ url: "", paragraph: "" }).ok, false);
  assert.equal(validateBizIntake({ url: "https://acme.test", paragraph: "" }).ok, false);
  assert.equal(validateBizIntake({ url: "", paragraph: "We make widgets." }).ok, false);
  const ok = validateBizIntake({ url: "acme.test", paragraph: "We make widgets for factories." });
  assert.equal(ok.ok, true);
  assert.equal(ok.url, "https://acme.test/");
});

test("empty intake buckets do not save as success", () => {
  assert.equal(validateBucketSave("leadership", "").ok, false);
  assert.equal(validateBucketSave("calls", "   ").ok, false);
  assert.equal(validateBucketSave("org", "CEO | reports to board").ok, true);
  assert.equal(validateBucketSave("biz", "").ok, false);
});

test("formatted biz buckets round-trip and count as ready", () => {
  const formatted = formatBizIntake({ url: "https://acme.test", paragraph: "We audit ledgers." });
  const parsed = parseBizIntake(formatted);
  assert.equal(parsed.url, "https://acme.test/");
  assert.equal(parsed.paragraph, "We audit ledgers.");
  assert.equal(parsed.products, "");
  assert.equal(parsed.team, "");
  assert.equal(parsed.unusual, "");
  assert.doesNotMatch(formatted, /Main products/);
  assert.equal(isBizIntakeReady(formatted), true);
  assert.equal(isBizIntakeReady("A paragraph with no website"), false);
  const loose = parseBizIntake("See https://acme.test for the site.\nWe audit ledgers.");
  assert.equal(loose.url, "https://acme.test/");
  assert.match(loose.paragraph, /audit ledgers/);
});

test("formatBizIntake keeps products, team, and unusual from the coffee pack", () => {
  const pack = readFileSync(path.join("demo-data", "coffee", "driftline-biz.md"), "utf8");
  const parsed = parseBizIntake(pack);
  assert.match(parsed.paragraph, /roast specialty coffee/);
  assert.match(parsed.products, /Subscription coffee bags/);
  assert.match(parsed.team, /8 \(founder\/CEO/);
  assert.match(parsed.unusual, /no dedicated wholesale owner/);

  const formatted = formatBizIntake(parsed);
  assert.match(formatted, /Main products \/ services: Subscription coffee bags/);
  assert.match(formatted, /Team size \(rough\): 8 \(founder\/CEO/);
  assert.match(formatted, /Anything unusual worth knowing: There is no dedicated wholesale owner/);

  const again = parseBizIntake(formatted);
  assert.equal(again.products, parsed.products);
  assert.equal(again.team, parsed.team);
  assert.equal(again.unusual, parsed.unusual);
  assert.equal(isBizIntakeReady(formatted), true);
});

test("applyUploadedFiles loads a pack file into a bucket without paste", () => {
  const biz = readFileSync(path.join("demo-data", "coffee", "driftline-biz.md"), "utf8");
  const calls = readFileSync(path.join("demo-data", "coffee", "driftline-calls.md"), "utf8");
  const store = {};
  const writer = {
    getBucket: key => store[key] || "",
    setBucket: (key, value) => {
      store[key] = value;
      return { ok: true };
    },
  };

  const emptyBiz = applyUploadedFiles("biz", [], writer);
  assert.equal(emptyBiz.ok, false);

  const loadedBiz = applyUploadedFiles("biz", [{ name: "driftline-biz.md", text: biz }], writer);
  assert.equal(loadedBiz.ok, true);
  assert.equal(store.biz, loadedBiz.value);
  assert.match(store.biz, /Website URL: https:\/\/driftline\.example\/?/);
  assert.match(store.biz, /Main products \/ services:/);
  assert.match(store.biz, /Team size \(rough\):/);
  assert.match(store.biz, /Anything unusual worth knowing:/);
  assert.match(store.biz, /no dedicated wholesale owner/);
  assert.doesNotMatch(store.biz, /=== FILE:/);
  assert.equal(isBizIntakeReady(store.biz), true);

  const loadedCalls = applyUploadedFiles("calls", [{ name: "driftline-calls.md", text: calls }], writer);
  assert.equal(loadedCalls.ok, true);
  assert.match(store.calls, /=== FILE: driftline-calls\.md ===/);
  assert.match(store.calls, /OTTESSA/);
});

test("pipeline file upload writes through applyUploadedFiles", () => {
  const page = readFileSync("app/pipeline/page.jsx", "utf8");
  assert.match(page, /applyUploadedFiles/);
  assert.match(page, /onChange=\{onFiles\}/);
  assert.match(page, /UPLOAD \.TXT \/ \.MD/);
});

test("company hostname for the nav brand strips www", () => {
  assert.equal(companyHostname("https://www.nextmethod.ai/about"), "nextmethod.ai");
  assert.equal(companyHostname("acme.test"), "acme.test");
  assert.equal(companyHostname(""), "");
});

test("API keys must be non-empty and look like Anthropic keys", () => {
  assert.equal(validateApiKey("").ok, false);
  assert.equal(validateApiKey("   ").ok, false);
  assert.equal(validateApiKey("sk-live-not-anthropic").ok, false);
  assert.equal(validateApiKey("sk-ant-short").ok, false);
  assert.equal(validateApiKey("sk-ant-123456789012").ok, false);
  const ok = validateApiKey("  sk-ant-testkeyvalue1  ");
  assert.equal(ok.ok, true);
  assert.equal(ok.value, "sk-ant-testkeyvalue1");
});

test("home is the canvas after a complete BMC, unless New company", () => {
  assert.equal(resolveHomeMode({ ready: false, autorun: false, hasCanvas: false, wantNew: false }), "loading");
  assert.equal(resolveHomeMode({ ready: true, autorun: false, hasCanvas: false, wantNew: false }), "intake");
  assert.equal(resolveHomeMode({ ready: true, autorun: true, hasCanvas: false, wantNew: false }), "canvas");
  assert.equal(resolveHomeMode({ ready: true, autorun: false, hasCanvas: true, wantNew: false }), "canvas");
  assert.equal(resolveHomeMode({ ready: true, autorun: false, hasCanvas: true, wantNew: true }), "intake");
});

test("stale BMC keeps home on the canvas; empty and ?new=1 go to intake", () => {
  const complete = completeBmc();
  const stale = { ...complete, status: "stale" };

  assert.equal(hasHomeCanvas(complete), true);
  assert.equal(hasHomeCanvas(stale), true);
  assert.equal(hasHomeCanvas(null), false);
  assert.equal(hasHomeCanvas({ frameworkId: "bmc", status: "needs_input" }), false);
  assert.equal(hasHomeCanvas({ frameworkId: "bmc", status: "legacy" }), false);

  assert.equal(homeMode({ artifact: complete }), "canvas");
  assert.equal(homeMode({ artifact: stale }), "canvas");
  assert.equal(homeMode({ artifact: null }), "intake");
  assert.equal(homeMode({ artifact: stale, wantNew: true }), "intake");
  assert.equal(homeMode({ artifact: complete, wantNew: true }), "intake");
});

test("HomeGate treats stale BMC as a canvas, not a complete-only check", () => {
  const gate = readFileSync("components/HomeGate.jsx", "utf8");
  assert.match(gate, /hasHomeCanvas\(getArtifact\("bmc"\)\)/);
  assert.doesNotMatch(gate, /artifactIsComplete/);
});

test("New company stays out of the nav until a canvas exists", () => {
  assert.equal(shouldShowNewCompany({ hasCanvas: false, wantNew: false, path: "/", companyLoaded: false }), false);
  assert.equal(shouldShowNewCompany({ hasCanvas: false, wantNew: true, path: "/", companyLoaded: true }), true);
  assert.equal(shouldShowNewCompany({ hasCanvas: true, wantNew: false, path: "/", companyLoaded: true }), true);
  assert.equal(shouldShowNewCompany({ hasCanvas: true, wantNew: true, path: "/", companyLoaded: true }), true);
  assert.equal(shouldShowNewCompany({ hasCanvas: false, wantNew: false, path: "/pipeline", companyLoaded: true }), true);
  assert.equal(shouldShowNewCompany({ hasCanvas: false, wantNew: false, path: "/pipeline", companyLoaded: false }), false);
});

test("New company stays in the nav when the BMC is stale", () => {
  const stale = { ...completeBmc(), status: "stale" };
  assert.equal(hasHomeCanvas(stale), true);
  assert.equal(shouldShowNewCompany({
    hasCanvas: hasHomeCanvas(stale),
    wantNew: false,
    path: "/",
    companyLoaded: true,
  }), true);
  assert.equal(shouldShowNewCompany({
    hasCanvas: hasHomeCanvas(null),
    wantNew: false,
    path: "/",
    companyLoaded: false,
  }), false);
});

test("Nav treats stale BMC as a canvas for New company", () => {
  const nav = readFileSync("components/Nav.jsx", "utf8");
  assert.match(nav, /hasHomeCanvas\(getArtifact\("bmc"\)\)/);
  assert.doesNotMatch(nav, /artifactIsComplete/);
});

test("?new=1 on a stale canvas is returning copy, not first-run", () => {
  const stale = { ...completeBmc(), status: "stale" };
  assert.equal(hasHomeCanvas(stale), true);
  assert.equal(hasHomeCanvas(null), false);

  const home = readFileSync("components/FirstRunHome.jsx", "utf8");
  assert.match(home, /setReturning\(hasHomeCanvas\(getArtifact\("bmc"\)\)\)/);
  assert.match(home, /returning \? "New company\."/);
  assert.match(home, /returning && <><Link href="\/">Back to the canvas<\/Link>/);
  assert.doesNotMatch(home, /artifactIsComplete/);
});

test("pipeline select slugs resolve to a known framework or unknown", () => {
  assert.deepEqual(resolvePipelineSelect(""), { kind: "none" });
  assert.deepEqual(resolvePipelineSelect("bmc"), { kind: "framework", id: "bmc" });
  assert.deepEqual(resolvePipelineSelect("not-a-framework"), { kind: "unknown", slug: "not-a-framework" });
});

test("run progress events map to the same phase labels the pipeline uses", () => {
  assert.equal(interpretRunEvent({ type: "phase", phase: "research" }).phase, 1);
  assert.match(interpretRunEvent({ type: "phase", phase: "research" }).detail, /planning searches/);
  const search = interpretRunEvent({ type: "search_query", query: "acme competitors" }, 0);
  assert.equal(search.searchCount, 1);
  assert.match(search.detail, /acme competitors/);
  assert.equal(interpretRunEvent({ type: "result", status: "complete" }).result.status, "complete");
});
