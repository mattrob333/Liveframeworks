const MAX_LOG_MESSAGES = 60;
const MAX_PROVIDER_HISTORY_MESSAGES = 72;

export function trimChatLog(messages, limit = MAX_LOG_MESSAGES) {
  return (Array.isArray(messages) ? messages : []).slice(-limit);
}

export function buildProviderHistory(messages, limit = MAX_PROVIDER_HISTORY_MESSAGES) {
  const groups = (Array.isArray(messages) ? messages : [])
    .filter(message => !message?.sys)
    .map(message => {
      if (message?.role === "assistant" && Array.isArray(message.providerTurns) && message.providerTurns.length) {
        return message.providerTurns.map(content => ({ role: "assistant", content }));
      }
      return [{
        role: message?.role === "assistant" ? "assistant" : "user",
        content: message?.providerContent || message?.content || "",
      }];
    });

  let count = groups.reduce((sum, group) => sum + group.length, 0);
  while (groups.length > 1 && count > limit) {
    count -= groups.shift().length;
  }
  const history = groups.flat();
  return history.length > limit ? history.slice(-limit) : history;
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
