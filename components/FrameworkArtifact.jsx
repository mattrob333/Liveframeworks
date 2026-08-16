"use client";

import React, { useContext, useEffect, useState } from "react";
import {
  currentConstraintLine,
  getArtifactDefinition,
  getArtifactValue,
  normalizeFrameworkArtifact,
  validateFrameworkArtifact,
} from "@/lib/frameworkArtifacts";
import { playerLinkUrl } from "@/lib/playerLinks";
import HowToRead from "@/components/HowToRead";
import Apparatus from "@/components/Apparatus";
import { apparatusPropsFromGrounding } from "@/lib/apparatus";

const BMC_CLASSES = {
  keyPartners: "bmc-kp",
  keyActivities: "bmc-ka",
  keyResources: "bmc-kr",
  valuePropositions: "bmc-vp",
  customerRelationships: "bmc-cr",
  channels: "bmc-ch",
  customerSegments: "bmc-cs",
  costStructure: "bmc-cost",
  revenueStreams: "bmc-rev",
};

// /export document mode: the client brief, not the live map. No digest
// chrome, evidence badges, or empty-section stubs in the DOM.
const ExportDocument = React.createContext(false);

const LABELS = {
  currentAllocationPct: "Current allocation",
  targetAllocationPct: "Target allocation",
  currentState: "Current",
  targetState: "Target",
  desiredOutcome: "Outcome",
  satisfactionImpact: "Impact",
  expectedThroughputEffect: "Throughput effect",
  throughputMetric: "Throughput metric",
  severity: "Severity",
  impact: "Impact type",
  horizon: "Horizon",
  rationale: "Rationale",
  risk: "Risk",
  quadrant: "Quadrant",
  currentScore: "Current score",
  proposedScore: "Proposed score",
  competitorScore: "Competitor score",
  customerItem: "Customer side",
  valueItem: "Value side",
  strength: "Fit",
  location: "Location",
  type: "Type",
  position: "Position",
  revenue: "Revenue",
  marketShare: "Market share",
  growth: "Growth",
  geography: "Geography",
  baseline: "Baseline",
  target: "Target",
  unit: "Unit",
  source: "Source",
  frequency: "Frequency",
  owner: "Owner",
  title: "Title",
};

const textValue = value => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(textValue).filter(item => item !== "-").join(" · ") || "-";
  if (typeof value === "object") {
    return value.text || value.name || value.title || value.statement || value.objective || value.action || value.factor || value.reason || "-";
  }
  return "-";
};

function Meta({ value }) {
  const documentMode = useContext(ExportDocument);
  if (documentMode) return null;
  const props = apparatusPropsFromGrounding(value);
  if (!props) return null;
  return (
    <Apparatus
      className="artifact-meta"
      role="group"
      aria-label="Grounding metadata"
      {...props}
    />
  );
}

function EmptyFinding() {
  const documentMode = useContext(ExportDocument);
  if (documentMode) return null;
  return <span className="artifact-empty artifact-unsurveyed">UNSURVEYED</span>;
}

function PlayerName({ player, evidence = [] }) {
  const name = player?.name || "";
  const href = playerLinkUrl(player, evidence);
  if (!name) return null;
  if (!href) return <span className="player-name">{name}</span>;
  return (
    <a
      className="player-link"
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={event => event.stopPropagation()}
    >
      {name}
    </a>
  );
}

function PlayersStrip({ players, evidence = [] }) {
  if (!Array.isArray(players) || !players.length) return <EmptyFinding />;
  return (
    <ul className="industry-map-players-strip">
      {players.map((player, index) => (
        <li className="player-chip" key={player?.id || `${player?.name || "player"}-${index}`}>
          <PlayerName player={player} evidence={evidence} />
        </li>
      ))}
    </ul>
  );
}

