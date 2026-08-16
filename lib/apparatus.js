// Colorless provenance line. Words come from the live grounding contract
// (basis / confidence / evidence kind). Do not invent new levels here.

export const BASIS = ["known", "inferred", "assumed", "missing"];
export const CONFIDENCE = ["high", "medium", "low"];
export const EVIDENCE_KIND = ["intake", "upstream", "chat", "web"];

// Existing confidence words only. medium is the long one → first three letters.
// high and low already fit in four, so they stay whole. Unknown words are omitted.
const CONFIDENCE_LABEL = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
};

function normalizeWord(value) {
  return String(value || "").trim().toLowerCase();
}

export function formatBasis(basis) {
  const word = normalizeWord(basis);
  if (word === "known") return { type: "caps", text: "KNOWN" };
  if (word === "inferred" || word === "assumed") return { type: "hedge", text: word };
  return null;
}

export function formatConfidence(confidence) {
  const word = normalizeWord(confidence);
  const text = CONFIDENCE_LABEL[word];
  return text ? { type: "caps", text } : null;
}

export function formatSourceCount(sourceCount) {
  let count = null;
  if (typeof sourceCount === "number" && Number.isFinite(sourceCount)) {
    count = Math.floor(sourceCount);
  } else if (Array.isArray(sourceCount)) {
    count = sourceCount.length;
  }
  if (count == null || count <= 0) return null;
  return {
    type: "caps",
    text: count === 1 ? "1 SOURCE" : `${count} SOURCES`,
  };
}

export function formatKind(kind) {
  const word = normalizeWord(kind);
  if (!EVIDENCE_KIND.includes(word)) return null;
  return { type: "caps", text: word.toUpperCase() };
}

// Segment order matches the visual contract: KNOWN · HIGH · 2 SOURCES.
// kind is optional (evidence-list chips). missing basis and uncomputable
// counts are omitted — never faked.
export function apparatusSegments({ basis, confidence, sourceCount, kind } = {}) {
  return [
    formatBasis(basis),
    formatConfidence(confidence),
    formatSourceCount(sourceCount),
    formatKind(kind),
  ].filter(Boolean);
}

export function apparatusPropsFromGrounding(value) {
  if (!value || typeof value !== "object") return null;
  return {
    basis: value.basis,
    confidence: value.confidence,
    sourceCount: Array.isArray(value.evidenceRefs) ? value.evidenceRefs : null,
  };
}
