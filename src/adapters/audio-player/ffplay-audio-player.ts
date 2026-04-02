import type { AudioPlayer } from "../../ports/audio-player";
import type { Subprocess } from "bun";

export class FfplayAudioPlayer implements AudioPlayer {
  private process: Subprocess | null = null;
  private filePath: string;
  private _duration: number = 0;
  private _position: number = 0;
  private _playing: boolean = false;
  private positionCallbacks: Set<(ms: number) => void> = new Set();
  private ticker: ReturnType<typeof setInterval> | null = null;
  private startedAt: number = 0;
  private offsetMs: number = 0;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async init(): Promise<void> {
    const result = await Bun.$`ffprobe -v quiet -print_format json -show_format ${this.filePath}`.json();
    this._duration = Math.round(parseFloat(result.format.duration) * 1000);
  }

  play(fromMs?: number): void {
    this.dispose();
    this.offsetMs = fromMs ?? 0;
    const args = ["-nodisp", "-autoexit", "-loglevel", "quiet"];
    if (this.offsetMs > 0) {
      args.push("-ss", String(this.offsetMs / 1000));
    }
    args.push(this.filePath);
    this.process = Bun.spawn(["ffplay", ...args], { stdout: "ignore", stderr: "ignore" });
    this._playing = true;
    this.startedAt = Date.now();
    this.startTicker();
    this.watchProcessExit();
  }

  playSegment(fromMs: number, toMs: number): void {
    this.dispose();
    this.offsetMs = fromMs;
    const durationSec = (toMs - fromMs) / 1000;
    const args = ["-nodisp", "-autoexit", "-loglevel", "quiet"];
    if (this.offsetMs > 0) {
      args.push("-ss", String(this.offsetMs / 1000));
    }
    args.push("-t", String(durationSec));
    args.push(this.filePath);
    this.process = Bun.spawn(["ffplay", ...args], { stdout: "ignore", stderr: "ignore" });
    this._playing = true;
    this.startedAt = Date.now();
    this.startTicker();
    this.watchProcessExit();
  }

  pause(): void {
    if (!this._playing) return;
    this._position = this.getCurrentPosition();
    this.stopTicker();
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this._playing = false;
  }

  resume(): void {
    if (this._playing) return;
    this.play(this._position);
  }

  seek(ms: number): void {
    this.play(ms);
  }

  getCurrentPosition(): number {
    if (!this._playing) return this._position;
    return this.offsetMs + (Date.now() - this.startedAt);
  }

  getDuration(): number {
    return this._duration;
  }

  onPosition(callback: (ms: number) => void): () => void {
    this.positionCallbacks.add(callback);
    return () => { this.positionCallbacks.delete(callback); };
  }

  dispose(): void {
    this.stopTicker();
    if (this.process) { this.process.kill(); this.process = null; }
    this._playing = false;
  }

  private startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => {
      const pos = this.getCurrentPosition();
      for (const cb of this.positionCallbacks) { cb(pos); }
    }, 50);
  }

  private stopTicker(): void {
    if (this.ticker) { clearInterval(this.ticker); this.ticker = null; }
  }

  private watchProcessExit(): void {
    const proc = this.process;
    if (!proc) return;
    proc.exited.then(() => {
      // Only act if this is still the active process (not replaced by a new play/seek)
      if (this.process === proc) {
        this._position = this.getCurrentPosition();
        this._playing = false;
        this.stopTicker();
      }
    });
  }
}
