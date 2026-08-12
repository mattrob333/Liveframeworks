import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateProviderTurns,
  buildAssistantLogMessage,
  buildProviderHistory,
  trimChatLog,
} from "../lib/chatProtocol.js";

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

test("chat history stays bounded without splitting a user/provider-turn exchange", () => {
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

  const history = buildProviderHistory(messages, 10);
  assert.equal(history.length, 10);
  assert.equal(history[0].content, "old question");
  assert.equal(history.filter(message => message.role === "assistant").length, 8);
  assert.equal(history.at(-1).content, "latest question");

  const oversizedExchange = [
    { role: "user", content: "keep the prompt" },
    {
      role: "assistant",
      content: "keep every paused provider response",
      providerTurns: Array.from({ length: 80 }, (_, index) => [{ type: "text", text: `pause ${index}` }]),
    },
  ];
  const unsplit = buildProviderHistory(oversizedExchange, 20);
  assert.equal(unsplit.length, 81);
  assert.equal(unsplit[0].content, "keep the prompt");
  assert.equal(unsplit.at(-1).content[0].text, "pause 79");

  const longLog = Array.from({ length: 45 }, (_, index) => [
    { role: "user", content: `question ${index}` },
    { role: "assistant", content: `answer ${index}` },
  ]).flat();
  const boundedLog = trimChatLog(longLog);
  assert.equal(boundedLog.length, 60);
  assert.equal(boundedLog[0].content, "question 15");
});

test("controlled continuation errors preserve visible partial output, citations, and raw provider turns", () => {
  const providerTurns = [[
    {
      type: "text",
      text: "Researched partial answer.",
      citations: [{ url: "https://example.com/partial", title: "Partial source" }],
    },
  ]];
  const message = buildAssistantLogMessage({
    error: "The continuation window ended.",
    partialText: "Researched partial answer.",
    providerTurns,
    citations: [{ url: "https://example.com/partial", title: "Partial source" }],
    requestId: "request-paused",
    resumable: true,
  }, { ok: false });

  assert.match(message.content, /Researched partial answer/);
  assert.match(message.content, /Research incomplete/);
  assert.equal(message.citations[0].url, "https://example.com/partial");
  assert.deepEqual(message.providerTurns, providerTurns);
  assert.equal(message.incomplete, true);
  assert.equal(message.resumable, true);
});

test("a resumed success replaces the incomplete notice and aggregates both provider batches", () => {
  const previous = buildAssistantLogMessage({
    error: "Continue the paused research.",
    providerTurns: [[{ type: "text", text: "First half." }]],
    resumable: true,
  }, { ok: false });
  const completed = buildAssistantLogMessage({
    text: "Second half.",
    providerTurns: [[{
      type: "text",
      text: "Second half.",
      citations: [{ url: "https://example.com/final", title: "Final source" }],
    }]],
    model: "claude-sonnet-5",
  }, { ok: true, previous });

  assert.equal(completed.content, "First half.\nSecond half.");
  assert.equal(completed.providerTurns.length, 2);
  assert.equal(completed.citations[0].url, "https://example.com/final");
  assert.equal(completed.incomplete, false);
  assert.equal(completed.resumable, false);
});
