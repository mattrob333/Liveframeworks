// Competitor names become links only when a real http(s) URL already exists.
// Do not invent domains from the company name.

export function httpUrl(value) {
  const text = String(value || "").trim();
  if (!/^https?:\/\//i.test(text)) return "";
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function playerLinkUrl(player, evidence = []) {
  const fromPlayer = httpUrl(player?.url);
  if (fromPlayer) return fromPlayer;

  const name = String(player?.name || "").trim().toLowerCase();
  if (!name) return "";

  const match = (Array.isArray(evidence) ? evidence : []).find(item => {
    const title = String(item?.title || "").trim().toLowerCase();
    return title === name && httpUrl(item.url);
  });
  return match ? httpUrl(match.url) : "";
}
