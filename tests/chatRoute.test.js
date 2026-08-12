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

function chatRequest() {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      apiKey: "test-key",
      system: "Answer against the locked artifact.",
      messages: [{ role: "user", content: "Research this." }],
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
  assert.equal(body.requestId, "request-8");
  assert.equal(call, 8);
});
