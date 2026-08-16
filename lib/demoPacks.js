// Demo packs are the three fictional companies in demo-data/.
// This module only names them and maps slugs → folders → intake files.
// Writing still goes through setBucket (`lf:bucket:*`).

import { INTAKE } from "@/lib/frameworks";
import { validateBucketSave } from "@/lib/intake";

// File suffix after `{company}-` for each intake key. Matches demo-data/README.md.
const BUCKET_FILE = {
  biz: "biz.md",
  leadership: "leadership-interviews.md",
  calls: "calls.md",
  org: "org.md",
};

function filesFor(company) {
  return Object.fromEntries(
    INTAKE.map(source => [source.key, `${company}-${BUCKET_FILE[source.key]}`]),
  );
}

// Canonical ids are the demo-data/ folder names. PRODUCT's example slug is
// `driftline`; folder names (coffee, garage-doors, saas) are aliases.
export const DEMO_PACKS = {
  coffee: {
    id: "coffee",
    company: "driftline",
    name: "Driftline Coffee Roasters",
    directory: "coffee",
    slugs: ["driftline", "coffee"],
    files: filesFor("driftline"),
  },
  "garage-doors": {
    id: "garage-doors",
    company: "ironwood",
    name: "Ironwood Door Co.",
    directory: "garage-doors",
    slugs: ["ironwood", "garage-doors"],
    files: filesFor("ironwood"),
  },
  saas: {
    id: "saas",
    company: "quartermast",
    name: "Quartermast",
    directory: "saas",
    slugs: ["quartermast", "saas"],
    files: filesFor("quartermast"),
  },
};

const SLUG_TO_ID = new Map(
  Object.values(DEMO_PACKS).flatMap(pack => pack.slugs.map(slug => [slug, pack.id])),
);

export function resolveDemoPack(slug) {
  const raw = Array.isArray(slug) ? slug[0] : slug;
  const trimmed = String(raw || "").trim();
  if (!trimmed) return { kind: "none" };
  const id = SLUG_TO_ID.get(trimmed.toLowerCase());
  if (!id) return { kind: "unknown", slug: trimmed };
  return { kind: "pack", id, pack: DEMO_PACKS[id] };
}

// Writes all four intake keys through the caller's setBucket. Validates first
// so a bad pack cannot leave a half-written store. Does not invent a new key.
export function applyDemoBuckets(buckets, { getBucket, setBucket } = {}) {
  if (!buckets) return { ok: false, reason: "none" };
  if (typeof getBucket !== "function" || typeof setBucket !== "function") {
    return { ok: false, reason: "missing-writer" };
  }

  for (const source of INTAKE) {
    const text = buckets[source.key];
    if (typeof text !== "string") return { ok: false, reason: "incomplete", key: source.key };
    const validation = validateBucketSave(source.key, text);
    if (!validation.ok) return { ok: false, reason: "invalid", key: source.key, error: validation.error };
  }

  const writes = INTAKE.map(source => {
    const next = buckets[source.key];
    const previous = getBucket(source.key);
    const result = setBucket(source.key, next);
    return { key: source.key, previous, next, ok: result?.ok !== false, error: result?.error };
  });

  return { ok: writes.every(write => write.ok), writes };
}
