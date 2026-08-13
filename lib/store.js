// Browser-local persistence for engagement evidence, versioned framework runs,
// structured artifacts, and follow-up chat. The user's API key never leaves
// the browser except on the explicit provider request.
"use client";

import { trimChatLog } from "@/lib/chatProtocol";

const PREFIX = "lf:";
const safe = (fn, fallback) => {
  try { return fn(); } catch { return fallback; }
};

const readJSON = (key, fallback) => safe(() => {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}, fallback);

const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("lf:storage", { detail: { key } }));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || "Browser storage is unavailable." };
  }
};

const writeJSON = (key, value) => write(key, JSON.stringify(value));

export const getKey = () => safe(() => localStorage.getItem(PREFIX + "apikey") || "", "");
export const hasApiKey = () => Boolean(String(getKey() || "").trim());
export const setKey = (value) => write(PREFIX + "apikey", value || "");

export const getBucket = (key) => safe(() => localStorage.getItem(PREFIX + "bucket:" + key) || "", "");
export const setBucket = (key, value) => write(PREFIX + "bucket:" + key, value || "");

// Legacy plain-text output access remains for migration and export compatibility.
export const getOutput = (key) => safe(() => localStorage.getItem(PREFIX + "output:" + key) || "", "");
export const setOutput = (key, value) => write(PREFIX + "output:" + key, value || "");

export const getArtifact = (key) => {
  const artifact = readJSON(PREFIX + "artifact:" + key, null);
  if (artifact && typeof artifact === "object") return artifact;

  const legacyText = getOutput(key).trim();
  if (!legacyText) return null;
  return {
    schemaVersion: 0,
    frameworkId: key,
    revision: 0,
    status: "legacy",
    title: "Legacy first-pass output",
    summary: legacyText,
    payload: { legacyText },
    evidence: [],
    assumptions: [],
    gaps: ["This result predates structured artifacts. Regenerate it to validate and unlock downstream work."],
    nextQuestions: [],
    generatedAt: null,
    legacy: true,
  };
};

export const setArtifact = (key, artifact) => {
  // Keep lf:output:* untouched: it may contain a user's full legacy result.
  // Structured artifacts have their own versioned key and export path.
  return writeJSON(PREFIX + "artifact:" + key, artifact);
};

export const removeArtifact = (key) => safe(() => {
  localStorage.removeItem(PREFIX + "artifact:" + key);
  return { ok: true };
}, { ok: false, error: "Could not remove artifact." });

export const getRuns = (frameworkId) => {
  const runs = readJSON(PREFIX + "runs:" + frameworkId, []);
  return Array.isArray(runs) ? runs : [];
};

export const getLatestRun = (frameworkId) => getRuns(frameworkId).at(-1) || null;
export const getRun = (frameworkId, runId) => getRuns(frameworkId).find(run => run.id === runId) || null;

export const upsertRun = (frameworkId, record) => {
  const runs = getRuns(frameworkId);
  const index = runs.findIndex(run => run.id === record.id);
  if (index >= 0) runs[index] = { ...runs[index], ...record };
  else runs.push(record);
  return writeJSON(PREFIX + "runs:" + frameworkId, runs.slice(-20));
};

export const getActive = () => {
  const value = readJSON(PREFIX + "active", ["bmc"]);
  return Array.isArray(value) ? value : ["bmc"];
};
export const setActive = (keys) => writeJSON(PREFIX + "active", Array.isArray(keys) ? keys : ["bmc"]);

export const getChat = (key) => {
  const value = readJSON(PREFIX + "chat:" + key, []);
  return Array.isArray(value) ? value : [];
};
export const setChat = (key, log) => writeJSON(PREFIX + "chat:" + key, trimChatLog(log, 80));

export const getSelectedSection = (frameworkId) => safe(
  () => localStorage.getItem(PREFIX + "selected:" + frameworkId) || "",
  "",
);
export const setSelectedSection = (frameworkId, sectionId) => write(PREFIX + "selected:" + frameworkId, sectionId || "");

export const resetAll = () => safe(() => {
  Object.keys(localStorage)
    .filter(key => key.startsWith(PREFIX) && key !== PREFIX + "apikey")
    .forEach(key => localStorage.removeItem(key));
  return { ok: true };
}, { ok: false, error: "Browser storage could not be reset." });
