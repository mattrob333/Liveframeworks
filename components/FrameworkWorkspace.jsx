"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FW, INTAKE, ORDER } from "@/lib/frameworks";
import {
  getArtifact,
  getBucket,
  getLatestRun,
  getOutput,
  setSelectedSection,
} from "@/lib/store";
import { artifactIsComplete } from "@/lib/agentContext";
import { autorunReplaceUrl, hasHomeCanvas } from "@/lib/homeMode";
import {
  FIRST_RUN_EMPTY_COPY,
  NEEDS_INPUT_COPY,
  collectArtifactQuestions,
  filledCanvasConstraintLine,
  pipelineLauncherHref,
  resolveFrameworkWorkspaceView,
} from "@/lib/frameworkWorkspaceView";
import { normalizeFrameworkArtifact } from "@/lib/frameworkArtifacts";
import { orgInstallForLoadedCompany, orgInstallRoster, showTocStaleBannerBetweenHeroAndRoster, tocConstraintHero } from "@/lib/tocPayoff";
import { playerLinkUrl } from "@/lib/playerLinks";
import { companyHostname, parseBizIntake } from "@/lib/intake";
import { agentOneLiner, filledCanvasNextMove } from "@/lib/nextSteps";
import { TocConstraintHero, TocRoster } from "@/components/TocPayoff";
import {
  executeFrameworkRun,
  hasApiKey,
  interruptInFlightRuns,
  RUN_PHASES,
} from "@/lib/frameworkRunClient";
import FrameworkArtifact from "@/components/FrameworkArtifact";
import Chat from "@/components/Chat";
import LoadingState from "@/components/LoadingState";
import WhyThisStep from "@/components/WhyThisStep";

function scalarText(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value) return "";
  if (Array.isArray(value)) return value.map(scalarText).filter(Boolean).join(" · ");
  if (typeof value === "object") {
    return value.text || value.claim || value.finding || value.summary || value.rationale || value.description || value.name || "";
  }
  return "";
}

function collectValues(value, keys) {
  if (!value || typeof value !== "object") return [];
  for (const key of keys) {
    const candidate = value[key];
    if (Array.isArray(candidate) && candidate.length) return candidate;
    if (candidate) return [candidate];
  }
  return [];
}

function collectEvidenceRefs(value, refs = new Set()) {
  if (Array.isArray(value)) {
    value.forEach(item => collectEvidenceRefs(item, refs));
    return refs;
  }
  if (!value || typeof value !== "object") return refs;
  if (Array.isArray(value.evidenceRefs)) value.evidenceRefs.filter(Boolean).forEach(ref => refs.add(ref));
  if (Array.isArray(value.evidence_refs)) value.evidence_refs.filter(Boolean).forEach(ref => refs.add(ref));
  Object.values(value).forEach(child => collectEvidenceRefs(child, refs));
  return refs;
}

function RegionSources({ artifact, section }) {
  const data = section?.data || {};
  const refs = collectEvidenceRefs(data);
  const all = Array.isArray(artifact?.evidence) ? artifact.evidence : [];
  const evidence = all.filter(item => refs.has(item.id));
  if (!refs.size && !all.length) return null;
  const items = evidence.length ? evidence : [];
  if (!items.length) {
    return <p className="region-inspector-empty">No source is attached to this region.</p>;
  }
  return (
    <ul className="region-inspector-sources">
      {items.map((item, index) => (
        <li key={item.id || item.url || index}>
          {item.url
            ? <a href={item.url} target="_blank" rel="noreferrer">{item.title || item.url}</a>
            : (item.title || item.sourceKey || item.kind || "Saved engagement evidence")}
        </li>
      ))}
    </ul>
  );
}

function noteLine(values) {
  return (values || []).map(scalarText).filter(Boolean).join(" ");
}

function RegionInspector({ artifact, section, onDiscuss }) {
  if (!section) return null;

  const data = section.data || {};
  const players = Array.isArray(data) && (section.kind === "players" || section.id === "players")
    ? data
    : [];
  const contents = players.length
    ? []
    : collectValues(data, ["findings", "claims", "items", "signals", "jobs", "objectives", "initiatives", "strategies"]);
  const items = contents.map(scalarText).filter(Boolean);
  const fallback = scalarText(data);
  const gaps = noteLine(artifact?.gaps);
  const assumptions = noteLine(artifact?.assumptions);
  const questions = noteLine(artifact?.nextQuestions);

  return (
    <section className="region-inspector" aria-label={`${section.label} detail`}>
      <div className="region-inspector-top">
        <h2>{section.label}</h2>
        <button className="btn" type="button" onClick={onDiscuss}>Discuss</button>
      </div>
      {players.length ? (
        <ul>
          {players.map((player, index) => {
            const href = playerLinkUrl(player, artifact?.evidence);
            const name = player?.name || scalarText(player) || `Player ${index + 1}`;
            return (
              <li key={player?.id || `${name}-${index}`}>
                {href
                  ? <a href={href} target="_blank" rel="noreferrer">{name}</a>
                  : name}
              </li>
            );
          })}
        </ul>
      ) : items.length ? (
        <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
      ) : (
        <p>{fallback || "This region is empty."}</p>
      )}
      <RegionSources artifact={artifact} section={section} />
      {(gaps || assumptions || questions) && (
        <div className="region-inspector-notes">
          {gaps && <p><span>Gaps.</span> {gaps}</p>}
          {assumptions && <p><span>Assumptions.</span> {assumptions}</p>}
          {questions && <p><span>Next questions.</span> {questions}</p>}
        </div>
      )}
    </section>
  );
}

