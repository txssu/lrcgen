import type { AudioSource } from "./ports/audio-source";
import type { LyricsProvider } from "./ports/lyrics-provider";
import type { LrcParser } from "./ports/lrc-parser";
import { LocalAudioSource } from "./adapters/audio-source/local-audio-source";
import { ClipboardLyricsProvider } from "./adapters/lyrics-provider/clipboard-lyrics-provider";
import { SimpleLrcParser } from "./adapters/lrc-parser/simple-lrc-parser";

export interface Registry {
  audioSources: AudioSource[];
  lyricsProviders: LyricsProvider[];
  lrcParser: LrcParser;
}

export function createDefaultRegistry(): Registry {
  return {
    audioSources: [new LocalAudioSource()],
    lyricsProviders: [new ClipboardLyricsProvider()],
    lrcParser: new SimpleLrcParser(),
  };
}
