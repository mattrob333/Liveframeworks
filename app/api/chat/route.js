// Proxies chat requests to the Anthropic API using the user's own key.
// The key is sent per-request from the browser and never stored server-side.
export const runtime = "edge";
const MODEL = "claude-sonnet-5";
const MAX_PAUSE_TURNS = 3;

export async function POST(req) {
  try {
    const { apiKey, system, messages, web } = await req.json();
    if (!apiKey) return Response.json({ error: "Missing API key. Add yours in Settings." }, { status: 400 });

    console.log("[api/chat] request", { model: MODEL, messageCount: messages?.length || 0, web: Boolean(web) });
    let conversation = Array.isArray(messages) ? messages : [];

    for (let attempt = 0; attempt < MAX_PAUSE_TURNS; attempt += 1) {
      const body = { model: MODEL, max_tokens: 2000, system, messages: conversation };
      if (web) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }];

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || "Anthropic API error";
        console.error("[api/chat] provider error", { model: MODEL, status: res.status, message: msg });
        return Response.json({ error: msg }, { status: res.status });
      }
      if (data.stop_reason === "refusal") {
        return Response.json({ error: "The model declined this request. Rephrase it and try again." }, { status: 422 });
      }
      if (data.stop_reason === "pause_turn") {
        conversation = [...conversation, { role: "assistant", content: data.content }];
        continue;
      }

      const text = (data.content || []).filter(block => block.type === "text").map(block => block.text).join("\n").trim();
      console.log("[api/chat] success", { model: MODEL, stopReason: data.stop_reason, textLength: text.length });
      return Response.json({ text, model: MODEL });
    }

    return Response.json({ error: "Web research did not finish after three continuation turns. Please retry." }, { status: 504 });
  } catch (e) {
    console.error("[api/chat] request failed", { message: e.message });
    return Response.json({ error: "Request failed: " + e.message }, { status: 500 });
  }
}
