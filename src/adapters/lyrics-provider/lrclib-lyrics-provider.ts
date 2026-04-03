import type { LyricsProvider } from "../../ports/lyrics-provider";
import { LRCLIB_BASE_URL, LRCLIB_USER_AGENT } from "../lrclib-common";

interface LrclibResponse {
  syncedLyrics: string | null;
  plainLyrics: string | null;
}

export function parseLrclibResponse(response: { syncedLyrics: string | null; plainLyrics: string | null }): string {
  return response.syncedLyrics ?? response.plainLyrics ?? "";
}

export class LrclibLyricsProvider implements LyricsProvider {
  name = "LRCLIB";

  async fetch(query: { artist?: string; title?: string }): Promise<string> {
    if (!query.artist || !query.title) return "";

    try {
      const params = new URLSearchParams({
        artist_name: query.artist,
        track_name: query.title,
      });

      const res = await globalThis.fetch(`${LRCLIB_BASE_URL}/get?${params}`, {
        headers: { "User-Agent": LRCLIB_USER_AGENT },
      });
      if (!res.ok) return "";

      const data = (await res.json()) as LrclibResponse;
      return parseLrclibResponse(data);
    } catch {
      return "";
    }
  }
}
