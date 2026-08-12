"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, use } from "react";
import { FW, SOURCES, INTAKE, ORDER } from "@/lib/frameworks";
import {
  getArtifact,
  getBucket,
  getLatestRun,
  getOutput,
  getSelectedSection,
  setSelectedSection,
} from "@/lib/store";
import { artifactIsComplete, deriveActiveAgents } from "@/lib/agentContext";
import { getArtifactSections, normalizeFrameworkArtifact } from "@/lib/frameworkArtifacts";
import FrameworkArtifact from "@/components/FrameworkArtifact";
import Chat from "@/components/Chat";
import LoadingState from "@/components/LoadingState";

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

function DetailList({ values, empty = "No additional evidence was returned for this region." }) {
  const items = values.map(scalarText).filter(Boolean);
  if (!items.length) return <p>{empty}</p>;
  return <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>;
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

function EvidenceList({ artifact, section }) {
  const data = section?.data || {};
  const refs = collectEvidenceRefs(data);
  const all = Array.isArray(artifact?.evidence) ? artifact.evidence : [];
  const evidence = all.filter(item => refs.has(item.id));
  if (!refs.size) return <p>No direct source reference was attached to this region.</p>;
  if (!evidence.length) return <p>The referenced source could not be resolved in this artifact.</p>;
  return (
    <ul>
      {evidence.map((item, index) => (
        <li key={item.id || item.url || index}>
          {item.url
            ? <a href={item.url} target="_blank" rel="noreferrer">{item.title || item.url}</a>
            : (item.title || item.sourceKey || item.kind || "Saved engagement evidence")}
        </li>
      ))}
    </ul>
  );
}

function SectionDetail({ artifact, section, onDiscuss }) {
  if (!section) {
    return (
      <section className="analysis-deck empty-deck">
        <div className="deck-card"><div className="deck-label">Select a section</div><p>Choose any region in the framework to inspect its evidence, implications, gaps, and next questions.</p></div>
      </section>
    );
  }

  const data = section.data || {};
  const position = collectValues(data, ["findings", "claims", "items", "signals", "jobs", "objectives", "initiatives", "strategies"]);
  const implications = collectValues(data, ["implications", "actions", "recommendations", "rationale"]);
  const risks = [
    ...collectValues(data, ["risks", "gaps", "assumptions"]),
    ...(Array.isArray(artifact.gaps) ? artifact.gaps.slice(0, 4) : []),
  ];
  const questions = Array.isArray(artifact.nextQuestions) ? artifact.nextQuestions : [];
  const claims = Array.isArray(data.claims) ? data.claims : Array.isArray(data.findings) ? data.findings : [];
  const basis = [...new Set(claims.map(item => item?.basis).filter(Boolean))];
  const confidence = [...new Set(claims.map(item => item?.confidence).filter(Boolean))];

  return (
    <section className="analysis-deck" aria-label={`${section.label} expanded analysis`}>
      <article className="deck-card deck-primary">
        <div className="deck-label">Current position</div>
        <h3>{section.label}</h3>
        <DetailList values={position} empty={scalarText(data) || artifact.summary || "No concise position was returned."} />
        {(basis.length > 0 || confidence.length > 0) && (
          <div className="claim-badges">
            {basis.map(value => <span key={value}>{value}</span>)}
            {confidence.map(value => <span key={value}>Confidence: {value}</span>)}
          </div>
        )}
      </article>
      <article className="deck-card">
        <div className="deck-label">Supporting evidence</div>
        <EvidenceList artifact={artifact} section={section} />
      </article>
      <article className="deck-card">
        <div className="deck-label">Implications</div>
        <DetailList values={implications} empty={artifact.summary || "No separate implications were returned."} />
      </article>
      <article className="deck-card">
        <div className="deck-label">Risks & gaps</div>
        <DetailList values={risks} empty="No unresolved gap is attached to this region." />
      </article>
      <article className="deck-card deck-questions">
        <div className="deck-label">Next questions</div>
        <DetailList values={questions} empty="No next question was returned." />
        <button className="btn primary discuss-region" onClick={onDiscuss}>DISCUSS THIS REGION IN CHAT</button>
      </article>
    </section>
  );
}

export default function FrameworkPage(props) {
  const params = use(props.params);
  const id = params?.id;
  const framework = FW[id];
  const [artifact, setArtifactState] = useState(null);
  const [latestRun, setLatestRun] = useState(null);
  const [selectedSection, setSelectedSectionState] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [chatPrompt, setChatPrompt] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const chatRailRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    const saved = getArtifact(id);
    const normalized = saved ? normalizeFrameworkArtifact(saved, id) : null;
    setArtifactState(normalized);
    setLatestRun(getLatestRun(id));
    const rememberedSection = getSelectedSection(id);
    const sections = normalized ? getArtifactSections(id, normalized) : [];
    const initialSection = sections.find(section => section.id === rememberedSection) || sections[0] || null;
    setSelectedSectionId(initialSection?.id || "");
    setSelectedSectionState(initialSection);
    setHydrated(true);
  }, [id]);

  const myBuckets = useMemo(() => INTAKE.filter(source => source.readers.includes(id)), [id]);

  if (!framework) {
    return <main className="page-message"><h1>Unknown framework</h1><p><Link href="/pipeline">← Back to the pipeline</Link></p></main>;
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

  const complete = artifactIsComplete(artifact, id);
  const legacy = artifact?.status === "legacy";
  const stale = artifact?.status === "stale";
  const viewable = complete || stale;
  const running = latestRun && ["queued", "researching", "generating", "validating"].includes(latestRun.status);

  return (
    <main className="framework-page">
      <div className="workspace-toolbar">
        <Link className="workspace-close" href="/pipeline">← CLOSE · BACK TO PIPELINE</Link>
        <div className="workspace-meta">
          <span>{complete ? `REVISION ${artifact.revision || 1}` : stale ? `REVISION ${artifact.revision || 1} · STALE` : legacy ? "LEGACY OUTPUT" : "NO ARTIFACT"}</span>
          <span>{artifact?.model || latestRun?.model || "claude-sonnet-5"}</span>
        </div>
      </div>

      <div className="framework-workspace">
        <div className="artifact-column">
          <header className="framework-header">
            <div>
              <div className="eyebrow">Framework workspace · {running ? "run in progress" : complete ? "validated artifact" : stale ? "stale artifact · review required" : "not generated"}</div>
              <h1><span className="framework-icon" aria-hidden="true">{framework.icon}</span> {framework.name}</h1>
              <p className="framework-role">{framework.role}</p>
            </div>
            {artifact?.generatedAt && <div className="artifact-timestamp">Generated<br />{new Date(artifact.generatedAt).toLocaleString()}</div>}
          </header>

          {running && (
            <LoadingState
              label={`${framework.role} is still working`}
              variant="Drive"
              phases={["Reading context", "Researching external signals", "Structuring the framework", "Validating the artifact"]}
              phase={1}
              startedAt={latestRun?.startedAt ? new Date(latestRun.startedAt) : undefined}
            />
          )}

          {viewable ? (
            <>
              <section className="artifact-panel">
                <div className="artifact-panel-label">
                  <span>Structured template · select any region</span>
                  <span>{artifact.evidence?.length || 0} evidence refs · {artifact.gaps?.length || 0} gaps</span>
                </div>
                <FrameworkArtifact
                  artifact={artifact}
                  frameworkId={id}
                  selectedSectionId={selectedSectionId}
                  onSelect={selectSection}
                />
              </section>
              <SectionDetail
                artifact={artifact}
                section={selectedSection}
                onDiscuss={discussSection}
              />
            </>
          ) : (
            <section className="panel empty-artifact">
              <div className="i-label">Structured artifact unavailable</div>
              {legacy
                ? <><p>Your previous plain-text result is preserved below, but it cannot populate the interactive framework safely. Regenerate this framework from the pipeline.</p><div className="output legacy-output">{getOutput(id)}</div></>
                : <p>Return to the pipeline, select this framework, and run “Research & build framework.” The completed structured template will open here automatically.</p>}
              <Link className="btn primary" href="/pipeline">OPEN PIPELINE</Link>
            </section>
          )}

          <section className="framework-provenance">
            <article className="panel">
              <div className="i-label">Reads · saved inputs</div>
              <div className="linkchips">
                {myBuckets.map(source => {
                  const loaded = Boolean(getBucket(source.key).trim());
                  return <Link key={source.key} href="/pipeline" className={loaded ? "" : "off"}>{source.name} · {loaded ? "loaded" : "empty"}</Link>;
                })}
              </div>
              <div className="i-sec">
                <div className="i-label">Tool calls</div>
                <div className="toolchips">{framework.tools.map(tool => <span key={tool}>{tool}</span>)}</div>
              </div>
            </article>
            <article className="panel">
              <div className="i-label">Makes these agents ready</div>
              <div className="linkchips">
                {framework.feeds.length
                  ? framework.feeds.map(key => <Link key={key} href={`/framework/${key}`}>{FW[key].icon} {FW[key].name}</Link>)
                  : <span className="muted-copy">End of pipeline · governed work routes outward</span>}
              </div>
              <div className="i-sec">
                <div className="i-label">Supplied by</div>
                <div className="linkchips">
                  {SOURCES[id].length
                    ? SOURCES[id].map(key => <Link key={key} href={`/framework/${key}`}>{FW[key].name} · {artifactIsComplete(getArtifact(key), key) ? "complete" : "not complete"}</Link>)
                    : <span className="muted-copy">Intake evidence only</span>}
                </div>
              </div>
            </article>
          </section>

          <section className="panel mt next-steps">
            <div className="i-label">Next steps</div>
            {(() => {
              const artifactMap = Object.fromEntries(ORDER.map(key => [key, key === id ? artifact : getArtifact(key)]));
              const readyNow = deriveActiveAgents(artifactMap);
              const nextUp = ORDER.filter(key => key !== id && readyNow.includes(key) && !artifactIsComplete(artifactMap[key], key));
              return (
                <div className="linkchips">
                  {nextUp.slice(0, 3).map(key => (
                    <Link key={key} className="next-chip" href={`/pipeline?select=${key}`}>{FW[key].icon} RUN {FW[key].name} ▸</Link>
                  ))}
                  {!nextUp.length && <span className="muted-copy">Every unlocked framework is complete — regenerate one, or load more evidence.</span>}
                  <Link href="/pipeline" className="next-back">← BACK TO PIPELINE</Link>
                </div>
              );
            })()}
          </section>
        </div>

        <aside className="chat-rail" ref={chatRailRef}>
          <div className="chat-rail-header">
            <div><span>Agent chat</span><b>{framework.role}</b></div>
            <span className="live-indicator">● LIVE</span>
          </div>
          <Chat
            fwKey={id}
            artifact={viewable ? artifact : null}
            focusPrompt={chatPrompt}
            onFocusConsumed={() => setChatPrompt("")}
          />
          <p className="chat-contract">Follow-up chat may browse and propose changes, but it cannot silently mutate the locked artifact.</p>
        </aside>
      </div>
    </main>
  );
}
