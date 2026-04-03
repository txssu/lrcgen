import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { FfplayAudioPlayer } from "./ffplay-audio-player";
import { unlinkSync } from "node:fs";

const hasFfmpeg = await Bun.spawn(["which", "ffmpeg"], { stdout: "ignore", stderr: "ignore" }).exited.then((c) => c === 0).catch(() => false);

const TEST_FILE = "/tmp/lrcgen-test-silence.wav";

describe.skipIf(!hasFfmpeg)("FfplayAudioPlayer", () => {
  beforeAll(async () => {
    const proc = Bun.spawn([
      "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
      "-t", "1", "-f", "wav", TEST_FILE,
    ], { stdout: "ignore", stderr: "ignore" });
    await proc.exited;
  });

  afterAll(() => {
    try { unlinkSync(TEST_FILE); } catch {}
  });

  test("playSegment stops position tracking after segment ends", async () => {
    const player = new FfplayAudioPlayer(TEST_FILE);
    await player.init();

    const positions: number[] = [];
    player.onPosition((ms) => positions.push(ms));

    player.playSegment(0, 200);

    await new Promise((r) => setTimeout(r, 1000));

    const pos1 = player.getCurrentPosition();
    await new Promise((r) => setTimeout(r, 300));
    const pos2 = player.getCurrentPosition();

    expect(pos2).toBe(pos1);

    const countBefore = positions.length;
    await new Promise((r) => setTimeout(r, 200));
    const countAfter = positions.length;
    expect(countAfter).toBe(countBefore);

    player.dispose();
  });

  test("pause kills the ffplay process (not just SIGSTOP)", async () => {
    const player = new FfplayAudioPlayer(TEST_FILE);
    await player.init();

    player.play();
    await new Promise((r) => setTimeout(r, 200));

    player.pause();

    expect((player as any).process).toBeNull();

    const posAtPause = player.getCurrentPosition();
    await new Promise((r) => setTimeout(r, 200));
    expect(player.getCurrentPosition()).toBe(posAtPause);

    player.resume();
    await new Promise((r) => setTimeout(r, 150));
    expect(player.getCurrentPosition()).toBeGreaterThan(posAtPause);

    player.dispose();
  });

  test("pause saves the last-reported position, not a recalculated one", async () => {
    const player = new FfplayAudioPlayer(TEST_FILE);
    await player.init();

    const reported: number[] = [];
    player.onPosition((ms) => reported.push(ms));

    player.play();
    await new Promise((r) => setTimeout(r, 300));

    const lastReported = reported[reported.length - 1]!;

    player.pause();
    const savedPos = player.getCurrentPosition();

    expect(savedPos).toBe(lastReported);

    player.dispose();
  });

  test("playSegment clamps position to segment end when process exits", async () => {
    const player = new FfplayAudioPlayer(TEST_FILE);
    await player.init();

    player.playSegment(100, 300);

    await new Promise((r) => setTimeout(r, 1500));

    const pos = player.getCurrentPosition();
    expect(pos).toBe(300);

    player.dispose();
  });

  test("position calibrated by ffplay stderr, not ahead of real audio", async () => {
    const player = new FfplayAudioPlayer(TEST_FILE);
    await player.init();

    player.play();
    await new Promise((r) => setTimeout(r, 500));

    const pos = player.getCurrentPosition();
    expect(pos).toBeLessThan(450);

    expect((player as any)._startupDelayMs).toBeGreaterThan(0);

    player.dispose();
  });
});
