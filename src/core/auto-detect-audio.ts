import path from "node:path";

const AUDIO_EXTENSIONS = [".mp3", ".flac", ".wav", ".ogg", ".m4a", ".aac", ".wma"];

export async function detectMatchingAudio(lrcPath: string): Promise<string | null> {
  const dir = path.dirname(lrcPath);
  const base = path.basename(lrcPath, path.extname(lrcPath));

  for (const ext of AUDIO_EXTENSIONS) {
    const candidate = path.join(dir, base + ext);
    if (await Bun.file(candidate).exists()) {
      return candidate;
    }
  }

  return null;
}
