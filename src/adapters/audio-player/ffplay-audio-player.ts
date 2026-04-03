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
  private _lastTickPosition: number = 0;
  private _segmentEndMs: number | null = null;
  private _startupDelayMs: number = 0;
  private _calibrated: boolean = false;

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
    this._segmentEndMs = null;
    this._startupDelayMs = 0;
    this._calibrated = false;
    const args = ["-nodisp", "-autoexit", "-loglevel", "warning", "-stats"];
    if (this.offsetMs > 0) {
      args.push("-ss", String(this.offsetMs / 1000));
    }
    args.push(this.filePath);
    this.process = Bun.spawn(["ffplay", ...args], { stdout: "ignore", stderr: "pipe" });
    this._playing = true;
    this.startedAt = Date.now();
    this.startTicker();
    this.parseStderr();
    this.watchProcessExit();
  }

  playSegment(fromMs: number, toMs: number): void {
    this.dispose();
    this.offsetMs = fromMs;
    this._segmentEndMs = toMs;
    this._startupDelayMs = 0;
    this._calibrated = false;
    const durationSec = (toMs - fromMs) / 1000;
    const args = ["-nodisp", "-autoexit", "-loglevel", "warning", "-stats"];
    if (this.offsetMs > 0) {
      args.push("-ss", String(this.offsetMs / 1000));
    }
    args.push("-t", String(durationSec));
    args.push(this.filePath);
    this.process = Bun.spawn(["ffplay", ...args], { stdout: "ignore", stderr: "pipe" });
    this._playing = true;
    this.startedAt = Date.now();
    this.startTicker();
    this.parseStderr();
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

  private startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => {
      const pos = this.getCurrentPosition();
      this._lastTickPosition = pos;
      for (const cb of this.positionCallbacks) { cb(pos); }
    }, 50);
  }

  private stopTicker(): void {
    if (this.ticker) { clearInterval(this.ticker); this.ticker = null; }
  }

  private parseStderr(): void {
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
          // ffplay stats line format: "   1.23 M-A:  0.000 ..."
          // The first number is the playback position in seconds
          const match = text.match(/^\s*(\d+\.?\d*)\s+M-[AV]:/m);
          if (match && !this._calibrated) {
            const ffplayPositionSec = parseFloat(match[1]!);
            const ffplayPositionMs = Math.round(ffplayPositionSec * 1000);
            const wallClockElapsed = Date.now() - this.startedAt;
            // Startup delay = wall clock elapsed - actual audio position
            this._startupDelayMs = Math.max(0, wallClockElapsed - ffplayPositionMs);
            this._calibrated = true;
          }
        }
      } catch {
        // Process killed, stream closed — expected
      }
    };

    read();
  }

  private watchProcessExit(): void {
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
