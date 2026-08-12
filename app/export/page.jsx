"use client";

import { useEffect, useState } from "react";
import { INTAKE, FW, ORDER, STAGES } from "@/lib/frameworks";
import { getArtifact, getBucket, getRuns } from "@/lib/store";
import { artifactIsComplete } from "@/lib/agentContext";

function buildSnapshot() {
  const generatedAt = new Date().toISOString();
  let markdown = `# LIVEFRAMEWORKS — ENGAGEMENT SNAPSHOT\nGenerated ${generatedAt} · structured, evidence-grounded framework artifacts\n\n`;

  markdown += "## 1. EVIDENCE LOADED\n\n";
  let evidenceFound = false;
  INTAKE.forEach(source => {
    const value = getBucket(source.key).trim();
    if (!value) return;
    evidenceFound = true;
    markdown += `### ${source.name}\n\n\`\`\`text\n${value}\n\`\`\`\n\n`;
  });
  if (!evidenceFound) markdown += "_No intake buckets loaded._\n\n";

  markdown += "## 2. FRAMEWORK ARTIFACTS\n\n";
  let artifactFound = false;
  STAGES.forEach(stage => {
    const available = ORDER.filter(key => FW[key].stage === stage.key && getArtifact(key));
    if (!available.length) return;
    artifactFound = true;
    markdown += `### STAGE ${stage.num} — ${stage.title}\n\n`;
    available.forEach(key => {
      const artifact = getArtifact(key);
      const runs = getRuns(key);
      markdown += `#### ${FW[key].name} (${FW[key].role})\n\n`;
      markdown += `Status: ${artifact.status} · Revision: ${artifact.revision || 0} · Runs retained: ${runs.length}\n\n`;
      markdown += `${artifact.summary || "No summary returned."}\n\n`;
      markdown += `\`\`\`json\n${JSON.stringify(artifact, null, 2)}\n\`\`\`\n\n---\n\n`;
    });
  });
  if (!artifactFound) markdown += "_No framework artifacts have been generated._\n\n";

  const complete = ORDER.filter(key => artifactIsComplete(getArtifact(key), key));
  const pending = ORDER.filter(key => !artifactIsComplete(getArtifact(key), key));
  markdown += `## 3. COVERAGE\n\nValidated complete: ${complete.length} of ${ORDER.length} frameworks.\n`;
  if (pending.length) markdown += `Not complete: ${pending.map(key => FW[key].name).join(", ")}.\n`;
  markdown += "\nEvery structured claim retains its Known / Inferred / Assumed / Missing basis, confidence, and evidence references where supplied.\n";
  return markdown;
}

export default function ExportPage() {
  const [counts, setCounts] = useState({ evidence: 0, artifacts: 0 });
  const [preview, setPreview] = useState("");

  useEffect(() => {
    setCounts({
      evidence: INTAKE.filter(source => getBucket(source.key).trim()).length,
      artifacts: ORDER.filter(key => artifactIsComplete(getArtifact(key), key)).length,
    });
    setPreview(buildSnapshot());
  }, []);

  function download() {
    const url = URL.createObjectURL(new Blob([buildSnapshot()], { type: "text/markdown" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `liveframeworks-snapshot-${new Date().toISOString().slice(0, 10)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <header className="pipeline-header">
        <div className="eyebrow">Deliverable</div>
        <h1>Engagement Snapshot</h1>
        <p className="sub">Loaded evidence, complete structured framework artifacts, provenance, gaps, assumptions, and run coverage in one portable file.</p>
      </header>

      <div className="panel mt export-summary">
        <div className="i-label">Current state</div>
        <p>{counts.evidence} of {INTAKE.length} evidence buckets loaded · {counts.artifacts} of {ORDER.length} framework artifacts complete</p>
        <div className="btnrow">
          <button className="btn primary" onClick={download}>DOWNLOAD SNAPSHOT (.MD)</button>
          <button className="btn" onClick={() => window.print()}>PRINT / PDF</button>
        </div>
      </div>

      <div className="panel mt">
        <div className="i-label">Preview</div>
        <div className="output export-preview">{preview}</div>
      </div>
    </main>
  );
}
