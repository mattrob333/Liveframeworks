// First-run and pipeline helpers for the Business description & URL bucket.
// The persistence key stays `lf:bucket:biz`. The UI still collects URL +
// paragraph; format/parse also keep the extra fields the pack template has
// (products, team, unusual) so a file upload is not stripped down to two lines.

import { FW } from "@/lib/frameworks";

const LABELED_URL = /Website URL:\s*(\S+)/i;
const LABELED_PARAGRAPH = /In their own words, what the business does:\s*([\s\S]*?)(?:\nMain products|\nTeam size|\nAnything unusual|$)/i;
const LABELED_PRODUCTS = /Main products\s*\/\s*services:\s*([\s\S]*?)(?:\nTeam size|\nAnything unusual|$)/i;
const LABELED_TEAM = /Team size\s*\(rough\):\s*([\s\S]*?)(?:\nMain products|\nAnything unusual|$)/i;
const LABELED_UNUSUAL = /Anything unusual worth knowing:\s*([\s\S]*?)$/i;
const LOOSE_URL = /https?:\/\/[^\s]+/i;

function labeledField(raw, pattern) {
  const match = raw.match(pattern);
  return match ? match[1].trim() : "";
}

export function companyHostname(url) {
  const normalized = normalizeCompanyUrl(url);
  if (!normalized) return "";
  try {
    return new URL(normalized).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

export function normalizeCompanyUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    if (!parsed.hostname || !parsed.hostname.includes(".")) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function formatBizIntake({ url, paragraph, products, team, unusual } = {}) {
  const normalized = normalizeCompanyUrl(url);
  const text = String(paragraph || "").trim();
  const extras = [
    ["Main products / services", products],
    ["Team size (rough)", team],
    ["Anything unusual worth knowing", unusual],
  ]
    .map(([label, value]) => [label, String(value || "").trim()])
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);
  return [
    "BUSINESS DESCRIPTION",
    "",
    `Website URL: ${normalized || String(url || "").trim()}`,
    `In their own words, what the business does: ${text}`,
    ...extras,
  ].join("\n");
}

export function parseBizIntake(text) {
  const raw = String(text || "").trim();
  if (!raw) return { url: "", paragraph: "", products: "", team: "", unusual: "" };

  const labeledUrl = raw.match(LABELED_URL);
  let url = normalizeCompanyUrl(labeledUrl?.[1] || "");
  if (!url) {
    const loose = raw.match(LOOSE_URL);
    url = normalizeCompanyUrl(loose?.[0] || "");
  }

  let paragraph = "";
  const labeledPara = raw.match(LABELED_PARAGRAPH);
  if (labeledPara) {
    paragraph = labeledPara[1].trim();
  } else {
    paragraph = raw
      .replace(LABELED_URL, "")
      .replace(LOOSE_URL, "")
      .replace(/^BUSINESS DESCRIPTION\s*/i, "")
      .replace(LABELED_PRODUCTS, "")
      .replace(LABELED_TEAM, "")
      .replace(LABELED_UNUSUAL, "")
      .trim();
  }

  return {
    url,
    paragraph,
    products: labeledField(raw, LABELED_PRODUCTS),
    team: labeledField(raw, LABELED_TEAM),
    unusual: labeledField(raw, LABELED_UNUSUAL),
  };
}

export function validateBizIntake({ url, paragraph, products, team, unusual } = {}) {
  const normalized = normalizeCompanyUrl(url);
  const text = String(paragraph || "").trim();
  const extras = {
    products: String(products || "").trim(),
    team: String(team || "").trim(),
    unusual: String(unusual || "").trim(),
  };
  if (!normalized && !text) {
    return { ok: false, error: "Add a company URL and a short description before saving." };
  }
  if (!normalized) {
    return { ok: false, error: "Add a valid company URL (for example https://example.com) before saving." };
  }
  if (!text) {
    return { ok: false, error: "Add a one-paragraph description in the company's own words before saving." };
  }
  return { ok: true, url: normalized, paragraph: text, ...extras };
}

export function isBizIntakeReady(text) {
  return validateBizIntake(parseBizIntake(text)).ok;
}

export function validateBucketSave(bucketKey, text) {
  if (bucketKey === "biz") return validateBizIntake(parseBizIntake(text));
  if (!String(text || "").trim()) {
    return { ok: false, error: "Add evidence before saving. An empty bucket was not saved." };
  }
  return { ok: true };
}

export function resolvePipelineSelect(slug) {
  if (!slug) return { kind: "none" };
  if (FW[slug]) return { kind: "framework", id: slug };
  return { kind: "unknown", slug };
}

function mergeBizFields(base = {}, overlay = {}) {
  return {
    url: overlay.url || base.url || "",
    paragraph: overlay.paragraph || base.paragraph || "",
    products: overlay.products || base.products || "",
    team: overlay.team || base.team || "",
    unusual: overlay.unusual || base.unusual || "",
  };
}

// Turns chosen files into bucket text and writes through setBucket, same
// writer as demo load. Biz files are parsed so a pack upload does not need
// a prior paste and does not drop products / team / unusual.
export function applyUploadedFiles(bucketKey, files, { getBucket, setBucket, current } = {}) {
  if (typeof getBucket !== "function" || typeof setBucket !== "function") {
    return { ok: false, error: "missing-writer" };
  }
  if (!Array.isArray(files) || files.length === 0) {
    return { ok: false, error: "Add evidence before saving. An empty bucket was not saved." };
  }

  const previous = getBucket(bucketKey);

  if (bucketKey === "biz") {
    const fromFiles = parseBizIntake(files.map(file => String(file?.text || "")).join("\n\n"));
    const fromCurrent = current && typeof current === "object" ? current : parseBizIntake(previous);
    const validation = validateBizIntake(mergeBizFields(fromCurrent, fromFiles));
    if (!validation.ok) return validation;
    const value = formatBizIntake(validation);
    const result = setBucket(bucketKey, value);
    if (result?.ok === false) return { ok: false, error: result.error };
    return { ok: true, value, fields: validation, previous };
  }

  let value = String(current?.text ?? previous ?? "");
  for (const file of files) {
    const text = String(file?.text || "");
    value += (value.trim() ? "\n\n" : "") + `=== FILE: ${file?.name || "upload"} ===\n${text}`;
  }
  const validation = validateBucketSave(bucketKey, value);
  if (!validation.ok) return validation;
  const result = setBucket(bucketKey, value);
  if (result?.ok === false) return { ok: false, error: result.error };
  return { ok: true, value, previous };
}
