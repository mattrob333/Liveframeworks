"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STAGES, INTAKE, FW, ORDER, SOURCES } from "@/lib/frameworks";
import {
  getArtifact,
  getBucket,
  getKey,
  getLatestRun,
  setActive,
  setArtifact,
  setBucket,
  upsertRun,
} from "@/lib/store";
import {
  artifactIsComplete,
  buildContextSnapshot,
  deriveActiveAgents,
  getAffectedFrameworks,
  getBucketAffectedFrameworks,
  shouldReplaceCurrentArtifact,
} from "@/lib/agentContext";
import { normalizeFrameworkArtifact, validateFrameworkArtifact } from "@/lib/frameworkArtifacts";
import { saveGenerationRecord, updateGenerationRecord } from "@/lib/generationStore";
import { getModalFocusableElements, trapModalTabKey } from "@/lib/modalFocus";
import LoadingState from "@/components/LoadingState";

const RUN_PHASES = [
  "Reading saved context",
  "Researching the company and market",
  "Structuring the framework",
  "Finishing research and validating the artifact",
];

function runId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function statusFor(frameworkId, artifact, latestRun, ready) {
  if (latestRun && ["queued", "researching", "generating", "validating"].includes(latestRun.status)) return "running";
  if (artifact?.status === "stale") return "stale";
  if (["failed", "interrupted", "needs_input"].includes(latestRun?.status)) return "attention";
  if (artifactIsComplete(artifact, frameworkId)) return "complete";
  return ready ? "ready" : "locked";
}

function runStatusLabel(status) {
  return ({
    running: "RUNNING",
    complete: "COMPLETE",
    stale: "STALE",
    attention: "NEEDS ATTENTION",
    ready: "READY",
    locked: "LOCKED",
  })[status] || status.toUpperCase();
}