export default function FrameworkWorkspace({ id, home = false, orgInstalls = {} }) {
  const framework = FW[id];
  const [artifact, setArtifactState] = useState(null);
  const [latestRun, setLatestRun] = useState(null);
  const [selectedSection, setSelectedSectionState] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [chatPrompt, setChatPrompt] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(0);
  const [runDetail, setRunDetail] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [runMessage, setRunMessage] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [hostname, setHostname] = useState("");
  const chatRailRef = useRef(null);
  const abortRef = useRef(null);
  const autorunStartedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    interruptInFlightRuns();
    const saved = getArtifact(id);
    const normalized = saved ? normalizeFrameworkArtifact(saved, id) : null;
    setArtifactState(normalized);
    setLatestRun(getLatestRun(id));
    setSelectedSectionId("");
    setSelectedSectionState(null);
    setHasKey(hasApiKey());
    setHostname(companyHostname(parseBizIntake(getBucket("biz")).url));
    setHydrated(true);
  }, [id]);

  useEffect(() => {
    if (!hydrated || !id) return;
    const onStorage = () => {
      const saved = getArtifact(id);
      setArtifactState(saved ? normalizeFrameworkArtifact(saved, id) : null);
      setLatestRun(getLatestRun(id));
      setHasKey(hasApiKey());
      setHostname(companyHostname(parseBizIntake(getBucket("biz")).url));
    };
    window.addEventListener("lf:storage", onStorage);
    return () => window.removeEventListener("lf:storage", onStorage);
  }, [hydrated, id]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function clearAutorunIfSafe() {
    const nextUrl = autorunReplaceUrl({
      home,
      hasCanvas: hasHomeCanvas(getArtifact("bmc")),
    });
    if (nextUrl && `${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }

  useEffect(() => {
    if (!hydrated || id !== "bmc" || !FW[id]) return;
    const autorun = new URLSearchParams(window.location.search).get("autorun");
    if (autorun !== "1" || autorunStartedRef.current) return;
    autorunStartedRef.current = true;
    // Do not strip ?autorun=1 on first-run home until a BMC exists.
    // HomeGate would drop to intake, unmount this workspace, and abort().
    clearAutorunIfSafe();
    if (artifactIsComplete(getArtifact("bmc"), "bmc")) return;
    void startCanvasRun();
  }, [hydrated, id, home]);

  async function startCanvasRun() {
    if (busy || abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunMessage("");
    const result = await executeFrameworkRun({
      frameworkId: id,
      signal: controller.signal,
      onStart() {
        setBusy(true);
        setPhase(0);
        setRunDetail("Snapshotting evidence and opening the run…");
        setStartedAt(Date.now());
      },
      onProgress({ phase, detail }) {
        if (phase != null) setPhase(phase);
        if (detail) setRunDetail(detail);
      },
    });
    abortRef.current = null;
    setBusy(false);
    setStartedAt(null);
    setRunDetail("");
    const saved = getArtifact(id);
    setArtifactState(saved ? normalizeFrameworkArtifact(saved, id) : null);
    setLatestRun(getLatestRun(id));
    if (!result.ok) setRunMessage(result.error);
    else if (result.message) setRunMessage(result.message);
    clearAutorunIfSafe();
  }

  if (!framework) {
    return <main className="page-message"><h1>Unknown framework</h1><p><Link href="/pipeline">Back to the pipeline</Link></p></main>;
  }
  if (!hydrated) {
    return <main className="page-loading"><LoadingState label="Opening framework" variant="Drive" /></main>;
  }

  function selectSection(section) {
    setSelectedSectionState(section);
    setSelectedSectionId(section.id);
    setSelectedSection(id, section.id);
  }

  function discussSection() {
    setChatPrompt(`Let's examine ${selectedSection?.label || "this section"}. Walk me through the evidence, the strongest inference, and what would change your conclusion.`);
    if (window.matchMedia("(max-width: 999px)").matches) {
      window.setTimeout(() => {
        chatRailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        chatRailRef.current?.querySelector("input")?.focus({ preventScroll: true });
      }, 50);
    }
  }

  const view = resolveFrameworkWorkspaceView(artifact, latestRun, id);
  const viewable = view === "map";
  const needsInput = view === "needs_input";
  const legacy = view === "legacy";
  const stale = artifact?.status === "stale" && viewable;
  const constraintLine = filledCanvasConstraintLine(
    view,
    id === "toc" ? artifact : getArtifact("toc"),
  );
  const tocHero = id === "toc" && viewable ? tocConstraintHero(artifact) : null;
  const orgInstall = orgInstallForLoadedCompany(orgInstalls, `${hostname}\n${getBucket("biz")}`);
  const tocRoster = tocHero ? orgInstallRoster(orgInstall) : { router: null, teams: [] };
  const questions = collectArtifactQuestions(artifact);
  const running = busy || (latestRun && ["queued", "researching", "generating", "validating"].includes(latestRun.status));
  const pageTitle = hostname || "LiveFrameworks";
  const nextMove = filledCanvasNextMove(view, {
    frameworkId: id,
    artifacts: Object.fromEntries(ORDER.map(key => [key, key === id ? artifact : getArtifact(key)])),
    buckets: Object.fromEntries(INTAKE.map(source => [source.key, getBucket(source.key)])),
  });

  return (
    <main className="framework-page">
      <div className="framework-workspace">
        <div className="artifact-column">
          {tocHero ? (
            <TocConstraintHero hero={tocHero} />
          ) : (
            <header className="framework-header">
              <h1>{pageTitle}</h1>
              {constraintLine && <p className="framework-constraint">{constraintLine}</p>}
              <p className="framework-map-label">{framework.name}</p>
              {stale && <p className="framework-state-note">This map is stale. Review it, or regenerate from the pipeline.</p>}
              {needsInput && <p className="framework-state-note">This run is waiting on clarifying questions.</p>}
            </header>
          )}
          <WhyThisStep insight={framework.insight} />
          {showTocStaleBannerBetweenHeroAndRoster({ stale, hero: tocHero, roster: tocRoster }) && (
            <p className="framework-state-note">This map is stale. Review it, or regenerate from the pipeline.</p>
          )}
          {tocHero && needsInput && <p className="framework-state-note">This run is waiting on clarifying questions.</p>}
          {tocHero && <TocRoster roster={tocRoster} />}

          {running && (
            <div className="i-sec">
              <LoadingState
                label={`${framework.name} is building`}
                variant={phase >= 3 ? "Orbit" : "Drive"}
                phases={RUN_PHASES}
                phase={phase}
                startedAt={startedAt || (latestRun?.startedAt ? new Date(latestRun.startedAt) : undefined)}
              />
              {runDetail && <p className="run-detail" aria-live="polite">{runDetail}</p>}
              {busy && <button className="btn danger run-cancel" type="button" onClick={() => abortRef.current?.abort()}>Cancel run</button>}
            </div>
          )}
          {runMessage && <div className="run-error" role="alert">{runMessage}</div>}

          {viewable ? (
            <>
              <section className="artifact-panel">
                <FrameworkArtifact
                  artifact={artifact}
                  frameworkId={id}
                  selectedSectionId={selectedSectionId}
                  onSelect={selectSection}
                  brief
                />
              </section>
              {nextMove && (
                <p className="next-move">
                  <span>{nextMove.line}</span>
                  <Link className="btn" href={nextMove.href}>{nextMove.action}</Link>
                </p>
              )}
              <RegionInspector
                artifact={artifact}
                section={selectedSection}
                onDiscuss={discussSection}
              />
            </>
          ) : !running && needsInput ? (
            <section className="panel empty-artifact">
              <p>{NEEDS_INPUT_COPY}</p>
              {questions.length > 0 && (
                <ul>
                  {questions.map((question, index) => (
                    <li key={`${question}-${index}`}>{question}</li>
                  ))}
                </ul>
              )}
              <div className="btnrow">
                <Link className="btn primary" href={pipelineLauncherHref(id)}>Open pipeline launcher</Link>
              </div>
            </section>
          ) : !running && (
            <section className="panel empty-artifact">
              {legacy
                ? <><p>Your previous plain-text result is preserved below, but it cannot populate the map. Regenerate this framework from the pipeline.</p><div className="output legacy-output">{getOutput(id)}</div></>
                : <p>{FIRST_RUN_EMPTY_COPY}</p>}
              <div className="btnrow">
                {id === "bmc" && <Link className="btn primary" href="/">Draw from home</Link>}
                <Link className={id === "bmc" ? "btn" : "btn primary"} href="/pipeline">Open pipeline</Link>
              </div>
            </section>
          )}
        </div>

        <aside className="chat-rail" ref={chatRailRef}>
          <div className="chat-rail-header">
            <div className="agent-id">
              <span className="agent-mark" aria-hidden="true">{framework.icon}</span>
              <div>
                <b>{framework.role}</b>
                <p>{agentOneLiner(framework)}</p>
              </div>
            </div>
            <div className="chat-rail-tools">
              {(busy || chatBusy) && hasKey && <span className="live-indicator">● LIVE</span>}
              <Link className="how-built" href={`/pipeline?select=${id}`}>How this was built ›</Link>
            </div>
          </div>
          <Chat
            fwKey={id}
            artifact={viewable ? artifact : null}
            focusPrompt={chatPrompt}
            onFocusConsumed={() => setChatPrompt("")}
            onBusyChange={setChatBusy}
          />
        </aside>
      </div>
    </main>
  );
}
