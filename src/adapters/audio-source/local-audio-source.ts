import type { AudioSource, AudioRef } from "../../ports/audio-source";
import type { AudioPlayer } from "../../ports/audio-player";
import { FfplayAudioPlayer } from "../audio-player/ffplay-audio-player";
import path from "node:path";

export class LocalAudioSource implements AudioSource {
  name = "Local File";

  async select(): Promise<AudioRef> {
    throw new Error("Use selectFromPath() instead");
  }

  selectFromPath(filePath: string): AudioRef {
    return { source: this.name, id: filePath, displayName: path.basename(filePath) };
  }

  createPlayer(ref: AudioRef): AudioPlayer {
    return new FfplayAudioPlayer(ref.id);
  }
}
