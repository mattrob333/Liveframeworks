// Server-only: signed org-installs are files, not a store key.
// One file per demo company: demo-data/{dir}/{company}-org-install.md.
// Missing file means that company has no signed roster. Do not invent one.

import { readFileSync } from "node:fs";
import path from "node:path";
import { DEMO_PACKS } from "@/lib/demoPacks";

function signedInstallPath(pack) {
  return path.join(process.cwd(), "demo-data", pack.directory, `${pack.company}-org-install.md`);
}

export function readSignedOrgInstall(company) {
  const key = String(company || "").trim().toLowerCase();
  const pack = Object.values(DEMO_PACKS).find(item => item.company === key);
  if (!pack) return "";
  try {
    return readFileSync(signedInstallPath(pack), "utf8");
  } catch {
    return "";
  }
}

export function readSignedOrgInstalls() {
  return Object.fromEntries(
    Object.values(DEMO_PACKS)
      .map(pack => [pack.company, readSignedOrgInstall(pack.company)])
      .filter(([, markdown]) => markdown),
  );
}
