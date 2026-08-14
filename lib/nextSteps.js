// Pure "next steps" resolver: given a viewed framework's completed feeds, work
// out what's ready to run next. Callers pass artifacts/buckets in.
// The filled canvas ships ONLY the recommended id (or Export on RACI).
// Do not render the remaining list, locked rows, or wake counts in the brief.

import { FW, ORDER, SOURCES } from "@/lib/frameworks";
import { artifactIsComplete, deriveActiveAgents } from "@/lib/agentContext";
import { getArtifactJsonSchema } from "@/lib/frameworkArtifacts";

function sampleFromSchema(schema) {
  if (schema.const !== undefined) return schema.const;
  if (schema.enum) return schema.enum[0];
  const type = Array.isArray(schema.type) ? schema.type.find(value => value !== "null") : schema.type;
  if (type === "object") {
    return Object.fromEntries(Object.entries(schema.properties || {}).map(([key, value]) => [key, sampleFromSchema(value)]));
  }
  if (type === "array") return [sampleFromSchema(schema.items)];
  if (type === "number") return schema.minimum ?? 1;
  if (type === "string") return "x";
  return null;
}

function minimalCompleteArtifact(frameworkId) {
  const schema = getArtifactJsonSchema(frameworkId);
  if (!schema) return null;
  const artifact = { ...sampleFromSchema(schema), status: "complete" };
  if (frameworkId === "raci") {
    artifact.payload.roles = [
      { id: "owner", name: "Owner", title: "Executive owner", type: "human" },
      { id: "worker", name: "Worker", title: "Delivery lead", type: "human" },
    ];
    artifact.payload.workItems[0].assignments = [
      { roleId: "owner", code: "A" },
      { roleId: "worker", code: "R" },
    ];
  }
  return artifact;
}

const orderIndex = id => ORDER.indexOf(id);

export function resolveNextSteps({ frameworkId, artifacts = {}, buckets = {} } = {}) {
  const framework = FW[frameworkId];
  const feeds = framework?.feeds || [];
  if (!feeds.length) return { steps: [], recommended: null };

  const activeNow = new Set(deriveActiveAgents(artifacts, buckets));

  const stepList = feeds.map(id => {
    const done = artifactIsComplete(artifacts[id], id);
    const ready = !done && activeNow.has(id);
    const status = done ? "done" : ready ? "ready" : "locked";
    const missing = status === "locked"
      ? SOURCES[id].filter(source => !artifactIsComplete(artifacts[source], source)).map(source => FW[source].name)
      : [];

    const simulatedArtifacts = { ...artifacts, [id]: minimalCompleteArtifact(id) };
    const activeAfter = deriveActiveAgents(simulatedArtifacts, buckets);
    const wakes = activeAfter.filter(other => other !== id && !activeNow.has(other) && !artifactIsComplete(artifacts[other], other)).length;

    return { id, name: FW[id].name, role: FW[id].role, icon: FW[id].icon, out: FW[id].out, status, wakes, missing };
  });

  const readySteps = stepList.filter(step => step.status === "ready")
    .sort((a, b) => b.wakes - a.wakes || orderIndex(a.id) - orderIndex(b.id));
  const lockedSteps = stepList.filter(step => step.status === "locked")
    .sort((a, b) => orderIndex(a.id) - orderIndex(b.id));
  const doneSteps = stepList.filter(step => step.status === "done")
    .sort((a, b) => orderIndex(a.id) - orderIndex(b.id));

  const recommended = readySteps.length ? readySteps[0].id : null;

  return {
    steps: [...readySteps, ...lockedSteps, ...doneSteps],
    recommended,
  };
}

export function resolveNextMove({ frameworkId, artifacts = {}, buckets = {} } = {}) {
  if (frameworkId === "raci") {
    return { href: "/export", line: "Next: Export", action: "Open Export" };
  }
  const { recommended } = resolveNextSteps({ frameworkId, artifacts, buckets });
  if (!recommended || !FW[recommended]) return null;
  return {
    href: `/pipeline?select=${recommended}`,
    line: `Next: ${FW[recommended].name}`,
    action: FW[recommended].name,
  };
}

export function agentOneLiner(framework) {
  const voice = String(framework?.voice || "").trim();
  const sentence = voice.match(/^[^.!?]+[.!?]/);
  return (sentence ? sentence[0] : voice).trim();
}
