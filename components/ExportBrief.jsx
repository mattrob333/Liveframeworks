"use client";

import { FW } from "@/lib/frameworks";
import { normalizeFrameworkArtifact } from "@/lib/frameworkArtifacts";
import FrameworkArtifact from "@/components/FrameworkArtifact";
import { formatBriefDate } from "@/lib/exportBrief";

// The /export preview *is* the client brief. Only completed frameworks
// are rendered — no empty slots for the rest of the roster.
export default function ExportBrief({
  meta,
  generatedAt,
  completeIds = [],
  artifacts = {},
}) {
  const date = formatBriefDate(generatedAt);
  const engagement = meta.paragraph || "LiveFrameworks engagement.";

  return (
    <article className="export-brief">
      <header className="export-brief-head">
        <h1>{meta.title}</h1>
        {date && <p className="export-date">{date}</p>}
        <p className="export-engagement">{engagement}</p>
      </header>

      {completeIds.length === 0 && (
        <p className="export-empty">No completed frameworks yet.</p>
      )}

      {completeIds.map(id => {
        const artifact = artifacts[id];
        const normalized = normalizeFrameworkArtifact(artifact, id);
        const isBmc = id === "bmc";
        return (
          <section key={id} className={`export-fw${isBmc ? " export-fw-bmc" : ""}`}>
            {/* BMC is the map. Later completed frameworks get a section title. */}
            {!isBmc && <h2>{FW[id]?.name || id}</h2>}
            {!isBmc && normalized.summary && (
              <p className="export-prose">{normalized.summary}</p>
            )}
            <FrameworkArtifact
              artifact={artifact}
              frameworkId={id}
              brief
              selectedSectionId=""
            />
            {isBmc && normalized.summary && (
              <p className="export-prose">{normalized.summary}</p>
            )}
          </section>
        );
      })}
    </article>
  );
}
