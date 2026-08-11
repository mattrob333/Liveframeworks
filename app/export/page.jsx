"use client";
import { useEffect, useState } from "react";
import { INTAKE, FW, ORDER, STAGES } from "@/lib/frameworks";
import { getBucket, getOutput } from "@/lib/store";

function buildSnapshot() {
  const d = new Date().toISOString().slice(0, 10);
  let md = `# LIVEFRAMEWORKS — ENGAGEMENT SNAPSHOT\nGenerated ${d} · liveframeworks pipeline · evidence-grounded first-pass outputs\n\n`;

  md += `## 1. EVIDENCE LOADED\n\n`;
  let anyE = false;
  INTAKE.forEach(s => {
    const v = (getBucket(s.key) || "").trim();
    if (v) { anyE = true; md += `### ${s.name}\n\n\u0060\u0060\u0060\n${v}\n\u0060\u0060\u0060\n\n`; }
  });
  if (!anyE) md += `_No intake buckets loaded._\n\n`;

  md += `## 2. FRAMEWORK OUTPUTS\n\n`;
  let anyO = false;
  STAGES.forEach(st => {
    const done = ORDER.filter(k => FW[k].stage === st.key && (getOutput(k) || "").trim());
    if (!done.length) return;
    anyO = true;
    md += `### STAGE ${st.num} — ${st.title}\n\n`;
    done.forEach(k => {
      md += `#### ${FW[k].name} (${FW[k].role}) — ${FW[k].out}\n\n${getOutput(k).trim()}\n\n---\n\n`;
    });
  });
  if (!anyO) md += `_No framework outputs locked yet. Satisfy the Business Model Canvas first._\n\n`;

  const notRun = ORDER.filter(k => !(getOutput(k) || "").trim());
  md += `## 3. COVERAGE\n\nLocked: ${ORDER.length - notRun.length} of ${ORDER.length} frameworks.\n`;
  if (notRun.length) md += `Not yet run: ${notRun.map(k => FW[k].name).join(", ")}.\n`;
  md += `\n_All outputs are first-pass, generated against the evidence above. Claims outside that evidence were required to be labeled as inference by each agent's grounding rules._\n`;
  return md;
}

export default function ExportPage() {
  const [counts, setCounts] = useState({ e: 0, o: 0 });
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const e = INTAKE.filter(s => (getBucket(s.key) || "").trim()).length;
    const o = ORDER.filter(k => (getOutput(k) || "").trim()).length;
    setCounts({ e, o });
    setPreview(buildSnapshot());
  }, []);

  function download() {
    const blob = new Blob([buildSnapshot()], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "liveframeworks-snapshot-" + new Date().toISOString().slice(0, 10) + ".md";
    a.click();
  }

  return (
    <main>
      <header style={{ padding: "40px 0 8px" }}>
        <div className="eyebrow">Deliverable</div>
        <h1>Engagement Snapshot</h1>
        <p className="sub">Everything the pipeline knows, compiled: loaded evidence, every locked framework output organized by stage, and a coverage report. One file you can hand to the company.</p>
      </header>

      <div className="panel mt" style={{ maxWidth: 720 }}>
        <div className="i-label">Current state</div>
        <p style={{ fontSize: 12.5 }}>{counts.e} of {INTAKE.length} evidence buckets loaded · {counts.o} of {ORDER.length} framework outputs locked</p>
        <div className="btnrow">
          <button className="btn primary" onClick={download}>▸ DOWNLOAD SNAPSHOT (.MD)</button>
          <button className="btn" onClick={() => window.print()}>⎙ PRINT / PDF</button>
        </div>
      </div>

      <div className="panel mt">
        <div className="i-label">Preview</div>
        <div className="output" style={{ maxHeight: "60vh", overflowY: "auto" }}>{preview}</div>
      </div>
    </main>
  );
}
