// Proxies chat requests to the Anthropic API using the user's own key.
// The key is sent per-request from the browser and never stored server-side.
export const runtime = "edge";

export async function POST(req) {
  try {
    const { apiKey, system, messages, web } = await req.json();
    if (!apiKey) return Response.json({ error: "Missing API key. Add yours in Settings." }, { status: 400 });

    const body = {
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system,
      messages,
    };
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
      return Response.json({ error: msg }, { status: res.status });
    }
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: "Request failed: " + e.message }, { status: 500 });
  }
}
