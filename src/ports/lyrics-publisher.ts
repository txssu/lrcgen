import type { LrcDocument } from "../core/lrc-document";

export interface PublishResult {
  success: boolean;
  error?: string;
}

export interface LyricsPublisher {
  name: string;
  publish(doc: LrcDocument, audioLengthMs: number): Promise<PublishResult>;
}
