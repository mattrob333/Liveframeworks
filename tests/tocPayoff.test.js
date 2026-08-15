import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createFrameworkArtifact } from "../lib/frameworkArtifacts.js";
import { orgInstallRoster, tocConstraintHero } from "../lib/tocPayoff.js";
import { TocConstraintHero, TocRoster } from "../components/TocPayoff.jsx";
import FrameworkArtifact from "../components/FrameworkArtifact.jsx";

const SIGNED_ORG_INSTALL = readFileSync("demo-data/coffee/driftline-org-install.md", "utf8");
const WORKSPACE = readFileSync("components/FrameworkWorkspace.jsx", "utf8");
const ARTIFACT = readFileSync("components/FrameworkArtifact.jsx", "utf8");
const PAGE = readFileSync("app/framework/[id]/page.jsx", "utf8");

const INVENTED = [
  "MKT",
  "ROAST",
  "FIN",
  "Hunter",
  "waitlist converter",
  "The Conductor",
  "new-business",
];

function tocWithConstraint(text, extras = {}) {
  return createFrameworkArtifact("toc", {
    payload: {
      constraint: {
        text,
        type: "policy",
        location: "Founder desk",
        throughputMetric: "quotes per week",
        basis: "known",
        confidence: "high",
        evidenceRefs: ["E1", "E2"],
        ...extras,
      },
    },
  });
}

test("hero is present when ToC + constraint exist, and reads constraint.text plus proof chips", () => {
  const hero = tocConstraintHero(tocWithConstraint(
    "All wholesale approval is restricted to Maya, who is simultaneously producing.",
  ));
  assert.equal(hero.text, "All wholesale approval is restricted to Maya, who is simultaneously producing.");
  assert.equal(hero.basis, "known");
  assert.equal(hero.confidence, "high");
  assert.equal(hero.sourceCount, 2);

  const html = renderToStaticMarkup(React.createElement(TocConstraintHero, { hero }));
  assert.match(html, /toc-constraint-lockup/);
  assert.match(html, /All wholesale approval is restricted to Maya/);
  assert.match(html, /known/);
  assert.match(html, /high/);
  assert.match(html, /2 sources/);
});

test("hero is absent without a ToC constraint", () => {
  assert.equal(tocConstraintHero(null), null);
  assert.equal(tocConstraintHero(createFrameworkArtifact("toc")), null);
  assert.equal(tocConstraintHero(createFrameworkArtifact("bmc")), null);
  assert.equal(tocConstraintHero(tocWithConstraint("   ")), null);
  assert.equal(renderToStaticMarkup(React.createElement(TocConstraintHero, { hero: null })), "");
});

test("roster reads org-install glance fields only and does not invent roles", () => {
  const roster = orgInstallRoster(SIGNED_ORG_INSTALL);
  assert.equal(roster.router.name, "EXE ★ Chief of Staff");
  assert.equal(roster.router.line, "front door. Routes to department ★s only. No EXE workers.");
  assert.deepEqual(roster.teams.map(team => team.id), ["WS", "OPS", "SUB"]);
  assert.deepEqual(roster.teams.map(team => team.lead.name), [
    "WS ★ Desk Lead",
    "OPS ★ Floor Boss",
    "SUB ★ Channel Lead",
  ]);
  assert.deepEqual(roster.teams[0].seats.map(seat => seat.name), [
    "WS · Quote Clerk",
    "WS · Reorder Desk",
    "WS · Account Watch",
  ]);
  assert.deepEqual(roster.teams[1].seats.map(seat => seat.name), [
    "OPS · Pack Planner",
    "OPS · Ship Watch",
    "OPS · Case Inventory",
  ]);
  assert.deepEqual(roster.teams[2].seats.map(seat => seat.name), [
    "SUB · Inbox",
    "SUB · Cycle Watch",
  ]);

  const rendered = [
    roster.router.name,
    roster.router.line,
    ...roster.teams.flatMap(team => [team.lead.name, team.line, ...team.seats.flatMap(seat => [seat.name, seat.line])]),
  ];
  for (const value of rendered) {
    assert.ok(SIGNED_ORG_INSTALL.includes(value), `invented roster copy: ${value}`);
  }
  const names = rendered.join("\n");
  for (const banned of INVENTED) {
    assert.equal(names.includes(banned), false, `invented role leaked: ${banned}`);
  }

  const html = renderToStaticMarkup(React.createElement(TocRoster, { roster }));
  assert.match(html, /EXE ★ Chief of Staff/);
  assert.match(html, /WS ★ Desk Lead/);
  assert.match(html, /THE constraint/);
  assert.match(html, /constraint-in-waiting/);
  assert.match(html, /protect the healthy line/);
  assert.doesNotMatch(html, /MKT/);
  assert.doesNotMatch(html, /Hunter/);
  assert.doesNotMatch(html, /The Conductor/);
});

