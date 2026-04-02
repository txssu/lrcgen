import type { LyricsProvider } from "../../ports/lyrics-provider";

export class ClipboardLyricsProvider implements LyricsProvider {
  name = "Paste text";

  async fetch(): Promise<string> {
    return "";
  }
}
