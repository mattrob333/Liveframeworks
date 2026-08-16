// First-run and pipeline helpers for the Business description & URL bucket.
// The persistence key stays `lf:bucket:biz`. The UI still collects URL +
// paragraph; format/parse also keep the extra fields the pack template has
// (products, team, unusual, plus optional install prompts) so a file upload
// is not stripped down to two lines. New labels are optional — old packs
// without them still parse.

import { FW } from "@/lib/frameworks";

const OPTIONAL_BIZ_FIELDS = [
  ["products", "Main products / services"],
  ["team", "Team size (rough)"],
  ["unusual", "Anything unusual worth knowing"],
  ["inboxes", "Named inboxes / channels"],
  ["systems", "Key systems (names and account IDs)"],
  ["vendors", "Key vendors"],
  ["productionFacts", "Production-rate / system facts"],
  ["priceSheet", "Standing price sheet location"],
];

// Each labeled value stops at the next known label or the end of the paste.
const FIELD_STOP = String.raw`(?:\n(?:Website URL|In their own words|Main products|Team size|Anything unusual|Named inboxes|Key systems|Key vendors|Production-rate|Standing price sheet)|$)`;

function labeledPattern(start) {
  return new RegExp(`${start}\\s*([\\s\\S]*?)${FIELD_STOP}`, "i");
}

const LABELED_URL = /Website URL:\s*(\S+)/i;
const LABELED_PARAGRAPH = labeledPattern("In their own words, what the business does:");
const LABELED_PRODUCTS = labeledPattern(String.raw`Main products\s*/\s*services:`);
const LABELED_TEAM = labeledPattern(String.raw`Team size\s*\(rough\):`);
const LABELED_UNUSUAL = labeledPattern("Anything unusual worth knowing:");
const LABELED_INBOXES = labeledPattern(String.raw`Named inboxes\s*/\s*channels:`);
const LABELED_SYSTEMS = labeledPattern(String.raw`Key systems\s*\(names and account IDs\):`);
const LABELED_VENDORS = labeledPattern("Key vendors:");
const LABELED_PRODUCTION = labeledPattern(String.raw`Production-rate\s*/\s*system facts:`);
const LABELED_PRICE_SHEET = labeledPattern("Standing price sheet location:");
const LOOSE_URL = /https?:\/\/[^\s]+/i;

const LABELED_OPTIONAL = {
  products: LABELED_PRODUCTS,
  team: LABELED_TEAM,
  unusual: LABELED_UNUSUAL,
  inboxes: LABELED_INBOXES,
  systems: LABELED_SYSTEMS,
  vendors: LABELED_VENDORS,
  productionFacts: LABELED_PRODUCTION,
  priceSheet: LABELED_PRICE_SHEET,
};

function optionalBizValues(fields = {}) {
  return Object.fromEntries(
    OPTIONAL_BIZ_FIELDS.map(([key]) => [key, String(fields[key] || "").trim()]),
  );
}

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

export function formatBizIntake({ url, paragraph, ...rest } = {}) {
  const normalized = normalizeCompanyUrl(url);
  const text = String(paragraph || "").trim();
  const extras = OPTIONAL_BIZ_FIELDS
    .map(([key, label]) => [label, String(rest[key] || "").trim()])
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
  if (!raw) return { url: "", paragraph: "", ...optionalBizValues() };

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
      .replace(LABELED_INBOXES, "")
      .replace(LABELED_SYSTEMS, "")
      .replace(LABELED_VENDORS, "")
      .replace(LABELED_PRODUCTION, "")
      .replace(LABELED_PRICE_SHEET, "")
      .trim();
  }

  return {
    url,
    paragraph,
    ...Object.fromEntries(
      OPTIONAL_BIZ_FIELDS.map(([key]) => [key, labeledField(raw, LABELED_OPTIONAL[key])]),
    ),
  };
}

export function validateBizIntake({ url, paragraph, ...rest } = {}) {
  const normalized = normalizeCompanyUrl(url);
  const text = String(paragraph || "").trim();
  const extras = optionalBizValues(rest);
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
  const keys = ["url", "paragraph", ...OPTIONAL_BIZ_FIELDS.map(([key]) => key)];
  return Object.fromEntries(keys.map(key => [key, overlay[key] || base[key] || ""]));
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
