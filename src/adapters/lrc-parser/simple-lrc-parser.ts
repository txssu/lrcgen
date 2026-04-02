import type { LrcParser } from "../../ports/lrc-parser";
import type { LrcDocument, LrcLine, LrcMetadata } from "../../core/lrc-document";
import { createDocument } from "../../core/lrc-document";
import { msToLrc, lrcToMs } from "../../core/time-utils";

const METADATA_TAGS: Record<string, keyof LrcMetadata> = {
  ar: "artist",
  ti: "title",
  al: "album",
};

const REVERSE_TAGS: Record<string, string> = {
  artist: "ar",
  title: "ti",
  album: "al",
};

export class SimpleLrcParser implements LrcParser {
  parse(content: string): LrcDocument {
    const metadata: Partial<Omit<LrcMetadata, "tool">> = {};
    const lines: LrcLine[] = [];

    for (const raw of content.split("\n")) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const metaMatch = trimmed.match(/^\[([a-z]+):(.+)\]$/i);
      if (metaMatch) {
        const tag = metaMatch[1]!.toLowerCase();
        const value = metaMatch[2]!.trim();
        const field = METADATA_TAGS[tag];
        if (field) {
          (metadata as Record<string, string>)[field] = value;
        }
        continue;
      }

      const lineMatch = trimmed.match(/^\[(\d{2,}:\d{2}\.\d{2})\](.*)$/);
      if (lineMatch) {
        const timestamp = lrcToMs(lineMatch[1]!);
        lines.push({ timestamp, text: lineMatch[2]! });
        continue;
      }

      lines.push({ timestamp: null, text: trimmed });
    }

    const doc = createDocument(metadata);
    return { ...doc, lines };
  }

  serialize(doc: LrcDocument): string {
    const parts: string[] = [];
    for (const [field, tag] of Object.entries(REVERSE_TAGS)) {
      const value = doc.metadata[field];
      if (value) {
        parts.push(`[${tag}:${value}]`);
      }
    }
    parts.push(`[tool:${doc.metadata.tool}]`);
    for (const line of doc.lines) {
      if (line.timestamp !== null) {
        parts.push(`[${msToLrc(line.timestamp)}]${line.text}`);
      } else {
        parts.push(line.text);
      }
    }
    return parts.join("\n");
  }
}
