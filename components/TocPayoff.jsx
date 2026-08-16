// Constraint-first ToC chrome. Hero reads the signed ToC claim.
// Roster reads org-install glance fields only — no invented seats.

import React from "react";
import HowToRead from "@/components/HowToRead";
import Apparatus from "@/components/Apparatus";
import { apparatusSegments } from "@/lib/apparatus";

function ProofLine({ hero }) {
  if (!hero) return null;
  const parts = apparatusSegments({
    basis: hero.basis,
    confidence: hero.confidence,
    sourceCount: hero.sourceCount,
  });
  if (!parts.length) return null;
  return (
    <p className="toc-proof-chips" role="group" aria-label="Grounding metadata">
      <Apparatus
        basis={hero.basis}
        confidence={hero.confidence}
        sourceCount={hero.sourceCount}
      />
    </p>
  );
}

export function TocConstraintHero({ hero }) {
  if (!hero?.text) return null;
  return (
    <header className="framework-header toc-payoff-header">
      <p className="framework-map-label">THE constraint</p>
      <h1 className="toc-constraint-lockup">{hero.text}</h1>
      <ProofLine hero={hero} />
    </header>
  );
}

export function TocRoster({ roster }) {
  if (!roster?.teams?.length) return null;
  return (
    <section className="toc-roster" aria-label="Agent team">
      <HowToRead of="tocRoster" />
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
