import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createFrameworkArtifact } from "../lib/frameworkArtifacts.js";
import { companyHostname, parseBizIntake } from "../lib/intake.js";
import { isSignedOrgInstallRoster, orgInstallForLoadedCompany, orgInstallRoster, showTocStaleBannerBetweenHeroAndRoster, tocConstraintHero } from "../lib/tocPayoff.js";
import { readSignedOrgInstall, readSignedOrgInstalls } from "../lib/server/orgInstall.js";
import { TocConstraintHero, TocRoster } from "../components/TocPayoff.jsx";
import FrameworkArtifact from "../components/FrameworkArtifact.jsx";

const SIGNED_ORG_INSTALL = readFileSync("demo-data/coffee/driftline-org-install.md", "utf8");
const DRIFTLINE_BIZ = readFileSync("demo-data/coffee/driftline-biz.md", "utf8");
const IRONWOOD_BIZ = readFileSync("demo-data/garage-doors/ironwood-biz.md", "utf8");
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
  assert.match(html, /toc-proof-chips/);
  assert.match(html, /KNOWN/);
  assert.match(html, /HIGH/);
  assert.match(html, /2 SOURCES/);
  assert.doesNotMatch(html, /artifact-basis/);
  assert.doesNotMatch(html, /2 sources/);
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
  assert.match(WORKSPACE, /orgInstallForLoadedCompany\(orgInstalls, `\$\{hostname\}\\n\$\{getBucket\("biz"\)\}`\)/);
  assert.match(WORKSPACE, /orgInstallRoster\(/);
  assert.match(WORKSPACE, /<TocConstraintHero hero=\{tocHero\} \/>/);
  assert.match(WORKSPACE, /<TocRoster roster=\{tocRoster\} \/>/);
  assert.match(WORKSPACE, /<h1>\{pageTitle\}<\/h1>\s*\{constraintLine && <p className="framework-constraint">\{constraintLine\}<\/p>\}/);
  assert.match(ARTIFACT, /section\.id !== "constraint"/);
  assert.match(PAGE, /readSignedOrgInstalls/);
  assert.match(PAGE, /id === "toc"/);
});

test("signed org-install roster on ToC hides the stale banner between hero and roster", () => {
  const hero = tocConstraintHero(tocWithConstraint("Maya is the sole wholesale approver."));
  const roster = orgInstallRoster(SIGNED_ORG_INSTALL);
  assert.equal(isSignedOrgInstallRoster(roster), true);
  assert.equal(showTocStaleBannerBetweenHeroAndRoster({ stale: true, hero, roster }), false);
  assert.equal(showTocStaleBannerBetweenHeroAndRoster({ stale: false, hero, roster }), false);
  assert.match(WORKSPACE, /showTocStaleBannerBetweenHeroAndRoster\(\{ stale, hero: tocHero, roster: tocRoster \}\)/);
  assert.match(WORKSPACE, /<TocConstraintHero hero=\{tocHero\} \/>/);
  assert.match(WORKSPACE, /<TocRoster roster=\{tocRoster\} \/>/);
});