export default function Pipeline() {
  const router = useRouter();
  const abortRef = useRef(null);
  const inspectorRef = useRef(null);
  const inspectorTriggerRef = useRef(null);
  const pipelineHeaderRef = useRef(null);
  const pipelineContentRef = useRef(null);
  const mobileDialogWasOpenRef = useRef(false);
  const [selectedIntake, setSelectedIntake] = useState(null);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [bucketText, setBucketText] = useState("");
  const [bucketStatus, setBucketStatus] = useState("");
  const [runMessage, setRunMessage] = useState("");
  const [instruction, setInstruction] = useState("");
  const [busyFramework, setBusyFramework] = useState("");
  const [phase, setPhase] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [buckets, setBuckets] = useState({});
  const [artifacts, setArtifacts] = useState({});
  const [latestRuns, setLatestRuns] = useState({});
  const [isMobileInspector, setIsMobileInspector] = useState(false);

  function refresh() {
    setBuckets(Object.fromEntries(INTAKE.map(source => [source.key, getBucket(source.key)])));
    setArtifacts(Object.fromEntries(ORDER.map(key => [key, getArtifact(key)])));
    setLatestRuns(Object.fromEntries(ORDER.map(key => [key, getLatestRun(key)])));
  }

  useEffect(() => {
    ORDER.forEach(key => {
      const latest = getLatestRun(key);
      if (latest && ["queued", "researching", "generating", "validating"].includes(latest.status)) {
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
      }
    });
    refresh();
    setHydrated(true);
    const onStorage = () => refresh();
    window.addEventListener("lf:storage", onStorage);
    return () => window.removeEventListener("lf:storage", onStorage);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 999px)");
    const sync = () => setIsMobileInspector(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!selectedIntake) return;
    setBucketText(getBucket(selectedIntake));
    setBucketStatus("");
  }, [selectedIntake]);

  useEffect(() => {
    if (!busyFramework) return undefined;
    const timers = [
      window.setTimeout(() => setPhase(1), 1600),
      window.setTimeout(() => setPhase(2), 13000),
      window.setTimeout(() => setPhase(3), 30000),
    ];
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [busyFramework]);

  const mobileDialogOpen = isMobileInspector && Boolean(selectedFramework || selectedIntake);

  useEffect(() => {
    if (!mobileDialogOpen) return undefined;

    const dialog = inspectorRef.current;
    if (!dialog) return undefined;

    const background = [
      document.querySelector(".topnav"),
      pipelineHeaderRef.current,
      pipelineContentRef.current,
      document.querySelector("footer"),
    ].filter(Boolean);
    const previousBackgroundState = background.map(node => ({
      node,
      inert: node.inert,
      ariaHidden: node.getAttribute("aria-hidden"),
    }));
    background.forEach(node => {
      node.inert = true;
      node.setAttribute("aria-hidden", "true");
    });

    if (!dialog.contains(document.activeElement)) {
      window.requestAnimationFrame(() => (getModalFocusableElements(dialog)[0] || dialog).focus());
    }

    const onKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeInspector({ cancelBusy: Boolean(busyFramework) });
        return;
      }
      trapModalTabKey(event, dialog);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousBackgroundState.forEach(({ node, inert, ariaHidden }) => {
        node.inert = inert;
        if (ariaHidden === null) node.removeAttribute("aria-hidden");
        else node.setAttribute("aria-hidden", ariaHidden);
      });
    };
  }, [mobileDialogOpen, busyFramework]);

  useEffect(() => {
    if (mobileDialogWasOpenRef.current && !mobileDialogOpen) {
      const trigger = inspectorTriggerRef.current;
      window.requestAnimationFrame(() => {
        if (trigger?.isConnected && !trigger.disabled) trigger.focus();
      });
    }
    mobileDialogWasOpenRef.current = mobileDialogOpen;
  }, [mobileDialogOpen]);

  const active = useMemo(() => deriveActiveAgents(artifacts), [artifacts]);
  const source = selectedIntake ? INTAKE.find(item => item.key === selectedIntake) : null;
  const framework = selectedFramework ? FW[selectedFramework] : null;
  const frameworkStage = framework ? STAGES.find(stage => stage.key === framework.stage) : null;
  const selectedArtifact = selectedFramework ? artifacts[selectedFramework] : null;
  const selectedLatestRun = selectedFramework ? latestRuns[selectedFramework] : null;

  if (!hydrated) {
    return <main className="page-loading"><LoadingState label="Opening engagement" variant="Drive" phase={0} /></main>;
  }

  function selectIntake(key) {
    if (busyFramework) {
      setRunMessage(`Finish or cancel the ${FW[busyFramework].name} run before changing the inspector.`);
      return;
    }
    if (!selectedFramework && !selectedIntake) inspectorTriggerRef.current = document.activeElement;
    setSelectedFramework(null);
    setInstruction("");
    setRunMessage("");
    setSelectedIntake(current => current === key ? null : key);
  }

  function selectFramework(key) {
    if (busyFramework) {
      setRunMessage(`Finish or cancel the ${FW[busyFramework].name} run before changing the inspector.`);
      return;
    }
    if (!selectedFramework && !selectedIntake) inspectorTriggerRef.current = document.activeElement;
    setSelectedIntake(null);
    setSelectedFramework(key);
    setInstruction("");
    setRunMessage("");
  }

  function closeInspector({ cancelBusy = false } = {}) {
    if (busyFramework && !cancelBusy) return;
    if (busyFramework && cancelBusy) {
      abortRef.current?.abort();
      setBusyFramework("");
      setStartedAt(null);
    }
    setSelectedFramework(null);
    setSelectedIntake(null);
    setRunMessage("");
  }

  function staleArtifacts(seedIds, reason, { includeSeeds = true, baseArtifacts } = {}) {
    const nextArtifacts = { ...(baseArtifacts || Object.fromEntries(ORDER.map(key => [key, getArtifact(key)]))) };
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
    setActive(deriveActiveAgents(nextArtifacts));
    return { nextArtifacts, staled, failures };
  }

  function saveBucket() {
    const previous = getBucket(selectedIntake);
    const result = setBucket(selectedIntake, bucketText);
    if (!result.ok) {
      setBucketStatus(`Could not save: ${result.error}`);
      return;
    }
    const stale = previous !== bucketText
      ? staleArtifacts(getBucketAffectedFrameworks(selectedIntake), `${source.name} changed.`)
      : { staled: [], failures: [] };
    setBucketStatus(`Saved. Every agent will receive this as engagement context; ${source.readers.map(reader => FW[reader].role).join(", ")} treat it as a primary input.${stale.staled.length ? ` ${stale.staled.length} artifact(s) marked stale.` : ""}${stale.failures.length ? ` Could not mark stale: ${stale.failures.join("; ")}` : ""}`);
    refresh();
  }

  async function onFiles(event) {
    const previous = getBucket(selectedIntake);
    let value = bucketText;
    for (const file of [...event.target.files]) {
      const text = await file.text();
      value += (value.trim() ? "\n\n" : "") + `=== FILE: ${file.name} ===\n${text}`;
    }
    setBucketText(value);
    const result = setBucket(selectedIntake, value);
    if (result.ok && previous !== value) {
      const stale = staleArtifacts(getBucketAffectedFrameworks(selectedIntake), `${source.name} changed.`);
      setBucketStatus(`${event.target.files.length} file(s) loaded and saved.${stale.staled.length ? ` ${stale.staled.length} dependent artifact(s) marked stale.` : ""}${stale.failures.length ? ` Could not mark stale: ${stale.failures.join("; ")}` : ""}`);
    } else {
      setBucketStatus(result.ok ? `${event.target.files.length} file(s) loaded and saved.` : `Could not save: ${result.error}`);
    }
    refresh();
  }

  function clearBucket() {
    const previous = getBucket(selectedIntake);
    setBucketText("");
    const result = setBucket(selectedIntake, "");
    if (!result.ok) {
      setBucketStatus(`Could not clear: ${result.error}`);
      return;
    }
    const stale = previous
      ? staleArtifacts(getBucketAffectedFrameworks(selectedIntake), `${source.name} was cleared.`)
      : { staled: [], failures: [] };
    setBucketStatus(`Bucket cleared.${stale.staled.length ? ` ${stale.staled.length} dependent artifact(s) marked stale.` : ""}${stale.failures.length ? ` Could not mark stale: ${stale.failures.join("; ")}` : ""}`);
    refresh();
  }

  function copyTemplate() {
    navigator.clipboard.writeText(source.template).then(() => setBucketStatus("Template copied. Fill it in and paste it back here."));
  }

  async function runFramework(frameworkId) {
    if (busyFramework) return;
    if (!getKey()) {
      setRunMessage("Add your Anthropic API key in Settings before starting research.");
      return;
    }

    const artifactMap = Object.fromEntries(ORDER.map(key => [key, getArtifact(key)]));
    const bucketMap = Object.fromEntries(INTAKE.map(item => [item.key, getBucket(item.key)]));
    const ready = deriveActiveAgents(artifactMap).includes(frameworkId);
    if (!ready) {
      setRunMessage(`Complete ${SOURCES[frameworkId].filter(key => !artifactIsComplete(artifactMap[key], key)).map(key => FW[key].name).join(", ")} first.`);
      return;
    }

    const id = runId();
    const existing = artifactMap[frameworkId];
    const revision = artifactIsComplete(existing, frameworkId) ? Number(existing.revision || 1) + 1 : 1;
    const starter = `Read the saved context, research the company, and create the ${FW[frameworkId].name}.`;
    const fullInstruction = instruction.trim() ? `${starter}\n\nAdditional direction: ${instruction.trim()}` : starter;
    const context = buildContextSnapshot(frameworkId, bucketMap, artifactMap, fullInstruction);
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
      setRunMessage(`The run could not be saved before generation: ${persisted.error}`);
      return;
    }
    try {
      await saveGenerationRecord({ ...record, context, instruction: fullInstruction });
    } catch (error) {
      upsertRun(frameworkId, { ...record, status: "failed", error: error?.message || "Generation storage is unavailable." });
      setRunMessage(`The run was not started because its full context could not be saved: ${error?.message || "generation storage is unavailable"}`);
      refresh();
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setBusyFramework(frameworkId);
    setPhase(0);
    setStartedAt(Date.now());
    setRunMessage("");
    refresh();

    let archiveRecord = null;
    try {
      const response = await fetch("/api/framework-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          apiKey: getKey(),
          frameworkId,
          instruction: fullInstruction,
          context,
          runId: id,
          revision,
        }),
      });
      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = { error: `The generation service returned an unreadable response (${response.status}).` }; }
      if (!response.ok || data.error) {
        const message = typeof data.error === "string" ? data.error : data.error?.message;
        throw new Error(message || "Framework generation failed.");
      }

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
        const stale = staleArtifacts(
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
      setActive(deriveActiveAgents(nextArtifacts));
      refresh();
      if (generationStatus === "complete") {
        if (archiveWarning) {
          try { sessionStorage.setItem(`lf:run-warning:${id}`, archiveWarning); } catch { /* The warning remains on the run record. */ }
        }
        router.push(`/framework/${frameworkId}?run=${encodeURIComponent(id)}`);
      } else {
        const questions = Array.isArray(normalized.nextQuestions) ? normalized.nextQuestions.filter(Boolean) : [];
        const priorPreserved = existing && !shouldReplaceCurrent;
        setRunMessage(`${priorPreserved ? "The prior artifact remains available. " : ""}The agent needs more input before this result can unlock downstream work.${questions.length ? ` Next: ${questions.join(" · ")}` : ""}`);
      }
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
      setRunMessage(`${message}${archiveFailure ? ` Archive warning: ${archiveFailure}` : ""}`);
      refresh();
    } finally {
      abortRef.current = null;
      setBusyFramework("");
      setStartedAt(null);
    }
  }

  const selectedReady = selectedFramework ? active.includes(selectedFramework) : false;
  const selectedStatus = selectedFramework
    ? statusFor(selectedFramework, selectedArtifact, selectedLatestRun, selectedReady)
    : null;
  const unmet = selectedFramework
    ? SOURCES[selectedFramework].filter(key => !artifactIsComplete(artifacts[key], key))
    : [];

  return (
    <main>
      <header ref={pipelineHeaderRef} className="pipeline-header">
        <div className="eyebrow">Fig. 01·B — Agent Roster</div>
        <h1>The Frameworks Are Alive Now</h1>
        <p className="sub">Load the evidence you have, launch a ready framework, and let each validated artifact become the exact context for the agents downstream.</p>
      </header>

      <div className="pipeline-grid">
        <div ref={pipelineContentRef}>
          <section className="stage" data-num="00">
            <div className="stage-title">Live Intake</div>
            <div className="stage-role">Evidence buckets every agent reads — select one to load or update its context</div>
            <div className="chips">
              {INTAKE.map(item => {
                const loaded = Boolean((buckets[item.key] || "").trim());
                return (
                  <button key={item.key} className={`chip${selectedIntake === item.key ? " sel" : ""}`} onClick={() => selectIntake(item.key)} disabled={Boolean(busyFramework)}>
                    {item.name} <span className={`st${loaded ? " loaded" : ""}`}>{loaded ? "● LOADED" : "EMPTY"}</span>
                  </button>
                );
              })}
            </div>
            <div className="note"><b>LOAD WHAT YOU HAVE</b> — partial evidence is allowed. The run records missing evidence explicitly instead of inventing it.</div>
          </section>

          {STAGES.map(stage => (
            <section key={stage.key} className="stage" data-num={stage.num}>
              <div className="stage-title">{stage.title}</div>
              <div className="stage-role">{stage.role}</div>
              <div className="nodes">
                {ORDER.filter(key => FW[key].stage === stage.key).map(key => {
                  const ready = active.includes(key);
                  const nodeStatus = statusFor(key, artifacts[key], latestRuns[key], ready);
                  return (
                    <button
                      key={key}
                      className={`node node-${nodeStatus}${selectedFramework === key ? " selected" : ""}`}
                      onClick={() => selectFramework(key)}
                      aria-pressed={selectedFramework === key}
                      disabled={Boolean(busyFramework)}
                    >
                      <span className="n-top"><span className="n-icon">{FW[key].icon}</span><span className="n-name">{FW[key].name}</span></span>
                      <span className="n-out">→ {FW[key].out}</span>
                      <span className="n-status">{runStatusLabel(nodeStatus)}</span>
                      {artifactIsComplete(artifacts[key], key) && <span className="n-done">REVISION {artifacts[key].revision || 1} · OPEN OR REGENERATE</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          <div className="note pipeline-feedback">↺ FEEDBACK — revisions preserve history and mark dependent thinking for review</div>
        </div>

        <aside
          ref={inspectorRef}
          className={`panel pipeline-inspector${framework || source ? " is-open" : ""}`}
          aria-live="polite"
          role={mobileDialogOpen ? "dialog" : undefined}
          aria-modal={mobileDialogOpen ? "true" : undefined}
          aria-label={mobileDialogOpen ? (framework ? `${framework.name} launcher` : `${source.name} evidence editor`) : undefined}
          tabIndex={mobileDialogOpen ? -1 : undefined}
        >
          {(framework || source) && (
            <button
              className="mobile-inspector-close"
              onClick={closeInspector}
              aria-label="Close pipeline inspector"
              disabled={Boolean(busyFramework)}
            >CLOSE ×</button>
          )}
          {framework ? (
            <div>
              <div className="inspector-heading">
                <div>
                  <div className="i-label">{frameworkStage ? `Stage ${frameworkStage.num} · ${frameworkStage.title}` : "Framework launcher"}</div>
                  <h2><span>{framework.icon}</span> {framework.name}</h2>
                  <p>{framework.role}</p>
                </div>
                <span className={`framework-state state-${selectedStatus}`}>{runStatusLabel(selectedStatus)}</span>
              </div>

              {busyFramework === selectedFramework ? (
                <div className="i-sec">
                  <LoadingState label={`${framework.role} is building`} variant={phase >= 3 ? "Orbit" : "Drive"} phases={RUN_PHASES} phase={phase} startedAt={startedAt} />
                  <p className="status run-progress-note">Phases are estimated while the research request is active. Deep research can take a few minutes; the run has a five-minute server limit and can be cancelled anytime.</p>
                  <button className="btn danger run-cancel" onClick={() => abortRef.current?.abort()}>CANCEL RUN</button>
                </div>
              ) : (
                <>
                  <div className="i-sec">
                    <p className="voice">{framework.voice}</p>
                  </div>

                  <details className="i-fold">
                    <summary><span className="i-label">Reads (inputs)</span></summary>
                    <ul>
                      {framework.reads.map(([input, from], index) => (
                        <li key={index}><b>{input}</b> <span className="read-src">· {from}</span></li>
                      ))}
                    </ul>
                  </details>

                  <details className="i-fold">
                    <summary><span className="i-label">Tool calls</span></summary>
                    <div className="toolchips">{framework.tools.map(tool => <span key={tool}>{tool}</span>)}</div>
                  </details>

                  <details className="i-fold">
                    <summary><span className="i-label">Working documents</span></summary>
                    <div className="docchips">{framework.docs.map(doc => <span key={doc}>{doc}</span>)}</div>
                  </details>

                  <div className="i-sec">
                    <div className="i-label">Insight produced</div>
                    <p className="i-insight">{framework.insight}</p>
                  </div>

                  {framework.feeds.length > 0 && (
                    <div className="i-sec">
                      <div className="i-label">Wakes these agents</div>
                      <div className="linkchips">
                        {framework.feeds.map(key => (
                          <button key={key} onClick={() => selectFramework(key)}>{FW[key].icon} {FW[key].name}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <details className="i-fold" open={Boolean(instruction.trim())}>
                    <summary><span className="i-label">Optional run direction</span></summary>
                    <textarea
                      id="run-direction"
                      className="area compact"
                      aria-label="Optional additional direction"
                      value={instruction}
                      onChange={event => setInstruction(event.target.value)}
                      placeholder="Add a market, geography, time horizon, or decision to emphasize…"
                    />
                  </details>

                  <div className="i-sec run-actions">
                    {unmet.length > 0 && <p className="status warning">Complete first: {unmet.map(key => FW[key].name).join(" · ")}</p>}
                    {!getKey() && <p className="status warning">An Anthropic API key is required. <Link href="/settings">Open Settings →</Link></p>}
                    {artifactIsComplete(selectedArtifact, selectedFramework) && (
                      <Link className="btn" href={`/framework/${selectedFramework}`}>OPEN COMPLETED ARTIFACT</Link>
                    )}
                    <button className="btn primary" onClick={() => runFramework(selectedFramework)} disabled={!selectedReady}>
                      {artifactIsComplete(selectedArtifact, selectedFramework) ? "RESEARCH & REGENERATE" : "RESEARCH & BUILD FRAMEWORK"} ▸
                    </button>
                    {selectedArtifact?.status === "legacy" && <p className="status warning">This is a legacy plain-text result. Regenerate it to create a validated interactive artifact.</p>}
                  </div>
                </>
              )}
              {runMessage && <div className="run-error" role="alert">{runMessage}</div>}
            </div>
          ) : source ? (
            <div>
              <div className="i-sec">
                <div className="i-label">{source.name}</div>
                <p className="inspector-copy">{source.desc}</p>
                <p className="inspector-muted">{source.from}</p>
              </div>
              <div className="i-sec">
                <div className="i-label">How to get it — client interview guide</div>
                <ul>{source.guide.map((guide, index) => <li key={index}>{guide}</li>)}</ul>
              </div>
              <div className="i-sec">
                <div className="i-label">Template</div>
                <div className="tmpl">{source.template}</div>
                <div className="btnrow"><button className="btn" onClick={copyTemplate}>COPY TEMPLATE</button></div>
              </div>
              <div className="i-sec">
                <label className="i-label" htmlFor="bucket-contents">Bucket contents · {bucketText.trim() ? "loaded" : "empty"}</label>
                <textarea id="bucket-contents" className="area" value={bucketText} onChange={event => setBucketText(event.target.value)} placeholder="Paste the filled template, transcripts, URLs, or raw evidence here…" />
                <div className="btnrow">
                  <button className="btn primary" onClick={saveBucket}>SAVE TO BUCKET</button>
                  <label>UPLOAD .TXT / .MD<input type="file" aria-label={`Upload files to ${source.name}`} accept=".txt,.md,.csv,.json" multiple onChange={onFiles} /></label>
                  <button className="btn" onClick={clearBucket}>CLEAR</button>
                </div>
                <div className={`status${bucketStatus ? " ok" : ""}`}>{bucketStatus || "Saved evidence persists in this browser and is snapshotted into each run."}</div>
              </div>
              <div className="i-sec">
                <div className="i-label">Read by these agents</div>
                <div className="linkchips">{source.readers.map(key => <button key={key} onClick={() => selectFramework(key)}>{FW[key].icon} {FW[key].name}</button>)}</div>
              </div>
            </div>
          ) : (
            <div className="inspector-empty">
              <div className="i-label">Pipeline inspector</div>
              <h2>Select evidence or a framework</h2>
              <p>Choose an intake bucket to load context. Choose a framework card to review readiness and launch its research run without leaving the pipeline.</p>
              <p className="accent-copy">Start with Business description & URL, then launch the Business Model Canvas.</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
