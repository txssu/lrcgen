import type { AudioPlayer } from "./audio-player";

export interface AudioRef {
  source: string;
  id: string;
  displayName: string;
}

export interface AudioSource {
  name: string;
  select(): Promise<AudioRef>;
  createPlayer(ref: AudioRef): AudioPlayer;
}