function CompactItem({ item, evidence = [] }) {
  const documentMode = useContext(ExportDocument);
  if (item === null || item === undefined || item === "") return <EmptyFinding />;
  if (typeof item !== "object") return <span className="artifact-item-text">{String(item)}</span>;
  if (Array.isArray(item)) {
    if (!item.length) return <EmptyFinding />;
    const shown = documentMode ? item : item.slice(0, 5);
    return (
      <ul className="artifact-findings">
        {shown.map((entry, index) => (
          <li key={entry?.id || `${textValue(entry)}-${index}`}>
            <CompactItem item={entry} evidence={evidence} />
          </li>
        ))}
        {!documentMode && item.length > 5 && <li className="artifact-more">+{item.length - 5} more</li>}
      </ul>
    );
  }

  const primary = textValue(item);
  const playerHref = item.name && ("position" in item || "marketShare" in item || item.url)
    ? playerLinkUrl(item, evidence)
    : "";
  const details = [
    ["currentAllocationPct", item.currentAllocationPct === null || item.currentAllocationPct === undefined ? null : `${item.currentAllocationPct}%`],
    ["targetAllocationPct", item.targetAllocationPct === null || item.targetAllocationPct === undefined ? null : `${item.targetAllocationPct}%`],
    ["currentState", item.currentState],
    ["targetState", item.targetState],
    ["desiredOutcome", item.desiredOutcome],
    ["satisfactionImpact", item.satisfactionImpact],
    ["expectedThroughputEffect", item.expectedThroughputEffect],
    ["throughputMetric", item.throughputMetric],
    ["severity", item.severity],
    ["impact", item.impact],
    ["horizon", item.horizon],
    ["rationale", item.rationale],
    ["risk", item.risk],
    ["quadrant", item.quadrant],
    ["currentScore", item.currentScore],
    ["proposedScore", item.proposedScore],
    ["competitorScore", item.competitorScore],
    ["customerItem", item.customerItem],
    ["valueItem", item.valueItem],
    ["strength", item.strength],
    ["location", item.location],
    ["type", item.type],
    ["position", item.position === "unknown" ? null : item.position],
    ["revenue", item.revenue],
    ["marketShare", item.marketShare],
    ["growth", item.growth],
    ["geography", item.geography],
    ["baseline", item.baseline],
    ["target", item.target],
    ["unit", item.unit],
    ["source", item.source],
    ["frequency", item.frequency],
    ["owner", item.owner],
    ["title", item.title],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  return (
    <div className="artifact-item">
      {primary !== "-" && (
        playerHref
          ? <PlayerName player={item} evidence={evidence} />
          : <span className="artifact-item-text">{primary}</span>
      )}
      {item.score !== null && item.score !== undefined && <span className="artifact-score">Score {item.score}/5</span>}
      {item.direction && item.direction !== "unknown" && <span className="artifact-direction">{item.direction}</span>}
      {details.length > 0 && (
        <div className="artifact-details">
          {details.map(([key, value]) => <span key={key}><b>{LABELS[key] || key}:</b> {String(value)}</span>)}
        </div>
      )}
      {Array.isArray(item.findings) && <CompactItem item={item.findings} />}
      {Array.isArray(item.initiatives) && <CompactItem item={item.initiatives} />}
      {Array.isArray(item.measures) && item.measures.length > 0 && <div className="artifact-nested"><b>Measures</b><CompactItem item={item.measures} /></div>}
      {Array.isArray(item.keyResults) && item.keyResults.length > 0 && <div className="artifact-nested"><b>Key results</b><CompactItem item={item.keyResults} /></div>}
      {!documentMode && Array.isArray(item.gaps) && item.gaps.length > 0 && <div className="artifact-nested"><b>Gaps</b><CompactItem item={item.gaps} /></div>}
      {Array.isArray(item.actions) && item.actions.length > 0 && <div className="artifact-nested"><b>Actions</b><CompactItem item={item.actions} /></div>}
      <Meta value={item} />
    </div>
  );
}

// Canvas cells stay a fixed shape: a few plain bullets, no metadata badges or
// nested detail. The full readout lives in the detail region below on click.
function DigestItem({ item }) {
  const documentMode = useContext(ExportDocument);
  if (item === null || item === undefined || item === "") return <EmptyFinding />;
  const entries = Array.isArray(item) ? item : [item];
  if (!entries.length) return <EmptyFinding />;
  const shown = documentMode ? entries : entries.slice(0, 3);
  return (
    <ul className="artifact-findings artifact-digest">
      {shown.map((entry, index) => {
        const text = textValue(entry);
        return <li key={entry?.id || `${text}-${index}`}>{text === "-" ? <EmptyFinding /> : text}</li>;
      })}
      {!documentMode && entries.length > 3 && <li className="artifact-more">+{entries.length - 3} more — open for the full readout</li>}
    </ul>
  );
}

function sectionPayload(artifact, section) {
  return getArtifactValue(artifact, section.path);
}

function rowSelectionId(section, row, index) {
  const stableId = row?.id || row?.name || row?.statement || row?.objective || `row-${index}`;
  return `${section?.id || "rows"}:${stableId}${row?.id ? "" : `:${index}`}`;
}

function sectionIsEmpty(data, players) {
  if (players) return !Array.isArray(data) || !data.some(player => player?.name);
  if (Array.isArray(data)) return data.length === 0;
  if (data == null || data === "") return true;
  return false;
}

function SelectableSection({ artifact, section, onSelect, selectedSectionId, className = "", digest = false, omitIfEmpty = false }) {
  const data = sectionPayload(artifact, section);
  const choose = () => onSelect({ ...section, frameworkId: artifact.frameworkId, data });
  const selected = selectedSectionId === section.id;
  const players = section.kind === "players" || section.id === "players";
  if (omitIfEmpty && sectionIsEmpty(data, players)) return null;
  return (
    <div
      role="button"
      tabIndex={0}
      className={`artifact-section panel ${selected ? "is-selected" : ""} ${className}`.trim()}
      onClick={choose}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(); }
      }}
      aria-label={`Open ${section.label}`}
      aria-pressed={selected}
    >
      <span className="artifact-section-title i-label t">{section.label}</span>
      <div className="artifact-section-content d">
        {players
          ? <PlayersStrip players={Array.isArray(data) ? data : []} evidence={artifact.evidence} />
          : digest
            ? <DigestItem item={data} />
            : <CompactItem item={data} evidence={artifact.evidence} />}
      </div>
    </div>
  );
}

