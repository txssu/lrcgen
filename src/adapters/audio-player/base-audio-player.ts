import type { AudioPlayer } from "../../ports/audio-player";
import type { Subprocess } from "bun";

export abstract class BaseAudioPlayer implements AudioPlayer {
  protected process: Subprocess | null = null;
  protected filePath: string;
  protected _duration: number = 0;
  protected _position: number = 0;
  protected _playing: boolean = false;
  protected positionCallbacks: Set<(ms: number) => void> = new Set();
  protected ticker: ReturnType<typeof setInterval> | null = null;
  protected startedAt: number = 0;
  protected offsetMs: number = 0;
  protected _lastTickPosition: number = 0;
  protected _segmentEndMs: number | null = null;
  protected _startupDelayMs: number = 0;
  protected _calibrated: boolean = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  abstract init(): Promise<void>;
  protected abstract spawnPlay(fromMs: number): Subprocess;
  protected abstract spawnPlaySegment(fromMs: number, durationSec: number): Subprocess;
  protected abstract parsePositionFromOutput(text: string): number | null;

  play(fromMs?: number): void {
    this.dispose();
    this.offsetMs = fromMs ?? 0;
    this._segmentEndMs = null;
    this._startupDelayMs = 0;
    this._calibrated = false;
    this.process = this.spawnPlay(this.offsetMs);
    this._playing = true;
    this.startedAt = Date.now();
    this.startTicker();
    this.parseOutput();
    this.watchProcessExit();
  }

  playSegment(fromMs: number, toMs: number): void {
    this.dispose();
    this.offsetMs = fromMs;
    this._segmentEndMs = toMs;
    this._startupDelayMs = 0;
    this._calibrated = false;
    const durationSec = (toMs - fromMs) / 1000;
    this.process = this.spawnPlaySegment(fromMs, durationSec);
    this._playing = true;
    this.startedAt = Date.now();
    this.startTicker();
    this.parseOutput();
    this.watchProcessExit();
  }

  pause(): void {
    if (!this._playing) return;
    this._position = this._lastTickPosition;
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
    const wallClock = Date.now() - this.startedAt;
    const adjusted = this.offsetMs + Math.max(0, wallClock - this._startupDelayMs);
    if (this._segmentEndMs !== null) {
      return Math.min(adjusted, this._segmentEndMs);
    }
    return adjusted;
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

  protected startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => {
      const pos = this.getCurrentPosition();
      this._lastTickPosition = pos;
      for (const cb of this.positionCallbacks) { cb(pos); }
    }, 50);
  }

  protected stopTicker(): void {
    if (this.ticker) { clearInterval(this.ticker); this.ticker = null; }
  }

  protected parseOutput(): void {
    const proc = this.process;
    if (!proc?.stderr) return;

    const reader = proc.stderr.getReader();
    const decoder = new TextDecoder();

    const read = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          if (!this._calibrated) {
            const positionMs = this.parsePositionFromOutput(text);
            if (positionMs !== null) {
              const wallClockElapsed = Date.now() - this.startedAt;
              this._startupDelayMs = Math.max(0, wallClockElapsed - positionMs);
              this._calibrated = true;
            }
          }
        }
      } catch {
        // Process killed, stream closed
      }
    };
    read();
  }

  protected watchProcessExit(): void {
    const proc = this.process;
    if (!proc) return;
    proc.exited.then(() => {
      if (this.process === proc) {
        this._position = this._segmentEndMs ?? this._lastTickPosition;
        this._playing = false;
        this.stopTicker();
      }
    });
  }
}
