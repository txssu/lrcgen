import type { AudioSource, AudioRef } from "../../ports/audio-source";
import type { AudioPlayer } from "../../ports/audio-player";
import { MpvAudioPlayer } from "../audio-player/mpv-audio-player";
import { FfplayAudioPlayer } from "../audio-player/ffplay-audio-player";
import path from "node:path";

export type PlayerBackend = "mpv" | "ffplay";

let detectedBackend: PlayerBackend | null = null;

async function checkCommand(cmd: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", cmd], { stdout: "ignore", stderr: "ignore" });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

export async function detectBackend(): Promise<PlayerBackend | null> {
  if (detectedBackend) return detectedBackend;
  if (await checkCommand("mpv")) { detectedBackend = "mpv"; return "mpv"; }
  if (await checkCommand("ffplay")) { detectedBackend = "ffplay"; return "ffplay"; }
  return null;
}

export class LocalAudioSource implements AudioSource {
  name = "Local File";
  private backend: PlayerBackend;

  constructor(backend: PlayerBackend = "mpv") {
    this.backend = backend;
  }

  async select(): Promise<AudioRef> {
    throw new Error("Use selectFromPath() instead");
  }

  selectFromPath(filePath: string): AudioRef {
    return { source: this.name, id: filePath, displayName: path.basename(filePath) };
  }

  createPlayer(ref: AudioRef): AudioPlayer {
    if (this.backend === "mpv") {
      return new MpvAudioPlayer(ref.id);
    }
    return new FfplayAudioPlayer(ref.id);
  }
}
