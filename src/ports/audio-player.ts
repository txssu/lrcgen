export interface AudioPlayer {
  play(fromMs?: number): void;
  playSegment(fromMs: number, toMs: number): void;
  pause(): void;
  resume(): void;
  seek(ms: number): void;
  getCurrentPosition(): number;
  getDuration(): number;
  onPosition(callback: (ms: number) => void): () => void;
  dispose(): void;
}
