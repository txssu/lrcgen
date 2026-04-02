import type { LrcDocument } from "../core/lrc-document";

export interface LrcParser {
  parse(content: string): LrcDocument;
  serialize(doc: LrcDocument): string;
}
