import test from "node:test";
import assert from "node:assert/strict";
import { aggregateProviderTurns, buildProviderHistory, trimChatLog } from "../lib/chatProtocol.js";

test("pause-turn text, citations, warnings, and web activity survive aggregation", () => {
  const aggregate = aggregateProviderTurns([
    [
      { type: "server_tool_use", name: "web_search" },
      {
        type: "text",
        text: "First researched finding.",
        citations: [{ url: "https://example.com/one", title: "First source", cited_text: "Evidence one" }],
      },
      {
        type: "web_search_tool_result",
        content: { type: "web_search_tool_result_error", error_code: "temporarily_unavailable" },
      },
    ],
    [
      {
        type: "text",
        text: "Final researched finding.",
        citations: [
          { url: "https://example.com/one", title: "Duplicate source" },
          { url: "https://example.com/two", title: "Second source" },
        ],
      },
    ],
  ]);

  assert.equal(aggregate.text, "First researched finding.\nFinal researched finding.");
  assert.deepEqual(aggregate.citations.map(citation => citation.url), [
    "https://example.com/one",
    "https://example.com/two",
  ]);
  assert.deepEqual(aggregate.warnings, ["temporarily_unavailable"]);
  assert.equal(aggregate.webUsed, true);
});

test("chat history stays bounded without splitting a provider-turn bundle", () => {
  const messages = [
    { role: "assistant", content: "old greeting" },
    { role: "user", content: "old question" },
    {
      role: "assistant",
      content: "researched answer",
      providerTurns: Array.from({ length: 8 }, (_, index) => [{ type: "text", text: `turn ${index}` }]),
    },
    { role: "user", content: "latest question" },
  ];

  const history = buildProviderHistory(messages, 9);
  assert.equal(history.length, 9);
  assert.equal(history.filter(message => message.role === "assistant").length, 8);
  assert.equal(history.at(-1).content, "latest question");

  const boundedLog = trimChatLog(Array.from({ length: 90 }, (_, index) => ({ role: "user", content: `${index}` })));
  assert.equal(boundedLog.length, 60);
  assert.equal(boundedLog[0].content, "30");
});
