import { FW, INTAKE, ORDER, SOURCES } from "@/lib/frameworks";

const clip = (value, limit) => {
  const text = String(value || "").trim();
  return text.length > limit ? text.slice(0, limit) + "\n[...truncated]" : text;
};

export function deriveActiveAgents(outputs) {
  const completed = key => Boolean(String(outputs[key] || "").trim());
  return ORDER.filter(key => key === "bmc" || (SOURCES[key].length > 0 && SOURCES[key].every(completed)));
}

export function buildEvidenceBlock(key, buckets, outputs) {
  const relevantBuckets = new Set(INTAKE.filter(source => source.readers.includes(key)).map(source => source.key));
  const directOutputs = new Set(SOURCES[key]);
  const parts = [];

  INTAKE.forEach(source => {
    const value = clip(buckets[source.key], 8000);
    if (!value) return;
    const relevance = relevantBuckets.has(source.key) ? "PRIMARY INPUT" : "SHARED ENGAGEMENT CONTEXT";
    parts.push(`--- ${relevance}: ${source.name} ---\n${value}`);
  });

  ORDER.forEach(upstreamKey => {
    if (upstreamKey === key) return;
    const value = clip(outputs[upstreamKey], 7000);
    if (!value) return;
    const relevance = directOutputs.has(upstreamKey) ? "DIRECT UPSTREAM OUTPUT" : "OTHER LOCKED SHARED-STATE OUTPUT";
    parts.push(`--- ${relevance}: ${FW[upstreamKey].name} (${FW[upstreamKey].role}) ---\n${value}`);
  });

  return parts.length ? parts.join("\n\n") : "No evidence buckets are loaded and no framework outputs exist yet.";
}

export function buildUpstreamStatus(key, outputs) {
  if (!SOURCES[key].length) return "You have no upstream agents — you are fed by intake buckets only.";
  return SOURCES[key].map(upstreamKey =>
    `${FW[upstreamKey].name} (${FW[upstreamKey].role}): ${outputs[upstreamKey] ? "OUTPUT PRESENT — included below" : "NOT RUN — has produced NOTHING"}`
  ).join("\n");
}

export function readEngagementState(getBucket, getOutput) {
  return {
    buckets: Object.fromEntries(INTAKE.map(source => [source.key, getBucket(source.key)])),
    outputs: Object.fromEntries(ORDER.map(key => [key, getOutput(key)])),
  };
}
