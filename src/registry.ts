import type { AudioSource } from "./ports/audio-source";
import type { LyricsProvider } from "./ports/lyrics-provider";
import type { LrcParser } from "./ports/lrc-parser";
import type { LyricsPublisher } from "./ports/lyrics-publisher";
import { LocalAudioSource } from "./adapters/audio-source/local-audio-source";
import { ClipboardLyricsProvider } from "./adapters/lyrics-provider/clipboard-lyrics-provider";
import { LrclibLyricsProvider } from "./adapters/lyrics-provider/lrclib-lyrics-provider";
import { SimpleLrcParser } from "./adapters/lrc-parser/simple-lrc-parser";
import { LrclibPublisher } from "./adapters/lyrics-publisher/lrclib-publisher";

export interface Registry {
  audioSources: AudioSource[];
  lyricsProviders: LyricsProvider[];
  lyricsPublishers: LyricsPublisher[];
  lrcParser: LrcParser;
}

export function createDefaultRegistry(): Registry {
  const lrcParser = new SimpleLrcParser();
  return {
    audioSources: [new LocalAudioSource()],
    lyricsProviders: [new ClipboardLyricsProvider(), new LrclibLyricsProvider()],
    lyricsPublishers: [new LrclibPublisher(lrcParser)],
    lrcParser,
  };
}
