// BYO-key Anthropic proxy for non-mutating framework follow-up chat.
// Node.js plus a longer duration avoids the Edge first-byte timeout on web research.
import { aggregateProviderTurns } from "@/lib/chatProtocol";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "claude-sonnet-5";
const WEB_TOOL = "web_search_20260318";
const MAX_CONTINUATIONS = 8;
const MAX_REQUEST_BYTES = 2_500_000;

function jsonError(error, status, extra = {}) {
  return Response.json({ error, ...extra }, { status });
}

function parseProviderBody(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

function hasWebActivity(content) {
  return (Array.isArray(content) ? content : []).some(block =>
    block?.type === "server_tool_use" || block?.type === "web_search_tool_result",
  );
}

async function callAnthropic(apiKey, body, clientSignal, deadline) {
  const controller = new AbortController();
  let timedOut = false;
  const onClientAbort = () => controller.abort(clientSignal?.reason);
  if (clientSignal?.aborted) controller.abort(clientSignal.reason);
  else clientSignal?.addEventListener("abort", onClientAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Math.max(1, deadline - Date.now()));

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await response.text();
    return {
      response,
      data: parseProviderBody(raw),
      requestId: response.headers.get("request-id") || response.headers.get("x-request-id") || "",
    };
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error("The provider call exceeded the available run window.");
      timeoutError.name = "ProviderTimeoutError";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    clientSignal?.removeEventListener("abort", onClientAbort);
  }
}

export async function POST(request) {
  const providerTurns = [];
  let webUsed = false;
  let lastRequestId = "";
  let lastStopReason = "";
  let continuationPending = false;
  const continuationState = () => {
    const aggregate = aggregateProviderTurns(providerTurns);
    return {
      partialText: aggregate.text,
      providerTurns,
      citations: aggregate.citations,
      warnings: aggregate.warnings,
      webUsed: webUsed || aggregate.webUsed,
      requestId: lastRequestId,
      stopReason: lastStopReason || null,
      resumable: continuationPending,
    };
  };

  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_REQUEST_BYTES) return jsonError("This engagement context is too large for one chat request.", 413);

    let body;
    try { body = JSON.parse(rawBody); } catch { return jsonError("Request body must be valid JSON.", 400); }

    const { apiKey, system, messages, web = true } = body || {};
    if (!apiKey || typeof apiKey !== "string") return jsonError("Missing API key. Add yours in Settings.", 400);
    if (apiKey.length > 500) return jsonError("API key is not valid.", 400);
    if (typeof system !== "string" || !system.trim()) return jsonError("Missing framework context.", 400);
    if (!Array.isArray(messages) || messages.length === 0) return jsonError("Chat history is missing.", 400);

    let conversation = messages.map(message => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }));
    continuationPending = conversation.at(-1)?.role === "assistant";
    const deadline = Date.now() + 270_000;

    for (let attempt = 0; attempt < MAX_CONTINUATIONS && Date.now() < deadline; attempt += 1) {
      const providerBody = {
        model: MODEL,
        max_tokens: 8192,
        system,
        messages: conversation,
      };
      if (web) providerBody.tools = [{ type: WEB_TOOL, name: "web_search", max_uses: 6 }];

      const { response, data, requestId } = await callAnthropic(apiKey, providerBody, request.signal, deadline);
      lastRequestId = requestId;
      if (!data) return jsonError("Anthropic returned an unreadable response.", 502, continuationState());
      if (!response.ok) {
        const message = data?.error?.message || "Anthropic API request failed.";
        return jsonError(message, response.status, { ...continuationState(), providerStatus: response.status });
      }

      webUsed = webUsed || hasWebActivity(data.content);
      providerTurns.push(data.content);
      lastStopReason = data.stop_reason || "";
      continuationPending = data.stop_reason === "pause_turn";
      if (data.stop_reason === "refusal") {
        return jsonError("The model declined this request. Rephrase it and try again.", 422, continuationState());
      }
      if (data.stop_reason === "max_tokens") {
        return jsonError("The response reached its output limit and was not saved. Ask a narrower question and retry.", 422, continuationState());
      }
      if (data.stop_reason === "pause_turn") {
        // Provider blocks must be returned unchanged so encrypted search state survives.
        conversation = [...conversation, { role: "assistant", content: data.content }];
        continue;
      }

      const aggregate = aggregateProviderTurns(providerTurns);
      const text = aggregate.text;
      if (!text) return jsonError("The agent completed without a text response.", 502, continuationState());

      return Response.json({
        text,
        content: data.content,
        providerTurns,
        citations: aggregate.citations,
        warnings: aggregate.warnings,
        model: MODEL,
        webUsed: webUsed || aggregate.webUsed,
        usage: data.usage || null,
        requestId,
      });
    }

    return jsonError("Web research did not complete within the available run window. Continue the paused research to resume it.", 504, continuationState());
  } catch (error) {
    if (error?.name === "AbortError") return jsonError("The request was cancelled.", 408, continuationState());
    if (error?.name === "ProviderTimeoutError") return jsonError(error.message, 504, continuationState());
    return jsonError(`Request failed: ${error?.message || "unknown error"}`, 500, continuationState());
  }
}
