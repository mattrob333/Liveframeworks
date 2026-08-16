// Client-side key checks only. Never log the value. Persistence stays in
// `lf:apikey` via lib/store.js. Length matches the server check in
// lib/server/frameworkRun.js (20–512 chars, sk-ant- prefix).

const MIN_API_KEY_CHARS = 20;
const MAX_API_KEY_CHARS = 512;

export function validateApiKey(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return { ok: false, error: "Enter an API key before saving." };
  }
  if (
    trimmed.length < MIN_API_KEY_CHARS
    || trimmed.length > MAX_API_KEY_CHARS
    || !/^sk-ant-[A-Za-z0-9_-]+$/.test(trimmed)
  ) {
    return { ok: false, error: "Use an Anthropic API key that starts with sk-ant-." };
  }
  return { ok: true, value: trimmed };
}
