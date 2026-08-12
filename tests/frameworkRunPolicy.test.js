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
  assert.ok(FRAMEWORK_RUN_POLICY.maxWebSearches <= 3);
  assert.ok(FRAMEWORK_RUN_POLICY.maxResearchPauseTurns <= 2);
  assert.ok(FRAMEWORK_RUN_POLICY.providerCallTimeoutMs < FRAMEWORK_RUN_POLICY.runBudgetMs);
  assert.ok(FRAMEWORK_RUN_POLICY.runBudgetMs < 300_000);
});
