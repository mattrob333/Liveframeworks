// Reads the fictional intake files from demo-data/. Server-only: the browser
// cannot see the filesystem. Callers still write with setBucket.

import { readFileSync } from "node:fs";
import path from "node:path";
import { INTAKE } from "@/lib/frameworks";
import { DEMO_PACKS, resolveDemoPack } from "@/lib/demoPacks";

const cache = new Map();

function readPackFile(directory, filename) {
  // String path: Next's bundled fs rejects URL objects.
  return readFileSync(path.join(process.cwd(), "demo-data", directory, filename), "utf8");
}

export function readDemoPack(packId) {
  const pack = DEMO_PACKS[packId];
  if (!pack) return null;
  if (cache.has(packId)) return cache.get(packId);
  const buckets = Object.fromEntries(
    INTAKE.map(source => [source.key, readPackFile(pack.directory, pack.files[source.key])]),
  );
  cache.set(packId, buckets);
  return buckets;
}

export function loadDemoBucketsForSlug(slug) {
  const resolved = resolveDemoPack(slug);
  if (resolved.kind !== "pack") return null;
  return readDemoPack(resolved.id);
}
