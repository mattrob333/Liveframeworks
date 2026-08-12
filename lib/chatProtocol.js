const MAX_LOG_MESSAGES = 60;
const MAX_PROVIDER_HISTORY_MESSAGES = 72;

function groupConversation(messages) {
  const groups = [];

  for (const message of Array.isArray(messages) ? messages : []) {
    if (message?.role === "user" || groups.length === 0) {
      groups.push([message]);
      continue;
    }
    groups.at(-1).push(message);
  }

  return groups;
}

export function trimChatLog(messages, limit = MAX_LOG_MESSAGES) {
  const groups = groupConversation(messages);
  let count = groups.reduce((sum, group) => sum + group.length, 0);

  while (groups.length > 1 && count > limit) {
    count -= groups.shift().length;
  }

  // A single exchange can exceed the soft limit when it contains paused
  // provider state. Keep it whole; the API byte limit is the final boundary.
  return groups.flat();
}

export function buildProviderHistory(messages, limit = MAX_PROVIDER_HISTORY_MESSAGES) {
  const providerMessages = (Array.isArray(messages) ? messages : [])
    .filter(message => !message?.sys)
    .flatMap(message => {
      if (message?.role === "assistant" && Array.isArray(message.providerTurns) && message.providerTurns.length) {
        return message.providerTurns.map(content => ({ role: "assistant", content }));
      }
      return {
        role: message?.role === "assistant" ? "assistant" : "user",
        content: message?.providerContent || message?.content || "",
      };
    });
  const groups = groupConversation(providerMessages);

  let count = groups.reduce((sum, group) => sum + group.length, 0);
  while (groups.length > 1 && count > limit) {
    count -= groups.shift().length;
  }
  return groups.flat();
}

export function aggregateProviderTurns(providerTurns) {
  const blocks = (Array.isArray(providerTurns) ? providerTurns : [])
    .flatMap(turn => Array.isArray(turn) ? turn : []);
  const seen = new Set();
  const citations = [];

  for (const block of blocks) {
    for (const citation of Array.isArray(block?.citations) ? block.citations : []) {
      const url = citation.url || citation.source;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      citations.push({
        url,
        title: citation.title || url,
        citedText: citation.cited_text || "",
      });
    }
  }

  return {
    text: blocks
      .filter(block => block?.type === "text")
      .map(block => block.text)
      .filter(Boolean)
      .join("\n")
      .trim(),
    citations,
    warnings: blocks
      .filter(block => block?.type === "web_search_tool_result" && block?.content?.type === "web_search_tool_result_error")
      .map(block => block.content.error_code)
      .filter(Boolean),
    webUsed: blocks.some(block => block?.type === "server_tool_use" || block?.type === "web_search_tool_result"),
  };
}

function mergeCitations(...collections) {
  const seen = new Set();
  const citations = [];

  for (const citation of collections.flatMap(value => Array.isArray(value) ? value : [])) {
    const url = citation?.url || citation?.source;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    citations.push({
      url,
      title: citation.title || url,
      citedText: citation.citedText || citation.cited_text || "",
    });
  }

  return citations;
}

export function buildAssistantLogMessage(data, { ok = true, previous = null } = {}) {
  const priorTurns = Array.isArray(previous?.providerTurns) ? previous.providerTurns : [];
  const newTurns = Array.isArray(data?.providerTurns) ? data.providerTurns : [];
  const providerTurns = [...priorTurns, ...newTurns];
  const aggregate = aggregateProviderTurns(providerTurns);
  const failed = !ok || Boolean(data?.error);
  const error = failed ? (data?.error || "Agent request failed.") : "";
  const requestSuffix = data?.requestId ? ` Request ${data.requestId}.` : "";
  const answer = aggregate.text || data?.partialText || data?.text || "";
  const content = failed
    ? answer
      ? `${answer}\n\n[Research incomplete: ${error}${requestSuffix}]`
      : `(${error}${requestSuffix})`
    : answer || "(No response was returned.)";

  return {
    role: "assistant",
    content,
    providerContent: !failed && Array.isArray(data?.content) ? data.content : null,
    providerTurns: providerTurns.length ? providerTurns : null,
    citations: mergeCitations(previous?.citations, data?.citations, aggregate.citations),
    warnings: [...new Set([
      ...(Array.isArray(previous?.warnings) ? previous.warnings : []),
      ...(Array.isArray(data?.warnings) ? data.warnings : []),
      ...aggregate.warnings,
    ])],
    model: data?.model || previous?.model || null,
    webUsed: Boolean(data?.webUsed || previous?.webUsed || aggregate.webUsed),
    requestId: data?.requestId || previous?.requestId || "",
    error: error || null,
    incomplete: failed,
    resumable: failed && Boolean(data?.resumable) && providerTurns.length > 0,
  };
}