function CanvasView({ artifact, definition, onSelect, selectedSectionId }) {
  return (
    <div className="bmc-grid framework-artifact-canvas">
      {definition.sections.map(section => (
        <SelectableSection
          key={section.id}
          artifact={artifact}
          section={section}
          onSelect={onSelect}
          selectedSectionId={selectedSectionId}
          className={`bmc-cell ${BMC_CLASSES[section.id] || ""}`}
          digest
        />
      ))}
    </div>
  );
}

function SectionView({ artifact, definition, onSelect, selectedSectionId, sections }) {
  const documentMode = useContext(ExportDocument);
  const shown = sections || definition.sections;
  return (
    <div className={`artifact-sections artifact-${definition.view} grid2`}>
      {shown.map((section, index) => (
        <SelectableSection
          key={section.id}
          artifact={artifact}
          section={section}
          onSelect={onSelect}
          selectedSectionId={selectedSectionId}
          className={`artifact-section-${section.kind} artifact-section-${index + 1}`}
          omitIfEmpty={documentMode}
        />
      ))}
    </div>
  );
}

const INDUSTRY_MAP_BANDS = [
  { id: "terrain", label: "Terrain", subtitle: "The parts of the market, and the words people use for them.", items: ["segments", "glossary", "expertsAndSources"] },
  { id: "players", label: "Players", subtitle: "The companies standing on that ground.", items: ["players"] },
  { id: "flows", label: "Flows", subtitle: "How technology, money, and people move through the market.", items: ["technologyFlows", "economicFlows", "personnelFlows"] },
  { id: "time", label: "Time", subtitle: "What the ground looked like, and where it is heading.", items: ["history", "future"] },
];

