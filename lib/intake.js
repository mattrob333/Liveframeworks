// First-run and pipeline helpers for the Business description & URL bucket.
// The persistence key stays `lf:bucket:biz`; this module only formats and
// validates the URL + paragraph the UI collects.

import { FW } from "@/lib/frameworks";

const LABELED_URL = /Website URL:\s*(\S+)/i;
const LABELED_PARAGRAPH = /In their own words, what the business does:\s*([\s\S]*?)(?:\nMain products|\nTeam size|\nAnything unusual|$)/i;
const LOOSE_URL = /https?:\/\/[^\s]+/i;

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

export function formatBizIntake({ url, paragraph } = {}) {
  const normalized = normalizeCompanyUrl(url);
  const text = String(paragraph || "").trim();
  return [
    "BUSINESS DESCRIPTION",
    "",
    `Website URL: ${normalized || String(url || "").trim()}`,
    `In their own words, what the business does: ${text}`,
  ].join("\n");
}

export function parseBizIntake(text) {
  const raw = String(text || "").trim();
  if (!raw) return { url: "", paragraph: "" };

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
      .trim();
  }

  return { url, paragraph };
}

export function validateBizIntake({ url, paragraph } = {}) {
  const normalized = normalizeCompanyUrl(url);
  const text = String(paragraph || "").trim();
  if (!normalized && !text) {
    return { ok: false, error: "Add a company URL and a short description before saving." };
  }
  if (!normalized) {
    return { ok: false, error: "Add a valid company URL (for example https://example.com) before saving." };
  }
  if (!text) {
    return { ok: false, error: "Add a one-paragraph description in the company's own words before saving." };
  }
  return { ok: true, url: normalized, paragraph: text };
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
