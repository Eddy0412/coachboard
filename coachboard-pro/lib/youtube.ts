export function parseYouTubeId(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
    if (u.searchParams.get("v")) return u.searchParams.get("v")!;
    const parts = u.pathname.split("/").filter(Boolean);
    const embedIdx = parts.indexOf("embed");
    if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
  } catch {
    // invalid URL
  }
  return "";
}

/** Parses a YouTube "t"/"start" param — either plain seconds ("175") or a
 * duration string ("2m55s", "1h2m3s") — into total seconds, or null if absent. */
export function parseYouTubeStart(url: string): number | null {
  try {
    const u = new URL(url);
    const raw = u.searchParams.get("t") ?? u.searchParams.get("start");
    if (!raw) return null;

    if (/^\d+$/.test(raw)) return parseInt(raw, 10);

    const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!match) return null;
    const [, h, m, s] = match;
    if (!h && !m && !s) return null;
    return (parseInt(h || "0", 10) * 3600) + (parseInt(m || "0", 10) * 60) + parseInt(s || "0", 10);
  } catch {
    return null;
  }
}

export function formatTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
