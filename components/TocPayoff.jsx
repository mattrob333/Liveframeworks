// Constraint-first ToC chrome. Hero reads the signed ToC claim.
// Roster reads org-install glance fields only — no invented seats.

import React from "react";

function ProofChips({ hero }) {
  if (!hero) return null;
  const chips = [];
  if (hero.basis) chips.push({ key: "basis", className: `artifact-basis basis-${hero.basis}`, label: hero.basis });
  if (hero.confidence) {
    chips.push({
      key: "confidence",
      className: `artifact-confidence confidence-${hero.confidence}`,
      label: hero.confidence,
    });
  }
  if (hero.sourceCount > 0) {
    chips.push({
      key: "sources",
      className: "artifact-evidence-count",
      label: `${hero.sourceCount} ${hero.sourceCount === 1 ? "source" : "sources"}`,
    });
  }
  if (!chips.length) return null;
  return (
    <p className="toc-proof-chips" role="group" aria-label="Grounding metadata">
      {chips.map(chip => (
        <span key={chip.key} className={chip.className}>{chip.label}</span>
      ))}
    </p>
  );
}

export function TocConstraintHero({ hero }) {
  if (!hero?.text) return null;
  return (
    <header className="framework-header toc-payoff-header">
      <p className="framework-map-label">THE constraint</p>
      <h1 className="toc-constraint-lockup">{hero.text}</h1>
      <ProofChips hero={hero} />
    </header>
  );
}

export function TocRoster({ roster }) {
  if (!roster?.teams?.length) return null;
  return (
    <section className="toc-roster" aria-label="Agent team">
      {roster.router && (
        <p className="toc-roster-router">
          <b>{roster.router.name}</b>
          <span>{roster.router.line}</span>
        </p>
      )}
      <div className="toc-roster-teams">
        {roster.teams.map(team => (
          <article key={team.id} className="toc-roster-team">
            <h2>{team.lead.name}</h2>
            <p className="toc-roster-team-line">{team.line}</p>
            {team.seats.map(seat => (
              <div key={seat.name} className="toc-roster-seat">
                <b>{seat.name}</b>
                <span>{seat.line}</span>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
