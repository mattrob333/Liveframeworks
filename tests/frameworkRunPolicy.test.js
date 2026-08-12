import test from "node:test";
import assert from "node:assert/strict";
import {
  FRAMEWORK_RUN_POLICY,
  MODEL,
  WEB_SEARCH_TOOL,
} from "../lib/frameworkRunPolicy.js";

test("framework runs use Sonnet 5 with bounded, direct web research", () => {
  assert.equal(MODEL, "claude-sonnet-5");
  assert.equal(WEB_SEARCH_TOOL, "web_search_20250305");
  assert.equal(FRAMEWORK_RUN_POLICY.thinking, "disabled");
  assert.equal(FRAMEWORK_RUN_POLICY.structuredOutputMode, "prompt_validated");
  assert.ok(FRAMEWORK_RUN_POLICY.researchMaxTokens >= 6_000);
  assert.ok(FRAMEWORK_RUN_POLICY.synthesisMaxTokens >= 10_000);
  assert.ok(FRAMEWORK_RUN_POLICY.maxWebSearches >= 5, "research needs real search headroom to build market intel itself");
  assert.ok(FRAMEWORK_RUN_POLICY.maxWebSearches <= 8);
  assert.ok(FRAMEWORK_RUN_POLICY.maxResearchPauseTurns <= 4);
  assert.ok(FRAMEWORK_RUN_POLICY.providerCallTimeoutMs < FRAMEWORK_RUN_POLICY.runBudgetMs);
  assert.ok(FRAMEWORK_RUN_POLICY.runBudgetMs < 300_000);
});
