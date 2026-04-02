import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { FfplayAudioPlayer } from "./ffplay-audio-player";
import { unlinkSync } from "node:fs";

const TEST_FILE = "/tmp/lrcgen-test-silence.wav";

beforeAll(async () => {
  // Generate a 1-second silence WAV file
  const proc = Bun.spawn([
    "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
    "-t", "1", "-f", "wav", TEST_FILE,
  ], { stdout: "ignore", stderr: "ignore" });
  await proc.exited;
});

afterAll(() => {
  try { unlinkSync(TEST_FILE); } catch {}
});

describe("FfplayAudioPlayer", () => {
  test("playSegment stops position tracking after segment ends", async () => {
    const player = new FfplayAudioPlayer(TEST_FILE);
    await player.init();

    const positions: number[] = [];
    player.onPosition((ms) => positions.push(ms));

    // Play a 200ms segment
    player.playSegment(0, 200);

    // Wait 1s — well past the 200ms segment + ffplay startup overhead
    await new Promise((r) => setTimeout(r, 1000));

    // Position should have frozen after ffplay exited, not still growing
    const pos1 = player.getCurrentPosition();
    await new Promise((r) => setTimeout(r, 300));
    const pos2 = player.getCurrentPosition();

    // Key assertion: position is NOT advancing anymore
    expect(pos2).toBe(pos1);

    // Ticker should have stopped — no new callbacks
    const countBefore = positions.length;
    await new Promise((r) => setTimeout(r, 200));
    const countAfter = positions.length;
    expect(countAfter).toBe(countBefore);

    player.dispose();
  });
});
