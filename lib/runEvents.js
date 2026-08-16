// Phase 1d — structural honesty. The run UI may only show these event types.
// Fabricated narration (a type the server never emitted) is unrepresentable:
// interpretRunEvent never invents a type, and runEventLine returns null
// for anything outside this list.
export const RUN_EVENT_ALLOWLIST = Object.freeze([
  "phase",
  "search_query",
  "search_results",
  "writing",
  "research_complete",
  "result",
  "error",
]);

export function isAllowlistedRunEventType(type) {
  return RUN_EVENT_ALLOWLIST.includes(type);
}

export function interpretRunEvent(event, searchCount = 0) {
  if (!event || typeof event !== "object") return { searchCount };

  // Pass the raw type through. Never map it to a different type.
  const type = event.type;

  if (type === "phase") {
    if (event.phase === "research") return { type, phase: 1, detail: "Reading the company and planning searches…", searchCount };
    if (event.phase === "synthesis") return { type, phase: 2, detail: "Structuring the framework artifact…", searchCount };
    if (event.phase === "repair") return { type, phase: 3, detail: "Tightening the artifact to fit the schema…", searchCount };
    if (event.phase === "validating") return { type, phase: 3, detail: "Validating the artifact against its schema…", searchCount };
    return { type, searchCount };
  }
  if (type === "search_query" && event.query) {
    const nextCount = searchCount + 1;
    return { type, phase: 1, detail: `Search ${nextCount}: “${event.query}”`, searchCount: nextCount };
  }
  if (type === "search_results") {
    return { type, detail: `Reading ${event.count} search result${event.count === 1 ? "" : "s"}…`, searchCount };
  }
  if (type === "writing") {
    return {
      type,
      detail: event.phase === "research"
        ? "Compiling the evidence brief…"
        : `Writing the artifact… ~${Math.max(1, Math.round(event.chars / 4))} tokens`,
      searchCount,
    };
  }
  if (type === "research_complete") {
    return { type, phase: 2, detail: `Research done — ${event.searches} searches, ${event.sources} sources.`, searchCount };
  }
  if (type === "result") return { type, result: event, searchCount };
  if (type === "error") return { type, error: event.error, searchCount };

  // Unknown / fabricated types keep their raw type and get no display line.
  return { type, searchCount };
}

// The only path from a run event to a visible log line.
// No default narration: a type that is not allowlisted cannot become copy.
export function runEventLine(event) {
  if (!event || !isAllowlistedRunEventType(event.type)) return null;

  switch (event.type) {
    case "phase":
    case "search_query":
    case "search_results":
    case "writing":
    case "research_complete":
      return typeof event.detail === "string" && event.detail ? event.detail : null;
    case "result":
    case "error":
      return null;
    default:
      return null;
  }
}
