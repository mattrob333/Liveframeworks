"use client";

import React from "react";
import { FW } from "@/lib/frameworks";
import { currentConstraintLine, normalizeFrameworkArtifact } from "@/lib/frameworkArtifacts";
import FrameworkArtifact from "@/components/FrameworkArtifact";
import { formatBriefDate, orderBriefFrameworks } from "@/lib/exportBrief";

// The /export preview *is* the client brief. Constraint leads. Only
// completed frameworks are rendered — no empty roster slots, no intake
// tapes, no gaps/assumptions, no tool chrome.
export default function ExportBrief({
  meta,
  generatedAt,
  completeIds = [],
  artifacts = {},
}) {
  const date = formatBriefDate(generatedAt);
  const title = String(meta.title || meta.company || "LiveFrameworks").trim() || "LiveFrameworks";
  const lede = String(meta.paragraph || "").trim();
  const constraint = currentConstraintLine(artifacts.toc);
  const briefIds = orderBriefFrameworks(completeIds);

  return (
    <article className="export-brief">
      <header className="export-brief-head">
        <h1>{title}</h1>
        {date && <p className="export-date">{date}</p>}
        {lede && <p className="export-engagement">{lede}</p>}
        {constraint && <p className="export-constraint">{constraint}</p>}
      </header>

      {briefIds.length === 0 && (
        <p className="export-empty">No completed frameworks yet.</p>
      )}

      {briefIds.map(id => {
        const artifact = artifacts[id];
        const normalized = normalizeFrameworkArtifact(artifact, id);
        const isBmc = id === "bmc";
        return (
          <section key={id} className={`export-fw${isBmc ? " export-fw-bmc" : ""}`}>
            {/* BMC is the map. Later completed frameworks get a section title. */}
            {!isBmc && <h2>{FW[id]?.name || id}</h2>}
            {!isBmc && FW[id]?.out && <p className="export-fw-subtitle">{FW[id].out}</p>}
            {!isBmc && normalized.summary && (
              <p className="export-prose">{normalized.summary}</p>
            )}
            <FrameworkArtifact
              artifact={artifact}
              frameworkId={id}
              brief
              document
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