// Classic Ansoff geometry: existing/new products × existing/new markets.
// Cells read payload.quadrants.* only — empty arrays stay empty.
const ANSOFF_ROWS = [
  {
    market: "Existing markets",
    cells: ["marketPenetration", "productDevelopment"],
  },
  {
    market: "New markets",
    cells: ["marketDevelopment", "diversification"],
  },
];

// Classic SWOT geometry: helpful/harmful × internal/external.
// Cells read payload.quadrants.* only — empty arrays stay empty.
const SWOT_ROWS = [
  {
    locus: "Internal",
    cells: ["strengths", "weaknesses"],
  },
  {
    locus: "External",
    cells: ["opportunities", "threats"],
  },
];

// TOWS crossing: the same internal × external pairing, made literal.
// Cells read payload.tows.* only — empty arrays stay empty.
const TOWS_ROWS = [
  {
    external: "Opportunities",
    cells: ["so", "wo"],
  },
  {
    external: "Threats",
    cells: ["st", "wt"],
  },
];

function AnsoffView({ artifact, definition, onSelect, selectedSectionId }) {
  const byId = Object.fromEntries(definition.sections.map(section => [section.id, section]));
  const selectedVector = byId.selectedVector;
  return (
    <div className="ansoff-matrix">
      <div className="ansoff-matrix-frame" role="grid" aria-label="Ansoff Matrix">
        <span className="ansoff-axis ansoff-axis-corner" aria-hidden="true" />
        <span className="ansoff-axis ansoff-axis-col">Existing products</span>
        <span className="ansoff-axis ansoff-axis-col">New products</span>
        {ANSOFF_ROWS.flatMap(row => [
          <span key={row.market} className="ansoff-axis ansoff-axis-row">{row.market}</span>,
          ...row.cells.map(id => byId[id] && (
            <SelectableSection
              key={id}
              artifact={artifact}
              section={byId[id]}
              onSelect={onSelect}
              selectedSectionId={selectedSectionId}
              className={`ansoff-cell ansoff-${id}`}
              digest
            />
          )),
        ])}
      </div>
      {selectedVector && (
        <div className="ansoff-vector">
          <SelectableSection
            artifact={artifact}
            section={selectedVector}
            onSelect={onSelect}
            selectedSectionId={selectedSectionId}
          />
        </div>
      )}
    </div>
  );
}

function SwotView({ artifact, definition, onSelect, selectedSectionId }) {
  const byId = Object.fromEntries(definition.sections.map(section => [section.id, section]));
  return (
    <div className="swot-matrix">
      <div className="swot-matrix-frame swot-quadrants" role="grid" aria-label="SWOT">
        <span className="swot-axis swot-axis-corner" aria-hidden="true" />
        <span className="swot-axis swot-axis-col">Helpful</span>
        <span className="swot-axis swot-axis-col">Harmful</span>
        {SWOT_ROWS.flatMap(row => [
          <span key={row.locus} className="swot-axis swot-axis-row">{row.locus}</span>,
          ...row.cells.map(id => byId[id] && (
            <SelectableSection
              key={id}
              artifact={artifact}
              section={byId[id]}
              onSelect={onSelect}
              selectedSectionId={selectedSectionId}
              className={`swot-cell swot-${id}`}
              digest
            />
          )),
        ])}
      </div>
      <div className="swot-matrix-frame swot-tows" role="grid" aria-label="TOWS">
        <span className="swot-axis swot-axis-corner" aria-hidden="true" />
        <span className="swot-axis swot-axis-col">Strengths</span>
        <span className="swot-axis swot-axis-col">Weaknesses</span>
        {TOWS_ROWS.flatMap(row => [
          <span key={row.external} className="swot-axis swot-axis-row">{row.external}</span>,
          ...row.cells.map(id => byId[id] && (
            <SelectableSection
              key={id}
              artifact={artifact}
              section={byId[id]}
              onSelect={onSelect}
              selectedSectionId={selectedSectionId}
              className={`swot-cell swot-${id}`}
              digest
            />
          )),
        ])}
      </div>
    </div>
  );
}

