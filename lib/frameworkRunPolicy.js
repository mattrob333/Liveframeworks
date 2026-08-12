export const MODEL = "claude-sonnet-5";

// Basic search keeps internet access without the extra code-execution hop used by
// dynamic filtering. That hop is useful for deep research, but it makes this
// interactive, single-request workflow prone to long silent waits.
export const WEB_SEARCH_TOOL = "web_search_20250305";

export const FRAMEWORK_RUN_POLICY = Object.freeze({
  maxResearchPauseTurns: 2,
  maxWebSearches: 3,
  researchMaxTokens: 3_500,
  synthesisMaxTokens: 7_000,
  providerCallTimeoutMs: 75_000,
  runBudgetMs: 180_000,
  thinking: "disabled",
  structuredOutputMode: "prompt_validated",
});