test("other maps and an unsigned ToC roster keep today's stale banner", () => {
  const hero = tocConstraintHero(tocWithConstraint("Maya is the sole wholesale approver."));
  const emptyRoster = orgInstallRoster("");
  const noGlance = orgInstallRoster("## Org at a glance\n\nNo fence.");

  assert.equal(isSignedOrgInstallRoster(emptyRoster), false);
  assert.equal(isSignedOrgInstallRoster(noGlance), false);
  assert.equal(isSignedOrgInstallRoster({ router: null, teams: [] }), false);
  assert.equal(showTocStaleBannerBetweenHeroAndRoster({ stale: true, hero, roster: emptyRoster }), true);
  assert.equal(showTocStaleBannerBetweenHeroAndRoster({ stale: true, hero, roster: noGlance }), true);
  assert.equal(showTocStaleBannerBetweenHeroAndRoster({ stale: true, hero: null, roster: orgInstallRoster(SIGNED_ORG_INSTALL) }), false);

  // Other maps still use the header stale note, not the ToC hero/roster slot.
  assert.match(
    WORKSPACE,
    /<h1>\{pageTitle\}<\/h1>[\s\S]*?\{stale && <p className="framework-state-note">This map is stale\. Review it, or regenerate from the pipeline\.<\/p>\}/,
  );
  assert.match(WORKSPACE, /showTocStaleBannerBetweenHeroAndRoster\(\{ stale, hero: tocHero, roster: tocRoster \}\)/);
  assert.match(WORKSPACE, /orgInstallForLoadedCompany\(/);
});

test("Ironwood and other non-Driftline companies do not receive the Driftline roster", () => {
  const installs = readSignedOrgInstalls();
  assert.deepEqual(Object.keys(installs), ["driftline"]);
  assert.equal(installs.driftline, SIGNED_ORG_INSTALL);
  assert.equal(readSignedOrgInstall("driftline"), SIGNED_ORG_INSTALL);
  assert.equal(readSignedOrgInstall("ironwood"), "");
  assert.equal(readSignedOrgInstall("quartermast"), "");
  assert.equal(readSignedOrgInstall(), "");
  assert.equal(existsSync("demo-data/garage-doors/ironwood-org-install.md"), false);

  const driftlineHost = companyHostname(parseBizIntake(DRIFTLINE_BIZ).url);
  const ironwoodHost = companyHostname(parseBizIntake(IRONWOOD_BIZ).url);
  assert.equal(driftlineHost, "driftline.example");
  assert.equal(ironwoodHost, "ironwooddoor.example");

  // Same hint the workspace passes: hostname plus the loaded biz bucket.
  const driftlineMarkdown = orgInstallForLoadedCompany(installs, `${driftlineHost}\n${DRIFTLINE_BIZ}`);
  const ironwoodMarkdown = orgInstallForLoadedCompany(installs, `${ironwoodHost}\n${IRONWOOD_BIZ}`);
  const quartermastMarkdown = orgInstallForLoadedCompany(installs, "quartermast.example");
  assert.equal(driftlineMarkdown, SIGNED_ORG_INSTALL);
  assert.equal(ironwoodMarkdown, "");
  assert.equal(quartermastMarkdown, "");
  assert.equal(orgInstallForLoadedCompany(installs, ironwoodHost), "");
  assert.equal(orgInstallForLoadedCompany(installs, IRONWOOD_BIZ), "");
  assert.equal(orgInstallForLoadedCompany(installs, ""), "");
  assert.equal(orgInstallForLoadedCompany({}, "driftline.example"), "");
  assert.equal(orgInstallForLoadedCompany(SIGNED_ORG_INSTALL, ironwoodHost), "");

  const driftlineRoster = orgInstallRoster(driftlineMarkdown);
  const ironwoodRoster = orgInstallRoster(ironwoodMarkdown);
  assert.equal(isSignedOrgInstallRoster(driftlineRoster), true);
  assert.equal(driftlineRoster.router.name, "EXE ★ Chief of Staff");
  assert.equal(isSignedOrgInstallRoster(ironwoodRoster), false);
  assert.deepEqual(ironwoodRoster, { router: null, teams: [] });

  const driftlineHtml = renderToStaticMarkup(React.createElement(TocRoster, { roster: driftlineRoster }));
  const ironwoodHtml = renderToStaticMarkup(React.createElement(TocRoster, { roster: ironwoodRoster }));
  const leaked = [
    "EXE ★ Chief of Staff",
    "WS ★ Desk Lead",
    "Ledger &amp; Bean",
    "Shopify shipping",
    "Q4 packaging",
    "410 subscribers",
    "subscriber support",
  ];
  for (const text of leaked) {
    assert.equal(driftlineHtml.includes(text), true, `Driftline ToC missing signed copy: ${text}`);
    assert.equal(ironwoodHtml.includes(text), false, `Ironwood ToC leaked Driftline copy: ${text}`);
  }
  assert.equal(ironwoodHtml, "");

  const hero = tocConstraintHero(tocWithConstraint(
    "no after-hours/weekend coverage – is THE constraint: it gates volume into repair and install simultaneously and is already causing lost and near-lost deals.",
  ));
  assert.equal(showTocStaleBannerBetweenHeroAndRoster({ stale: true, hero, roster: ironwoodRoster }), true);
  assert.equal(showTocStaleBannerBetweenHeroAndRoster({ stale: true, hero, roster: driftlineRoster }), false);
});