test("a missing org-install glance line is omitted, not invented", () => {
  const partial = [
    "## Org at a glance",
    "",
    "```",
    " └── EXE ★ Chief of Staff          front door. Routes to department ★s only. No EXE workers.",
    "      ├── WS ★ Desk Lead           THE constraint. Assigns. Never quotes. Never texts an account.",
    "      │    ├── WS · Quote Clerk    standing price sheet → standard sample-to-quote draft",
    "```",
    "",
    "### OPS ★ Floor Boss",
    "### SUB · Inbox",
    "### MKT ★ Brand Lead",
  ].join("\n");

  const roster = orgInstallRoster(partial);
  assert.equal(roster.router.name, "EXE ★ Chief of Staff");
  assert.deepEqual(roster.teams.map(team => team.id), ["WS"]);
  assert.deepEqual(roster.teams[0].seats.map(seat => seat.name), ["WS · Quote Clerk"]);
  assert.equal(roster.teams.some(team => team.id === "OPS" || team.id === "SUB"), false);
  assert.equal(JSON.stringify(roster).includes("Floor Boss"), false);
  assert.equal(JSON.stringify(roster).includes("Inbox"), false);
  assert.equal(JSON.stringify(roster).includes("MKT"), false);
  assert.deepEqual(orgInstallRoster(""), { router: null, teams: [] });
  assert.deepEqual(orgInstallRoster("## Org at a glance\n\nNo fence."), { router: null, teams: [] });
});

test("ToC argument stays reachable after the constraint is the hero", () => {
  const claim = text => ({ text, basis: "known", confidence: "high", evidenceRefs: ["E1"] });
  const artifact = createFrameworkArtifact("toc", {
    payload: {
      constraint: {
        text: "Maya is the sole wholesale approver.",
        type: "policy",
        location: "Founder desk",
        throughputMetric: "quotes per week",
        basis: "known",
        confidence: "high",
        evidenceRefs: ["E1"],
      },
      focusingSteps: {
        identify: claim("Identify the founder-routing policy."),
        exploit: [claim("Pause new wholesale intake.")],
        subordinate: [claim("Protect the subscription line.")],
        elevate: [claim("Name a wholesale owner.")],
        repeat: [],
      },
      interventions: [],
    },
  });

  const html = renderToStaticMarkup(
    React.createElement(FrameworkArtifact, { artifact, frameworkId: "toc", brief: true, onSelect: () => {} }),
  );
  assert.match(html, /Open 1\. Identify/);
  assert.match(html, /Open 2\. Exploit/);
  assert.match(html, /Open 3\. Subordinate/);
  assert.match(html, /Open 4\. Elevate/);
  assert.match(html, /Identify the founder-routing policy/);
  assert.match(html, /Pause new wholesale intake/);
  assert.doesNotMatch(html, /Open The Constraint/);
});

test("workspace wires hero then roster then the existing ToC argument", () => {
  assert.match(WORKSPACE, /tocConstraintHero\(/);
  assert.match(WORKSPACE, /orgInstallRoster\(/);
  assert.match(WORKSPACE, /<TocConstraintHero hero=\{tocHero\} \/>/);
  assert.match(WORKSPACE, /<TocRoster roster=\{tocRoster\} \/>/);
  assert.match(WORKSPACE, /<h1>\{pageTitle\}<\/h1>\s*\{constraintLine && <p className="framework-constraint">\{constraintLine\}<\/p>\}/);
  assert.match(ARTIFACT, /section\.id !== "constraint"/);
  assert.match(PAGE, /readSignedOrgInstall/);
  assert.match(PAGE, /id === "toc"/);
});
