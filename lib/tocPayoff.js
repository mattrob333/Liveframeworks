// ToC payoff: THE constraint is the hero; the org-install roster is beat two.
// Do not invent roles or a second next-move. Omit any line the signed
// org-install does not carry.

import { DEMO_PACKS } from "@/lib/demoPacks";
import { currentConstraintLine, normalizeFrameworkArtifact } from "@/lib/frameworkArtifacts";

const GLANCE_HEADING = /^## Org at a glance\s*$/m;
const ROLE_LINE = /\b([A-Z]{2,8})\s+([★·])\s+(\S+(?:\s+\S+)*?)\s{2,}(\S.*)$/;

export function tocConstraintHero(tocArtifact) {
  const text = currentConstraintLine(tocArtifact);
  if (!text) return null;
  const normalized = normalizeFrameworkArtifact(tocArtifact, "toc");
  if (normalized.frameworkId !== "toc") return null;
  const constraint = normalized.payload?.constraint || {};
  const refs = Array.isArray(constraint.evidenceRefs)
    ? constraint.evidenceRefs.map(ref => String(ref || "").trim()).filter(Boolean)
    : [];
  return {
    text,
    basis: String(constraint.basis || "").trim(),
    confidence: String(constraint.confidence || "").trim(),
    sourceCount: refs.length,
  };
}

function glanceBlock(markdown) {
  if (typeof markdown !== "string" || !markdown.trim()) return "";
  const heading = markdown.search(GLANCE_HEADING);
  if (heading < 0) return "";
  const after = markdown.slice(heading);
  const fence = after.match(/```[^\n]*\n([\s\S]*?)\n```/);
  return fence ? fence[1] : "";
}

function parseRoleLine(line) {
  const match = String(line || "").match(ROLE_LINE);
  if (!match) return null;
  const lineText = match[4].trim();
  if (!lineText) return null;
  const team = match[1];
  const mark = match[2];
  const role = match[3].trim();
  return {
    team,
    star: mark === "★",
    role,
    line: lineText,
    name: `${team} ${mark} ${role}`,
  };
}

export function orgInstallRoster(markdown) {
  const glance = glanceBlock(markdown);
  if (!glance) return { router: null, teams: [] };

  const seen = new Set();
  const roles = [];
  for (const raw of glance.split("\n")) {
    const role = parseRoleLine(raw);
    if (!role || seen.has(role.name)) continue;
    seen.add(role.name);
    roles.push(role);
  }

  const routerRole = roles.find(role => role.team === "EXE" && role.star);
  const router = routerRole ? { name: routerRole.name, line: routerRole.line } : null;

  const teams = [];
  const order = [];
  const byTeam = new Map();
  for (const role of roles) {
    if (role.team === "EXE") continue;
    if (!byTeam.has(role.team)) {
      byTeam.set(role.team, []);
      order.push(role.team);
    }
    byTeam.get(role.team).push(role);
  }

  for (const id of order) {
    const members = byTeam.get(id) || [];
    const lead = members.find(role => role.star);
    if (!lead) continue;
    teams.push({
      id,
      lead: { name: lead.name, role: lead.role, line: lead.line },
      line: lead.line,
      seats: members.filter(role => !role.star).map(role => ({
        name: role.name,
        role: role.role,
        line: role.line,
      })),
    });
  }

  return { router, teams };
}

// The page passes readSignedOrgInstalls() keyed by demo company.
// orgInstallForLoadedCompany picks the file for the loaded company
// (hostname or the biz bucket text). TocRoster mounts when that
// glance parse has teams. Empty teams means this company has no
// signed install — omit the roster. Do not fall back to another
// company's file.
export function orgInstallForLoadedCompany(installs, companyHint) {
  const hint = String(companyHint || "").trim().toLowerCase();
  if (!hint || !installs || typeof installs !== "object" || Array.isArray(installs)) return "";
  for (const pack of Object.values(DEMO_PACKS)) {
    if (!hint.includes(pack.company)) continue;
    const markdown = installs[pack.company];
    return typeof markdown === "string" ? markdown : "";
  }
  return "";
}

export function isSignedOrgInstallRoster(roster) {
  return Array.isArray(roster?.teams) && roster.teams.length > 0;
}

// The stale note between the ToC hero and the roster. Hide it only when
// that roster is the signed org-install. Other maps use a different slot.
export function showTocStaleBannerBetweenHeroAndRoster({ stale, hero, roster }) {
  return Boolean(stale && hero && !isSignedOrgInstallRoster(roster));
}
