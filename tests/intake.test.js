import test from "node:test";
import assert from "node:assert/strict";
import {
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
  assert.equal(isBizIntakeReady(formatted), true);
  assert.equal(isBizIntakeReady("A paragraph with no website"), false);
  const loose = parseBizIntake("See https://acme.test for the site.\nWe audit ledgers.");
  assert.equal(loose.url, "https://acme.test/");
  assert.match(loose.paragraph, /audit ledgers/);
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

test("New company stays out of the nav until a canvas exists", () => {
  assert.equal(shouldShowNewCompany({ hasCanvas: false, wantNew: false, path: "/", companyLoaded: false }), false);
  assert.equal(shouldShowNewCompany({ hasCanvas: false, wantNew: true, path: "/", companyLoaded: true }), true);
  assert.equal(shouldShowNewCompany({ hasCanvas: true, wantNew: false, path: "/", companyLoaded: true }), true);
  assert.equal(shouldShowNewCompany({ hasCanvas: true, wantNew: true, path: "/", companyLoaded: true }), true);
  assert.equal(shouldShowNewCompany({ hasCanvas: false, wantNew: false, path: "/pipeline", companyLoaded: true }), true);
  assert.equal(shouldShowNewCompany({ hasCanvas: false, wantNew: false, path: "/pipeline", companyLoaded: false }), false);
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
