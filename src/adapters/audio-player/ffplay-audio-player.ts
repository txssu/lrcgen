import type { Subprocess } from "bun";
import { BaseAudioPlayer } from "./base-audio-player";

export class FfplayAudioPlayer extends BaseAudioPlayer {
  async init(): Promise<void> {
    const result = await Bun.$`ffprobe -v quiet -print_format json -show_format ${this.filePath}`.json();
    this._duration = Math.round(parseFloat(result.format.duration) * 1000);
  }

  protected spawnPlay(fromMs: number): Subprocess {
    const args = ["-nodisp", "-autoexit", "-loglevel", "warning", "-stats"];
    if (fromMs > 0) {
      args.push("-ss", String(fromMs / 1000));
    }
    args.push(this.filePath);
    return Bun.spawn(["ffplay", ...args], { stdout: "ignore", stderr: "pipe" });
  }

  protected spawnPlaySegment(fromMs: number, durationSec: number): Subprocess {
    const args = ["-nodisp", "-autoexit", "-loglevel", "warning", "-stats"];
    if (fromMs > 0) {
      args.push("-ss", String(fromMs / 1000));
    }
    args.push("-t", String(durationSec));
    args.push(this.filePath);
    return Bun.spawn(["ffplay", ...args], { stdout: "ignore", stderr: "pipe" });
  }

  protected parsePositionFromOutput(text: string): number | null {
    // ffplay stats: "   1.23 M-A:  0.000 ..."
    const match = text.match(/^\s*(\d+\.?\d*)\s+M-[AV]:/m);
    if (!match) return null;
    return Math.round(parseFloat(match[1]!) * 1000);
  }
}