function IndustryMapView({ artifact, definition, onSelect, selectedSectionId }) {
  const byId = Object.fromEntries(definition.sections.map(section => [section.id, section]));
  return (
    <div className="industry-map">
      {INDUSTRY_MAP_BANDS.map(band => (
        <div key={band.id} className={`industry-map-band industry-map-${band.id}`}>
          <span className="industry-map-band-label">{band.label}</span>
          {band.subtitle && <p className="industry-map-band-subtitle">{band.subtitle}</p>}
          {band.items.map(id => byId[id] && (
            <SelectableSection
              key={id}
              artifact={artifact}
              section={byId[id]}
              onSelect={onSelect}
              selectedSectionId={selectedSectionId}
              className={`industry-map-cell industry-map-${id}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function TableView({ artifact, definition, onSelect, selectedSectionId, selectedRowId }) {
  const documentMode = useContext(ExportDocument);
  const rows = getArtifactValue(artifact, definition.table.path);
  const primarySection = definition.sections.find(section => section.path === definition.table.path) || definition.sections[0];
  const otherSections = definition.sections.filter(section => section !== primarySection);
  const extraCols = documentMode ? 0 : 1;
  return (
    <div className="artifact-table-wrap panel">
      <table role="grid" aria-label={primarySection.label} className={`artifact-table ${selectedSectionId === primarySection.id ? "is-selected" : ""}`.trim()}>
        <thead>
          <tr>
            {definition.table.columns.map(([, label]) => <th key={label} scope="col">{label}</th>)}
            {!documentMode && <th scope="col">Grounding</th>}
          </tr>
        </thead>
        <tbody>
          {Array.isArray(rows) && rows.length > 0 ? rows.map((row, index) => {
            const selectionId = rowSelectionId(primarySection, row, index);
            const selected = { ...primarySection, frameworkId: artifact.frameworkId, rowIndex: index, selectionId, data: row };
            return (
              <tr
                key={selectionId}
                tabIndex={0}
                className={selectedRowId === selectionId ? "is-selected" : ""}
                aria-selected={selectedRowId === selectionId}
                onClick={() => onSelect(selected)}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(selected); }
                }}
              >
                {definition.table.columns.map(([key]) => <td key={key}>{textValue(row?.[key])}</td>)}
                {!documentMode && <td><Meta value={row} /></td>}
              </tr>
            );
          }) : (
            <tr><td colSpan={definition.table.columns.length + extraCols}><EmptyFinding /></td></tr>
          )}
        </tbody>
      </table>
      {otherSections.length > 0 && (
        <div className="artifact-table-supporting">
          {otherSections.map(section => (
            <SelectableSection
              key={section.id}
              artifact={artifact}
              section={section}
              onSelect={onSelect}
              selectedSectionId={selectedSectionId}
              omitIfEmpty={documentMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RaciView({ artifact, definition, onSelect, selectedSectionId, selectedRowId }) {
  const documentMode = useContext(ExportDocument);
  const roles = Array.isArray(artifact.payload.roles) ? artifact.payload.roles : [];
  const workItems = Array.isArray(artifact.payload.workItems) ? artifact.payload.workItems : [];
  const rolesSection = definition.sections.find(section => section.id === "roles");
  const workSection = definition.sections.find(section => section.id === "workItems");
  const supporting = definition.sections.filter(section => ["approvalGates", "attestations"].includes(section.id));
  return (
    <div className="artifact-raci-wrap panel">
      {rolesSection && (
        <div className="artifact-raci-roles">
          <SelectableSection
            artifact={artifact}
            section={rolesSection}
            onSelect={onSelect}
            selectedSectionId={selectedSectionId}
            omitIfEmpty={documentMode}
          />
        </div>
      )}
      <table role="grid" aria-label={workSection?.label || "RACI work matrix"} className={`artifact-table artifact-raci-table ${selectedSectionId === workSection?.id ? "is-selected" : ""}`.trim()}>
        <thead><tr><th scope="col">Work</th>{roles.map(role => <th key={role.id} scope="col">{role.name}</th>)}{!documentMode && <th scope="col">Grounding</th>}</tr></thead>
        <tbody>
          {workItems.length > 0 ? workItems.map((item, index) => {
            const selectionId = rowSelectionId(workSection, item, index);
            const selected = { ...workSection, frameworkId: artifact.frameworkId, rowIndex: index, selectionId, data: item };
            return (
              <tr
                key={selectionId}
                tabIndex={0}
                className={selectedRowId === selectionId ? "is-selected" : ""}
                aria-selected={selectedRowId === selectionId}
                onClick={() => onSelect(selected)}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(selected); }
                }}
              >
                <th scope="row">
                  {item.name || "Unnamed work item"}
                  {item.capabilityEnvelope && (
                    <span className="artifact-capability-summary">
                      {item.capabilityEnvelope.allowedActions?.length || 0} actions · {item.capabilityEnvelope.limits?.length || 0} limits
                    </span>
                  )}
                </th>
                {roles.map(role => <td key={role.id}>{(item.assignments || []).find(assignment => assignment.roleId === role.id)?.code || "-"}</td>)}
                {!documentMode && <td><Meta value={item} /></td>}
              </tr>
            );
          }) : <tr><td colSpan={roles.length + (documentMode ? 1 : 2)}><EmptyFinding /></td></tr>}
        </tbody>
      </table>
      <div className="artifact-table-supporting">
        {supporting.map(section => (
          <SelectableSection
            key={section.id}
            artifact={artifact}
            section={section}
            onSelect={onSelect}
            selectedSectionId={selectedSectionId}
            omitIfEmpty={documentMode}
          />
        ))}
      </div>
    </div>
  );
}

function EvidenceList({ evidence }) {
  if (!Array.isArray(evidence) || evidence.length === 0) return null;
  return (
    <div className="artifact-evidence panel mt">
      <span className="artifact-evidence-title">Evidence used</span>
      <HowToRead of="evidence" />
      <ul>
        {evidence.slice(0, 8).map(item => (
          <li key={item.id}>
            <Apparatus className="artifact-source-kind" kind={item.kind} />{" "}
            {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title || item.url}</a> : <span>{item.title || item.id}</span>}
          </li>
        ))}
        {evidence.length > 8 && <li>+{evidence.length - 8} more sources</li>}
      </ul>
    </div>
  );
}

function SafeFallback({ normalized, frameworkId }) {
  const content = normalized.legacyText || (normalized.rawArtifact ? JSON.stringify(normalized.rawArtifact, null, 2) : "No structured result yet.");
  return (
    <div className="framework-artifact artifact-fallback" data-framework={frameworkId || normalized.frameworkId || "unknown"}>
      <div className="artifact-warning">This result is not a recognized structured artifact. Its original content is preserved below.</div>
      <pre className="output artifact-legacy-output">{content}</pre>
    </div>
  );
}

export default function FrameworkArtifact({ artifact, frameworkId, selectedSectionId, onSelect = () => {}, brief = false, document = false }) {
  const normalized = normalizeFrameworkArtifact(artifact, frameworkId);
  const definition = getArtifactDefinition(normalized.frameworkId);
  const validation = validateFrameworkArtifact(artifact, frameworkId);
  const emptyInput = artifact === null || artifact === undefined || artifact === "";
  const firstSectionId = definition?.sections[0]?.id || "";
  const controlled = selectedSectionId !== undefined;
  const [internalSectionId, setInternalSectionId] = useState(firstSectionId);
  const [internalRowId, setInternalRowId] = useState("");
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const activeSectionId = controlled ? (selectedSectionId || "") : (internalSectionId || firstSectionId);

  useEffect(() => { setInternalSectionId(firstSectionId); }, [normalized.frameworkId, firstSectionId]);
  useEffect(() => {
    setInternalRowId(current => current.startsWith(`${activeSectionId}:`) ? current : "");
  }, [normalized.frameworkId, activeSectionId]);

  if (!definition || normalized.legacyText || normalized.rawArtifact || emptyInput) {
    if (document) return null;
    return <SafeFallback normalized={normalized} frameworkId={frameworkId} />;
  }

  const select = section => {
    if (!controlled) setInternalSectionId(section.id);
    setInternalRowId(section.selectionId || "");
    onSelect(section);
  };
  let view;
  if (normalized.frameworkId === "bmc") view = <CanvasView artifact={normalized} definition={definition} onSelect={select} selectedSectionId={activeSectionId} />;
  else if (normalized.frameworkId === "industrymap") view = <IndustryMapView artifact={normalized} definition={definition} onSelect={select} selectedSectionId={activeSectionId} />;
  else if (normalized.frameworkId === "raci") view = <RaciView artifact={normalized} definition={definition} onSelect={select} selectedSectionId={activeSectionId} selectedRowId={internalRowId} />;
  else if (definition.view === "table" && definition.table) view = <TableView artifact={normalized} definition={definition} onSelect={select} selectedSectionId={activeSectionId} selectedRowId={internalRowId} />;
  else if (normalized.frameworkId === "ansoff") view = <AnsoffView artifact={normalized} definition={definition} onSelect={select} selectedSectionId={activeSectionId} />;
  else if (normalized.frameworkId === "swot") view = <SwotView artifact={normalized} definition={definition} onSelect={select} selectedSectionId={activeSectionId} />;
  else if (normalized.frameworkId === "toc") {
    const argument = definition.sections.filter(section => section.id !== "constraint");
    view = (
      <SectionView
        artifact={normalized}
        definition={definition}
        onSelect={select}
        selectedSectionId={activeSectionId}
        sections={currentConstraintLine(normalized) ? argument : definition.sections}
      />
    );
  }
  else view = <SectionView artifact={normalized} definition={definition} onSelect={select} selectedSectionId={activeSectionId} />;

  return (
    <ExportDocument.Provider value={document}>
    <section className={`framework-artifact framework-artifact-${definition.view}${brief ? " is-brief" : ""}`} data-framework={normalized.frameworkId}>
      {!brief && (
        <header className="artifact-header">
          <div className="artifact-kicker">Structured framework · revision {normalized.revision}</div>
          <h2 className="artifact-title">{normalized.title || definition.name}</h2>
          {normalized.summary && (() => {
            const full = normalized.summary.trim();
            const sentences = full.match(/[^.!?]+[.!?]+["')\]]*\s*/g) || [full];
            const short = sentences.slice(0, 2).join("").trim();
            const truncated = short.length < full.length;
            return (
              <p className="artifact-summary">
                {summaryExpanded || !truncated ? full : short}
                {truncated && (
                  <button className="summary-toggle" onClick={() => setSummaryExpanded(value => !value)}>
                    {summaryExpanded ? "show less" : "full summary"}
                  </button>
                )}
              </p>
            );
          })()}
        </header>
      )}
      {!document && <HowToRead of={normalized.frameworkId} />}
      {!document && !validation.valid && (
        <div className="artifact-warning" role="status">
          Showing the safe normalized view. {validation.errors.length} contract {validation.errors.length === 1 ? "issue was" : "issues were"} detected.
        </div>
      )}
      {view}
      {!brief && <EvidenceList evidence={normalized.evidence} />}
      {!brief && (normalized.gaps.length > 0 || normalized.assumptions.length > 0 || normalized.nextQuestions.length > 0) && (
        <div className="artifact-notes panel mt">
          {normalized.gaps.length > 0 && <div><span className="artifact-note-title">Gaps</span><CompactItem item={normalized.gaps} /></div>}
          {normalized.assumptions.length > 0 && <div><span className="artifact-note-title">Assumptions</span><CompactItem item={normalized.assumptions} /></div>}
          {normalized.nextQuestions.length > 0 && <div><span className="artifact-note-title">Next questions</span><CompactItem item={normalized.nextQuestions} /></div>}
        </div>
      )}
    </section>
    </ExportDocument.Provider>
  );
}
