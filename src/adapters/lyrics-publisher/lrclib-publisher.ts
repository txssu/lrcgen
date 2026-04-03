import type { LyricsPublisher, PublishResult } from "../../ports/lyrics-publisher";
import type { LrcDocument } from "../../core/lrc-document";
import type { LrcParser } from "../../ports/lrc-parser";
import { solveChallenge } from "./lrclib-pow";

const BASE_URL = "https://lrclib.net/api";

interface PublishBody {
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  plainLyrics: string;
  syncedLyrics: string;
}

export function buildPublishBody(doc: LrcDocument, audioLengthMs: number, parser: LrcParser): PublishBody {
  const syncedLyrics = parser.serialize(doc);
  const plainLyrics = doc.lines.map((l) => l.text).join("\n");

  return {
    trackName: doc.metadata.title ?? "",
    artistName: doc.metadata.artist ?? "",
    albumName: doc.metadata.album ?? "",
    duration: audioLengthMs / 1000,
    plainLyrics,
    syncedLyrics,
  };
}

export class LrclibPublisher implements LyricsPublisher {
  name = "LRCLIB";
  private parser: LrcParser;

  constructor(parser: LrcParser) {
    this.parser = parser;
  }

  async publish(doc: LrcDocument, audioLengthMs: number): Promise<PublishResult> {
    try {
      // Step 1: Request challenge
      const challengeRes = await fetch(`${BASE_URL}/request-challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!challengeRes.ok) {
        return { success: false, error: `Challenge request failed: ${challengeRes.status}` };
      }
      const { prefix, target } = await challengeRes.json() as { prefix: string; target: string };

      // Step 2: Solve proof-of-work
      const nonce = await solveChallenge(prefix, target);
      const token = `${prefix}:${nonce}`;

      // Step 3: Publish
      const body = buildPublishBody(doc, audioLengthMs, this.parser);
      const publishRes = await fetch(`${BASE_URL}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Publish-Token": token,
        },
        body: JSON.stringify(body),
      });

      if (publishRes.ok) {
        return { success: true };
      }

      const errorText = await publishRes.text();
      return { success: false, error: `Publish failed (${publishRes.status}): ${errorText}` };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }
}
