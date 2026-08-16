"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STAGES, INTAKE, FW, ORDER, SOURCES } from "@/lib/frameworks";
import {
  getArtifact,
  getBucket,
  getLatestRun,
  setBucket,
} from "@/lib/store";
import {
  artifactIsComplete,
  deriveActiveAgents,
  getBucketAffectedFrameworks,
} from "@/lib/agentContext";
import { getModalFocusableElements, trapModalTabKey } from "@/lib/modalFocus";
import {
  executeFrameworkRun,
  hasApiKey,
  interruptInFlightRuns,
  markDependentArtifactsStale,
  RUN_PHASES,
  runEventLine,
} from "@/lib/frameworkRunClient";
import {
  applyUploadedFiles,
  formatBizIntake,
  parseBizIntake,
  resolvePipelineSelect,
  validateBizIntake,
  validateBucketSave,
} from "@/lib/intake";
import BizIntakeFields from "@/components/BizIntakeFields";
import LoadingState from "@/components/LoadingState";
import HowToRead from "@/components/HowToRead";

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
  const [runDetail, setRunDetail] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [buckets, setBuckets] = useState({});
  const [artifacts, setArtifacts] = useState({});
  const [latestRuns, setLatestRuns] = useState({});
  const [isMobileInspector, setIsMobileInspector] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [bizUrl, setBizUrl] = useState("");
  const [bizParagraph, setBizParagraph] = useState("");

  function refresh() {
    setBuckets(Object.fromEntries(INTAKE.map(source => [source.key, getBucket(source.key)])));
    setArtifacts(Object.fromEntries(ORDER.map(key => [key, getArtifact(key)])));
    setLatestRuns(Object.fromEntries(ORDER.map(key => [key, getLatestRun(key)])));
    setHasKey(hasApiKey());
  }

  useEffect(() => {
    interruptInFlightRuns();
    refresh();
    setHydrated(true);
    const onStorage = () => refresh();
    window.addEventListener("lf:storage", onStorage);
    return () => window.removeEventListener("lf:storage", onStorage);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Deep-link support: /pipeline?select=<frameworkId> keeps the selected
  // launcher in the URL. Unknown slugs stay visible as "unknown".
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("select");
    const resolved = resolvePipelineSelect(requested);
    if (resolved.kind === "framework") {
      setSelectedIntake(null);
      setSelectedFramework(resolved.id);
    } else if (resolved.kind === "unknown") {
      setSelectedIntake(null);
      setSelectedFramework(resolved.slug);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 999px)");
    const sync = () => setIsMobileInspector(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!selectedIntake) return;
    const text = getBucket(selectedIntake);
    setBucketText(text);
    if (selectedIntake === "biz") {
      const parsed = parseBizIntake(text);
      setBizUrl(parsed.url);
      setBizParagraph(parsed.paragraph);
    }
    setBucketStatus("");
  }, [selectedIntake]);

  // Phases are driven by real progress events streamed from the server run.

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

  const active = useMemo(() => deriveActiveAgents(artifacts, buckets), [artifacts, buckets]);
  const source = selectedIntake ? INTAKE.find(item => item.key === selectedIntake) : null;
  const selectResolution = resolvePipelineSelect(selectedFramework);
  const unknownSelect = selectResolution.kind === "unknown" ? selectResolution.slug : null;
  const framework = selectResolution.kind === "framework" ? FW[selectResolution.id] : null;
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
    syncSelectToUrl(null);
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
    syncSelectToUrl(key);
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
    syncSelectToUrl(null);
  }

  function syncSelectToUrl(key) {
    const next = key ? `/pipeline?select=${encodeURIComponent(key)}` : "/pipeline";
    if (`${window.location.pathname}${window.location.search}` !== next) {
      router.replace(next, { scroll: false });
    }
  }

  function staleArtifacts(seedIds, reason, { includeSeeds = true, baseArtifacts } = {}) {
    return markDependentArtifactsStale(seedIds, reason, { includeSeeds, baseArtifacts });
  }

  function saveBucket() {
    const nextValue = selectedIntake === "biz"
      ? formatBizIntake({ ...parseBizIntake(getBucket("biz")), url: bizUrl, paragraph: bizParagraph })
      : bucketText;
    const validation = selectedIntake === "biz"
      ? validateBizIntake({ ...parseBizIntake(getBucket("biz")), url: bizUrl, paragraph: bizParagraph })
      : validateBucketSave(selectedIntake, nextValue);
    if (!validation.ok) {
      setBucketStatus(validation.error);
      return;
    }
    const previous = getBucket(selectedIntake);
    const result = setBucket(selectedIntake, selectedIntake === "biz" ? formatBizIntake(validation) : nextValue);
    if (!result.ok) {
      setBucketStatus(`Could not save: ${result.error}`);
      return;
    }
    if (selectedIntake === "biz") {
      setBizUrl(validation.url);
      setBizParagraph(validation.paragraph);
      setBucketText(formatBizIntake(validation));
    }
    const stale = previous !== (selectedIntake === "biz" ? formatBizIntake(validation) : nextValue)
      ? staleArtifacts(getBucketAffectedFrameworks(selectedIntake), `${source.name} changed.`)
      : { staled: [], failures: [] };
    setBucketStatus(`Saved. Every agent will receive this as engagement context; ${source.readers.map(reader => FW[reader].role).join(", ")} treat it as a primary input.${stale.staled.length ? ` ${stale.staled.length} artifact(s) marked stale.` : ""}${stale.failures.length ? ` Could not mark stale: ${stale.failures.join("; ")}` : ""}`);
    refresh();
  }

  async function onFiles(event) {
    const files = [];
    for (const file of [...event.target.files]) {
      files.push({ name: file.name, text: await file.text() });
    }
    const current = selectedIntake === "biz"
      ? { ...parseBizIntake(getBucket("biz")), url: bizUrl, paragraph: bizParagraph }
      : { text: bucketText };
    const applied = applyUploadedFiles(selectedIntake, files, { getBucket, setBucket, current });
    if (!applied.ok) {
      setBucketStatus(applied.error);
      return;
    }
    if (selectedIntake === "biz") {
      setBizUrl(applied.fields.url);
      setBizParagraph(applied.fields.paragraph);
      setBucketText(applied.value);
    } else {
      setBucketText(applied.value);
    }
    if (applied.previous !== applied.value) {
      const stale = staleArtifacts(getBucketAffectedFrameworks(selectedIntake), `${source.name} changed.`);
      setBucketStatus(`${event.target.files.length} file(s) loaded and saved.${stale.staled.length ? ` ${stale.staled.length} dependent artifact(s) marked stale.` : ""}${stale.failures.length ? ` Could not mark stale: ${stale.failures.join("; ")}` : ""}`);
    } else {
      setBucketStatus(`${event.target.files.length} file(s) loaded and saved.`);
    }
    refresh();
  }

  function clearBucket() {
    const previous = getBucket(selectedIntake);
    setBucketText("");
    setBizUrl("");
    setBizParagraph("");
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
    const controller = new AbortController();
    abortRef.current = controller;
    setRunMessage("");
    const result = await executeFrameworkRun({
      frameworkId,
      instruction,
      signal: controller.signal,
      onStart() {
        setBusyFramework(frameworkId);
        setPhase(0);
        setRunDetail("");
        setStartedAt(Date.now());
        refresh();
      },
      onProgress(event) {
        if (event.phase != null) setPhase(event.phase);
        const line = runEventLine(event);
        if (line) setRunDetail(line);
      },
    });
    abortRef.current = null;
    setBusyFramework("");
    setStartedAt(null);
    setRunDetail("");
    refresh();
    if (!result.ok) {
      setRunMessage(result.error);
      return;
    }
    if (result.status === "complete") {
      router.push(`/framework/${frameworkId}?run=${encodeURIComponent(result.runId)}`);
      return;
    }
    setRunMessage(result.message || "The agent needs more input before this result can unlock downstream work.");
  }

  const selectedReady = selectedFramework ? active.includes(selectedFramework) : false;
  const selectedStatus = selectedFramework
    ? statusFor(selectedFramework, selectedArtifact, selectedLatestRun, selectedReady)
    : null;
  const unmet = (SOURCES[selectedFramework] || [])
    .filter(key => !artifactIsComplete(artifacts[key], key));

  return (
    <main>
      <div className="pipeline-grid">
        <div ref={pipelineContentRef}>
          <header ref={pipelineHeaderRef} className="pipeline-header">
            <div className="eyebrow">Fig. 01·B — Agent Roster</div>
            <h1>The Frameworks Are Alive Now</h1>
            <p className="sub">Load the evidence you have, launch a ready framework, and let each validated artifact become the exact context for the agents downstream.</p>
            <HowToRead of="pipeline" />
          </header>

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
            <div className="note"><b>ONLY THE URL & DESCRIPTION ARE REQUIRED</b> — the agents research market and competitor signals themselves. Interviews, transcripts, and the org chart deepen the read; every run records what is missing instead of inventing it.</div>
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
                  {runDetail && <p className="run-detail" aria-live="polite">▸ {runDetail}</p>}
                  <p className="status run-progress-note">Live progress streams from the run. Deep research can take a few minutes; the run has a five-minute server limit and can be cancelled anytime.</p>
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
                    {selectedFramework === "bmc" && !selectedReady && (
                      <p className="status warning">Load Business description & URL (company URL + paragraph) first.</p>
                    )}
                    {!hasKey && <p className="status warning">An Anthropic API key is required. <Link href="/settings">Open Settings →</Link></p>}
                    {artifactIsComplete(selectedArtifact, selectedFramework) && (
                      <Link className="btn" href={`/framework/${selectedFramework}`}>OPEN COMPLETED ARTIFACT</Link>
                    )}
                    <button className="btn primary" onClick={() => runFramework(selectedFramework)} disabled={!selectedReady || !hasKey}>
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
                {source.key === "biz" ? (
                  <>
                    <div className="i-label">Required to draw the canvas · {validateBizIntake({ url: bizUrl, paragraph: bizParagraph }).ok ? "loaded" : "empty"}</div>
                    <BizIntakeFields
                      url={bizUrl}
                      paragraph={bizParagraph}
                      onUrlChange={value => { setBizUrl(value); setBucketStatus(""); }}
                      onParagraphChange={value => { setBizParagraph(value); setBucketStatus(""); }}
                      idPrefix="pipeline-biz"
                    />
                  </>
                ) : (
                  <>
                    <label className="i-label" htmlFor="bucket-contents">Bucket contents · {bucketText.trim() ? "loaded" : "empty"}</label>
                    <textarea id="bucket-contents" className="area" value={bucketText} onChange={event => setBucketText(event.target.value)} placeholder="Paste the filled template, transcripts, URLs, or raw evidence here…" />
                  </>
                )}
                <div className="btnrow">
                  <button
                    className="btn primary"
                    onClick={saveBucket}
                    disabled={source.key === "biz" ? !validateBizIntake({ url: bizUrl, paragraph: bizParagraph }).ok : !bucketText.trim()}
                  >SAVE TO BUCKET</button>
                  <label>UPLOAD .TXT / .MD<input type="file" aria-label={`Upload files to ${source.name}`} accept=".txt,.md,.csv,.json" multiple onChange={onFiles} /></label>
                  <button className="btn" onClick={clearBucket}>CLEAR</button>
                </div>
                <div className={`status${bucketStatus ? (bucketStatus.startsWith("Saved") || bucketStatus.includes("loaded and saved") || bucketStatus.startsWith("Template") || bucketStatus.startsWith("Bucket cleared") ? " ok" : " warning") : ""}`}>{bucketStatus || "Saved evidence persists in this browser and is snapshotted into each run."}</div>
              </div>
              <div className="i-sec">
                <div className="i-label">Read by these agents</div>
                <div className="linkchips">{source.readers.map(key => <button key={key} onClick={() => selectFramework(key)}>{FW[key].icon} {FW[key].name}</button>)}</div>
              </div>
            </div>
          ) : unknownSelect ? (
            <div className="inspector-empty">
              <div className="i-label">Unknown framework</div>
              <h2>No agent named “{unknownSelect}”</h2>
              <p>That slug is not in this pipeline. Check the URL or pick a framework card from the roster.</p>
              <p className="accent-copy">Business Model Canvas is <code>/pipeline?select=bmc</code>.</p>
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
