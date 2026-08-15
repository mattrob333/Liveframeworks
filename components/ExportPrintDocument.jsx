"use client";

import React from "react";
import { FW } from "@/lib/frameworks";
import { currentConstraintLine, getArtifactSections, normalizeFrameworkArtifact } from "@/lib/frameworkArtifacts";
import { asList, formatBriefDate } from "@/lib/exportBrief";
import { playerLinkUrl } from "@/lib/playerLinks";

// Print-only document. Screen /export keeps the maps. No grid on paper.

const BMC_PRINT_ORDER = [
  "keyPartners",
  "keyActivities",
  "keyResources",
  "valuePropositions",
  "customerRelationships",
  "channels",
  "customerSegments",
  "costStructure",
  "revenueStreams",
];

const INDUSTRY_MAP_PRINT_ORDER = [
  "segments",
  "glossary",
  "expertsAndSources",
  "players",
  "technologyFlows",
  "economicFlows",
  "personnelFlows",
  "history",
  "future",
];

// Four quadrant headings, then the TOWS cross labeled so the pairing is obvious.
const SWOT_PRINT_ORDER = [
  "strengths",
  "weaknesses",
  "opportunities",
  "threats",
  "so",
  "st",
  "wo",
  "wt",
];

function sectionOrder(frameworkId, sections) {
  const preferred = frameworkId === "bmc"
    ? BMC_PRINT_ORDER
    : frameworkId === "industrymap"
      ? INDUSTRY_MAP_PRINT_ORDER
      : frameworkId === "swot"
        ? SWOT_PRINT_ORDER
        : [];
  if (!preferred.length) return sections;
  const byId = Object.fromEntries(sections.map(section => [section.id, section]));
  return preferred.map(id => byId[id]).filter(Boolean);
}

function PrintList({ items }) {
  if (!items.length) return null;
  return (
    <ul>
      {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
    </ul>
  );
}

function PrintPlayers({ players, evidence }) {
  const rows = (Array.isArray(players) ? players : []).filter(player => player?.name);
  if (!rows.length) return null;
  return (
    <ul>
      {rows.map((player, index) => {
        const href = playerLinkUrl(player, evidence);
        return (
          <li key={player.id || `${player.name}-${index}`}>
            {href
              ? <a href={href} target="_blank" rel="noreferrer">{player.name}</a>
              : player.name}
          </li>
        );
      })}
    </ul>
  );
}

function PrintFramework({ frameworkId, artifact }) {
  const normalized = normalizeFrameworkArtifact(artifact, frameworkId);
  const sections = sectionOrder(frameworkId, getArtifactSections(frameworkId, normalized));
  return (
    <section className="export-print-fw">
      <h2>{FW[frameworkId]?.name || frameworkId}</h2>
      {normalized.summary && <p>{normalized.summary}</p>}
      {sections.map(section => {
        const isPlayers = section.id === "players" || section.kind === "players";
        const items = isPlayers ? [] : asList(section.data);
        const hasPlayers = isPlayers && Array.isArray(section.data) && section.data.some(player => player?.name);
        if (!items.length && !hasPlayers) return null;
        return (
          <section key={section.id} className="export-print-sec">
            <h3>{section.label}</h3>
            {isPlayers
              ? <PrintPlayers players={section.data} evidence={normalized.evidence} />
              : <PrintList items={items} />}
          </section>
        );
      })}
    </section>
  );
}

export default function ExportPrintDocument({
  meta,
  generatedAt,
  completeIds = [],
  artifacts = {},
}) {
  const date = formatBriefDate(generatedAt);
  const lede = String(meta.paragraph || "").trim();
  const constraint = currentConstraintLine(artifacts.toc);

  return (
    <article className="export-print-doc">
      <header className="export-print-head">
        <h1>{meta.title}</h1>
        {date && <p className="export-print-date">{date}</p>}
        {lede && <p className="export-print-lede">{lede}</p>}
        {constraint && <p className="export-print-lede">{constraint}</p>}
      </header>

      {completeIds.length === 0 && (
        <p>No completed frameworks yet.</p>
      )}

      {completeIds.map(id => (
        <PrintFramework key={id} frameworkId={id} artifact={artifacts[id]} />
      ))}
    </article>
  );
}
