import type { LyricsProvider } from "../../ports/lyrics-provider";

const BASE_URL = "https://lrclib.net/api";

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

      const res = await globalThis.fetch(`${BASE_URL}/get?${params}`);
      if (!res.ok) return "";

      const data = (await res.json()) as LrclibResponse;
      return parseLrclibResponse(data);
    } catch {
      return "";
    }
  }
}
