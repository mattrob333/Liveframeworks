import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/chat/route.js";

function providerResponse(content, stopReason, requestId) {
  return new Response(JSON.stringify({
    content,
    stop_reason: stopReason,
    usage: { input_tokens: 10, output_tokens: 5 },
  }), {
    status: 200,
    headers: { "content-type": "application/json", "request-id": requestId },
  });
}

function chatRequest(messages = [{ role: "user", content: "Research this." }]) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      apiKey: "test-key",
      system: "Answer against the locked artifact.",
      messages,
      web: true,
    }),
  });
}

test("chat route returns all pause-turn text and citations without altering provider blocks", { concurrency: false }, async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const responses = [
    providerResponse([
      { type: "server_tool_use", name: "web_search" },
      {
        type: "text",
        text: "First half.",
        citations: [{ url: "https://example.com/one", title: "One" }],
      },
    ], "pause_turn", "request-1"),
    providerResponse([
      {
        type: "text",
        text: "Second half.",
        citations: [{ url: "https://example.com/two", title: "Two" }],
      },
    ], "end_turn", "request-2"),
  ];
  globalThis.fetch = async () => responses.shift();

  const response = await POST(chatRequest());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.text, "First half.\nSecond half.");
  assert.equal(body.providerTurns.length, 2);
  assert.deepEqual(body.citations.map(citation => citation.url), [
    "https://example.com/one",
    "https://example.com/two",
  ]);
  assert.equal(body.webUsed, true);
  assert.equal(body.requestId, "request-2");
});

test("continuation-limit errors return resumable raw provider turns", { concurrency: false }, async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let call = 0;
  globalThis.fetch = async () => {
    call += 1;
    return providerResponse([
      { type: "text", text: `Partial ${call}.` },
    ], "pause_turn", `request-${call}`);
  };

  const response = await POST(chatRequest());
  const body = await response.json();

  assert.equal(response.status, 504);
  assert.equal(body.providerTurns.length, 8);
  assert.match(body.partialText, /Partial 1\./);
  assert.match(body.partialText, /Partial 8\./);
  assert.equal(body.resumable, true);
  assert.equal(body.stopReason, "pause_turn");
  assert.equal(body.requestId, "request-8");
  assert.equal(call, 8);
});

test("chat route accepts more than eighty bounded history messages", { concurrency: false }, async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let providerMessageCount = 0;
  globalThis.fetch = async (_url, options) => {
    providerMessageCount = JSON.parse(options.body).messages.length;
    return providerResponse([{ type: "text", text: "History accepted." }], "end_turn", "request-long");
  };
  const messages = Array.from({ length: 100 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `message ${index}`,
  }));

  const response = await POST(chatRequest(messages));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.text, "History accepted.");
  assert.equal(providerMessageCount, 100);
});

test("an assistant-ending recovery request remains resumable if its provider call times out", { concurrency: false }, async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => {
    const error = new Error("provider unavailable");
    error.name = "ProviderTimeoutError";
    throw error;
  };

  const response = await POST(chatRequest([
    { role: "user", content: "Research this." },
    { role: "assistant", content: [{ type: "text", text: "Paused partial." }] },
  ]));
  const body = await response.json();

  assert.equal(response.status, 504);
  assert.equal(body.resumable, true);
});
