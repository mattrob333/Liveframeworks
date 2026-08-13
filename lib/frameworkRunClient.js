"use client";

import { FW, INTAKE, ORDER, SOURCES } from "@/lib/frameworks";
import {
  getArtifact,
  getBucket,
  getChat,
  getKey,
  getLatestRun,
  hasApiKey,
  setActive,
  setArtifact,
  upsertRun,
} from "@/lib/store";
import {
  artifactIsComplete,
  buildContextSnapshot,
  deriveActiveAgents,
  getAffectedFrameworks,
  shouldReplaceCurrentArtifact,
} from "@/lib/agentContext";
import { normalizeFrameworkArtifact, validateFrameworkArtifact } from "@/lib/frameworkArtifacts";
import { saveGenerationRecord, updateGenerationRecord } from "@/lib/generationStore";

export const RUN_PHASES = [
  "Reading saved context",
  "Researching the company and market",
  "Structuring the framework",
  "Finishing research and validating the artifact",
];

export function createRunId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export { hasApiKey };

export function currentBuckets() {
  return Object.fromEntries(INTAKE.map(item => [item.key, getBucket(item.key)]));
}

export function currentArtifacts() {
  return Object.fromEntries(ORDER.map(key => [key, getArtifact(key)]));
}

export function interpretRunEvent(event, searchCount = 0) {
  if (!event || typeof event !== "object") return { searchCount };
  if (event.type === "phase") {
    if (event.phase === "research") return { phase: 1, detail: "Reading the company and planning searches…", searchCount };
    if (event.phase === "synthesis") return { phase: 2, detail: "Structuring the framework artifact…", searchCount };
    if (event.phase === "repair") return { phase: 3, detail: "Tightening the artifact to fit the schema…", searchCount };
    if (event.phase === "validating") return { phase: 3, detail: "Validating the artifact against its schema…", searchCount };
  }
  if (event.type === "search_query" && event.query) {
    const nextCount = searchCount + 1;
    return { phase: 1, detail: `Search ${nextCount}: “${event.query}”`, searchCount: nextCount };
  }
  if (event.type === "search_results") {
    return { detail: `Reading ${event.count} search result${event.count === 1 ? "" : "s"}…`, searchCount };
  }
  if (event.type === "writing") {
    return {
      detail: event.phase === "research"
        ? "Compiling the evidence brief…"
        : `Writing the artifact… ~${Math.max(1, Math.round(event.chars / 4))} tokens`,
      searchCount,
    };
  }
  if (event.type === "research_complete") {
    return { phase: 2, detail: `Research done — ${event.searches} searches, ${event.sources} sources.`, searchCount };
  }
  if (event.type === "result") return { result: event, searchCount };
  if (event.type === "error") return { error: event.error, searchCount };
  return { searchCount };
}

export function markDependentArtifactsStale(seedIds, reason, { includeSeeds = true, baseArtifacts } = {}) {
  const nextArtifacts = { ...(baseArtifacts || currentArtifacts()) };
  const staled = [];
  const failures = [];
  getAffectedFrameworks(seedIds, includeSeeds).forEach(key => {
    const current = nextArtifacts[key];
    if (!artifactIsComplete(current, key)) return;
    const stale = {
      ...current,
      status: "stale",
      staleAt: new Date().toISOString(),
      staleReason: reason,
    };
    const result = setArtifact(key, stale);
    if (!result.ok) {
      failures.push(`${FW[key].name}: ${result.error}`);
      return;
    }
    nextArtifacts[key] = stale;
    staled.push(key);
  });
  setActive(deriveActiveAgents(nextArtifacts, currentBuckets()));
  return { nextArtifacts, staled, failures };
}

export function interruptInFlightRuns() {
  ORDER.forEach(key => {
    const latest = getLatestRun(key);
    if (!latest || !["queued", "researching", "generating", "validating"].includes(latest.status)) return;
    const interrupted = {
      ...latest,
      status: "interrupted",
      completedAt: new Date().toISOString(),
      error: "The page reloaded before this browser received the completed response. Retry with the same saved context.",
    };
    upsertRun(key, interrupted);
    void updateGenerationRecord(latest.id, {
      status: interrupted.status,
      completedAt: interrupted.completedAt,
      error: interrupted.error,
    }).catch(error => {
      upsertRun(key, {
        ...interrupted,
        storageWarning: error?.message || "The interrupted archive record could not be reconciled.",
      });
    });
  });
}

