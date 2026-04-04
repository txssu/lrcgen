import type { Subprocess } from "bun";
import { BaseAudioPlayer } from "./base-audio-player";

export class MpvAudioPlayer extends BaseAudioPlayer {
  async init(): Promise<void> {
    // Use mpv to get duration: play 0 frames, print duration
    const proc = Bun.spawn([
      "mpv", "--no-video", "--no-audio", "--frames=0",
      `--term-status-msg=DURATION:\${=duration}`,
      this.filePath,
    ], { stdout: "pipe", stderr: "ignore" });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    const match = output.match(/DURATION:(\d+\.?\d*)/);
    if (match) {
      this._duration = Math.round(parseFloat(match[1]!) * 1000);
    }
  }

  protected spawnPlay(fromMs: number): Subprocess {
    const args = ["--no-video", "--input-terminal=no", "--msg-level=all=error,statusline=status"];
    if (fromMs > 0) {
      args.push(`--start=${fromMs / 1000}`);
    }
    args.push(this.filePath);
    return Bun.spawn(["mpv", ...args], { stdout: "ignore", stderr: "pipe" });
  }

  protected spawnPlaySegment(fromMs: number, durationSec: number): Subprocess {
    const args = ["--no-video", "--input-terminal=no", "--msg-level=all=error,statusline=status"];
    if (fromMs > 0) {
      args.push(`--start=${fromMs / 1000}`);
    }
    args.push(`--length=${durationSec}`);
    args.push(this.filePath);
    return Bun.spawn(["mpv", ...args], { stdout: "ignore", stderr: "pipe" });
  }

  protected parsePositionFromOutput(text: string): number | null {
    // mpv status line: "AV: 00:01:23 / 00:04:12 (29%)" or "(+) Audio --audio --   0:01:23 / 0:04:12 (29%)"
    // Also matches: "A: 00:00:01 / 00:00:30 (5%)"
    const match = text.match(/[AV]+:\s*(\d+):(\d{2}):(\d{2})/);
    if (!match) {
      // Also try shorter format: "A:  0:01 / 0:30"
      const shortMatch = text.match(/[AV]+:\s*(\d+):(\d{2})/);
      if (!shortMatch) return null;
      const min = parseInt(shortMatch[1]!, 10);
      const sec = parseInt(shortMatch[2]!, 10);
      return (min * 60 + sec) * 1000;
    }
    const hours = parseInt(match[1]!, 10);
    const min = parseInt(match[2]!, 10);
    const sec = parseInt(match[3]!, 10);
    return (hours * 3600 + min * 60 + sec) * 1000;
  }
}
