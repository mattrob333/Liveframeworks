// Server-only: the signed org-install is a file, not a store key.
// The ToC canvas renders it. Do not invent a second roster.

import { readFileSync } from "node:fs";
import path from "node:path";

const SIGNED_ORG_INSTALL = path.join(
  process.cwd(),
  "demo-data",
  "coffee",
  "driftline-org-install.md",
);

export function readSignedOrgInstall() {
  try {
    return readFileSync(SIGNED_ORG_INSTALL, "utf8");
  } catch {
    return "";
  }
}