function errorText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.message || "Framework generation failed.";
}

export async function executeFrameworkRun({
  frameworkId,
  instruction = "",
  signal,
  onStart,
  onProgress,
} = {}) {
  if (!hasApiKey()) {
    return { ok: false, code: "missing_api_key", error: "Add your Anthropic API key in Settings before starting research." };
  }

  const artifactMap = currentArtifacts();
  const bucketMap = currentBuckets();
  const chatMap = Object.fromEntries(ORDER.map(key => [key, getChat(key)]));
  const ready = deriveActiveAgents(artifactMap, bucketMap).includes(frameworkId);
  if (!ready) {
    const unmet = (SOURCES[frameworkId] || [])
      .filter(key => !artifactIsComplete(artifactMap[key], key))
      .map(key => FW[key].name);
    const error = frameworkId === "bmc" && unmet.length === 0
      ? "Add a company URL and a short description before drawing the Business Model Canvas."
      : `Complete ${unmet.join(", ") || "the required inputs"} first.`;
    return { ok: false, code: "not_ready", error };
  }

  const id = createRunId();
  const existing = artifactMap[frameworkId];
  const revision = artifactIsComplete(existing, frameworkId) ? Number(existing.revision || 1) + 1 : 1;
  const starter = `Read the saved context, research the company, and create the ${FW[frameworkId].name}.`;
  const fullInstruction = instruction.trim() ? `${starter}\n\nAdditional direction: ${instruction.trim()}` : starter;
  const context = buildContextSnapshot(frameworkId, bucketMap, artifactMap, fullInstruction, chatMap);
  const record = {
    id,
    frameworkId,
    mode: artifactIsComplete(existing, frameworkId) ? "regenerate" : "initial",
    status: "researching",
    startedAt: new Date().toISOString(),
    completedAt: null,
    contextSnapshotId: context.id,
    inputFingerprint: context.inputFingerprint,
    artifactRevision: revision,
    model: "claude-sonnet-5",
    webUsed: false,
    error: null,
  };
  const persisted = upsertRun(frameworkId, record);
  if (!persisted.ok) {
    return { ok: false, code: "persist_failed", error: `The run could not be saved before generation: ${persisted.error}` };
  }
  try {
    await saveGenerationRecord({ ...record, context, instruction: fullInstruction });
  } catch (error) {
    upsertRun(frameworkId, { ...record, status: "failed", error: error?.message || "Generation storage is unavailable." });
    return {
      ok: false,
      code: "archive_failed",
      error: `The run was not started because its full context could not be saved: ${error?.message || "generation storage is unavailable"}`,
    };
  }

  onStart?.({ runId: id, frameworkId, revision });
  onProgress?.({ phase: 0, detail: "Snapshotting evidence and opening the run…" });

  let archiveRecord = null;
  try {
    const response = await fetch("/api/framework-run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal,
      body: JSON.stringify({
        apiKey: getKey(),
        frameworkId,
        instruction: fullInstruction,
        context,
        runId: id,
        revision,
      }),
    });

    let data = null;
    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.includes("ndjson") && response.body) {
      let searchCount = 0;
      const handleEvent = event => {
        const interpreted = interpretRunEvent(event, searchCount);
        searchCount = interpreted.searchCount;
        if (interpreted.result) data = interpreted.result;
        else if (interpreted.error) data = { error: interpreted.error };
        else onProgress?.(interpreted);
      };

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const consumeLine = line => {
        if (!line.trim()) return;
        try { handleEvent(JSON.parse(line)); } catch { /* skip malformed line */ }
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        lines.forEach(consumeLine);
      }
      consumeLine(buffer);
      if (!data) throw new Error("The run stream ended without a result. Retry the run.");
    } else {
      const raw = await response.text();
      try { data = JSON.parse(raw); } catch { data = { error: `The generation service returned an unreadable response (${response.status}).` }; }
    }

    if (!response.ok || data.error) throw new Error(errorText(data.error) || "Framework generation failed.");
    onProgress?.({ detail: "Saving the validated artifact…" });

    const generationStatus = data.status || data.artifact?.status || "complete";
    const normalized = normalizeFrameworkArtifact({
      ...data.artifact,
      frameworkId,
      runId: id,
      revision,
      status: generationStatus,
      model: data.model || "claude-sonnet-5",
      generatedAt: data.artifact?.generatedAt || new Date().toISOString(),
    }, frameworkId);
    const validation = validateFrameworkArtifact(normalized, frameworkId, { requireContent: generationStatus === "complete" });
    if (!validation.valid) throw new Error(`The generated artifact failed validation: ${validation.errors.join("; ")}`);

    let archiveWarning = "";
    const completedAt = new Date().toISOString();
    archiveRecord = {
      ...record,
      status: generationStatus,
      completedAt,
      context,
      instruction: fullInstruction,
      artifact: normalized,
      research: data.research || null,
      usage: data.usage || null,
      webUsed: Boolean(data.webUsed),
    };
    try {
      await saveGenerationRecord(archiveRecord);
    } catch (error) {
      archiveWarning = error?.message || "The full research archive could not be saved.";
    }

    const shouldReplaceCurrent = shouldReplaceCurrentArtifact(existing, generationStatus, frameworkId);
    let nextArtifacts = { ...artifactMap };
    if (shouldReplaceCurrent) {
      const saved = setArtifact(frameworkId, normalized);
      if (!saved.ok) throw new Error(`The result is preserved in the run archive, but current-artifact storage failed: ${saved.error}`);
      nextArtifacts[frameworkId] = normalized;
    }

    if (generationStatus === "complete") {
      const stale = markDependentArtifactsStale(
        [frameworkId],
        `${FW[frameworkId].name} advanced to revision ${revision}.`,
        { includeSeeds: false, baseArtifacts: nextArtifacts },
      );
      nextArtifacts = stale.nextArtifacts;
      if (stale.failures.length) {
        archiveWarning = [archiveWarning, `Could not mark every descendant stale: ${stale.failures.join("; ")}`].filter(Boolean).join(" ");
      }
    }

    upsertRun(frameworkId, {
      ...record,
      status: generationStatus,
      completedAt,
      webUsed: Boolean(data.webUsed),
      usage: data.usage || null,
      researchSummary: data.research ? {
        sourceCount: data.research.sources?.length || 0,
        citationCount: data.research.citations?.length || 0,
        providerRequestIds: data.research.providerRequestIds || [],
      } : null,
      storageWarning: archiveWarning || null,
    });
    setActive(deriveActiveAgents(nextArtifacts, bucketMap));

    if (generationStatus === "complete") {
      if (archiveWarning) {
        try { sessionStorage.setItem(`lf:run-warning:${id}`, archiveWarning); } catch { /* The warning remains on the run record. */ }
      }
      return { ok: true, status: "complete", runId: id, artifact: normalized, archiveWarning };
    }

    const questions = Array.isArray(normalized.nextQuestions) ? normalized.nextQuestions.filter(Boolean) : [];
    const priorPreserved = existing && !shouldReplaceCurrent;
    return {
      ok: true,
      status: generationStatus,
      runId: id,
      artifact: normalized,
      archiveWarning,
      message: `${priorPreserved ? "The prior artifact remains available. " : ""}The agent needs more input before this result can unlock downstream work.${questions.length ? ` Next: ${questions.join(" · ")}` : ""}`,
    };
  } catch (error) {
    const interrupted = error?.name === "AbortError";
    const failure = {
      ...record,
      status: interrupted ? "interrupted" : "failed",
      completedAt: new Date().toISOString(),
      error: interrupted ? "Cancelled by user." : error?.message || "Framework generation failed.",
    };
    let archiveFailure = "";
    try {
      await saveGenerationRecord(archiveRecord
        ? { ...archiveRecord, status: failure.status, completedAt: failure.completedAt, deliveryError: failure.error }
        : { ...failure, context, instruction: fullInstruction });
    } catch (archiveError) {
      archiveFailure = archiveError?.message || "The final run state could not be archived.";
    }
    upsertRun(frameworkId, { ...failure, storageWarning: archiveFailure || null });
    const message = interrupted ? "Run cancelled. Your saved context was not changed." : error?.message || "Framework generation failed.";
    return {
      ok: false,
      interrupted,
      runId: id,
      error: `${message}${archiveFailure ? ` Archive warning: ${archiveFailure}` : ""}`,
    };
  }
}
