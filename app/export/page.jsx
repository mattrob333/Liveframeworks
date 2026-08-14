"use client";

import { useEffect, useState } from "react";
import { INTAKE, ORDER } from "@/lib/frameworks";
import { getArtifact, getBucket } from "@/lib/store";
import {
  agentDownloadName,
  buildAgentMarkdown,
  coverageLine,
  engagementMeta,
  listCompleteFrameworks,
} from "@/lib/exportBrief";
import ExportBrief from "@/components/ExportBrief";

// Read the local engagement. The preview is HTML. The download is markdown.
function readExportState() {
  const buckets = {};
  INTAKE.forEach(source => {
    buckets[source.key] = getBucket(source.key);
  });
  const artifacts = {};
  ORDER.forEach(id => {
    const saved = getArtifact(id);
    if (saved) artifacts[id] = saved;
  });
  return {
    buckets,
    artifacts,
    generatedAt: new Date().toISOString(),
  };
}

function downloadAgentFile(state) {
  const markdown = buildAgentMarkdown(state);
  const meta = engagementMeta(state.buckets);
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = agentDownloadName(meta);
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const [state, setState] = useState(null);

  useEffect(() => {
    setState(readExportState());
  }, []);

  if (!state) return <main className="export-page" />;

  const meta = engagementMeta(state.buckets);
  const completeIds = listCompleteFrameworks(state.artifacts);
  const evidenceCount = INTAKE.filter(source => String(state.buckets[source.key] || "").trim()).length;

  return (
    <main className="export-page">
      {/* Screen-only: coverage and the two buttons. Print hides this chrome. */}
      <div className="export-chrome">
        <p className="export-coverage">{coverageLine(evidenceCount, completeIds.length)}</p>
        <div className="btnrow">
          <button className="btn primary" type="button" onClick={() => window.print()}>
            Print brief
          </button>
          <button className="btn" type="button" onClick={() => downloadAgentFile(readExportState())}>
            Download for an agent
          </button>
        </div>
      </div>

      <ExportBrief
        meta={meta}
        generatedAt={state.generatedAt}
        completeIds={completeIds}
        artifacts={state.artifacts}
      />
    </main>
  );
}
