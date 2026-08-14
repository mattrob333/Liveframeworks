// Two export jobs, two files. The .md is for another agent. The HTML brief
// is the client deliverable. Neither embeds the raw artifact JSON.

import { FW, INTAKE, ORDER } from "@/lib/frameworks";
import { artifactIsComplete } from "@/lib/agentContext";
import { getArtifactSections, normalizeFrameworkArtifact } from "@/lib/frameworkArtifacts";
import { companyHostname, parseBizIntake } from "@/lib/intake";

function itemText(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) return value.map(itemText).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return itemText(
      value.text || value.claim || value.finding || value.summary || value.rationale
      || value.description || value.name || value.title || value.statement || value.objective || "",
    );
  }
  return "";
}

export function asList(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap(asList);
  const text = itemText(value);
  return text ? [text] : [];
}

function bullets(values) {
  return asList(values).map(line => `- ${line}`).join("\n");
}

export function listCompleteFrameworks(artifacts = {}) {
  return ORDER.filter(id => artifactIsComplete(artifacts[id], id));
}

export function engagementMeta(buckets = {}) {
  const parsed = parseBizIntake(buckets.biz);
  const host = companyHostname(parsed.url);
  return {
    company: host || "",
    url: parsed.url || "",
    paragraph: parsed.paragraph || "",
    title: host || "LiveFrameworks",
  };
}

// Printed brief date stays stable across time zones (noon UTC is still that calendar day).
export function formatBriefDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function coverageLine(evidenceCount, completeCount) {
  return `${evidenceCount} of ${INTAKE.length} evidence · ${completeCount} of ${ORDER.length} frameworks`;
}

export function agentDownloadName(meta = {}) {
  const host = String(meta.company || "liveframeworks").replace(/[^a-z0-9.-]+/gi, "-").replace(/^-+|-+$/g, "");
  return `${host || "liveframeworks"}-brief.md`;
}

export function flattenFrameworkMarkdown(frameworkId, artifact) {
  const normalized = normalizeFrameworkArtifact(artifact, frameworkId);
  const framework = FW[frameworkId];
  const lines = [`## ${framework?.name || frameworkId}`];
  if (normalized.summary) {
    lines.push("", normalized.summary.trim());
  }
  getArtifactSections(frameworkId, normalized).forEach(section => {
    const items = bullets(section.data);
    lines.push("", `### ${section.label}`);
    lines.push(items || "- No supported finding yet.");
  });
  if (normalized.gaps?.length) {
    lines.push("", "### Gaps", bullets(normalized.gaps));
  }
  if (normalized.assumptions?.length) {
    lines.push("", "### Assumptions", bullets(normalized.assumptions));
  }
  if (normalized.nextQuestions?.length) {
    lines.push("", "### Next questions", bullets(normalized.nextQuestions));
  }
  if (normalized.evidence?.length) {
    lines.push("", "### Sources");
    normalized.evidence.forEach(item => {
      const label = item.title || item.url || item.id || "Source";
      const kind = item.kind ? `${item.kind}: ` : "";
      const url = item.url ? ` (${item.url})` : "";
      lines.push(`- ${kind}${label}${url}`);
    });
  }
  return lines.join("\n");
}

export function buildAgentMarkdown({
  buckets = {},
  artifacts = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const meta = engagementMeta(buckets);
  const complete = listCompleteFrameworks(artifacts);
  const pending = ORDER.filter(id => !complete.includes(id));
  const lines = [
    `# ${meta.title}`,
    "",
    meta.paragraph || "LiveFrameworks engagement.",
    "",
    meta.url ? `Company: ${meta.url}` : "Company: not recorded.",
    `Generated: ${generatedAt}`,
    "",
    "## Evidence",
  ];

  let evidenceFound = false;
  INTAKE.forEach(source => {
    const value = String(buckets[source.key] || "").trim();
    if (!value) return;
    evidenceFound = true;
    lines.push("", `### ${source.name}`, "", value);
  });
  if (!evidenceFound) lines.push("", "No intake evidence is loaded.");

  complete.forEach(id => {
    lines.push("", flattenFrameworkMarkdown(id, artifacts[id]));
  });
  if (!complete.length) {
    lines.push("", "No completed frameworks yet.");
  }

  lines.push(
    "",
    "## Coverage",
    "",
    `Complete: ${complete.length} of ${ORDER.length} frameworks.`,
  );
  if (complete.length) {
    lines.push(`Done: ${complete.map(id => FW[id].name).join(", ")}.`);
  }
  if (pending.length) {
    lines.push(`Not complete: ${pending.map(id => FW[id].name).join(", ")}.`);
  }
  return `${lines.join("\n")}\n`;
}
