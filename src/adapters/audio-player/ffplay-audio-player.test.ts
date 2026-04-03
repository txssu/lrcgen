import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { FfplayAudioPlayer } from "./ffplay-audio-player";
import { unlinkSync } from "node:fs";

const hasFfmpeg = await Bun.spawn(["which", "ffmpeg"], { stdout: "ignore", stderr: "ignore" }).exited.then((c) => c === 0).catch(() => false);

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

describe.skipIf(!hasFfmpeg)("FfplayAudioPlayer", () => {
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

  test("pause kills the ffplay process (not just SIGSTOP)", async () => {
    const player = new FfplayAudioPlayer(TEST_FILE);
    await player.init();

    player.play();
    await new Promise((r) => setTimeout(r, 200));

    player.pause();

    // After pause, the process should be fully terminated (killed, not frozen)
    // Access internal state to verify
    expect((player as any).process).toBeNull();

    // Position should be frozen
    const posAtPause = player.getCurrentPosition();
    await new Promise((r) => setTimeout(r, 200));
    expect(player.getCurrentPosition()).toBe(posAtPause);

    // Resume should restart playback from saved position
    player.resume();
    await new Promise((r) => setTimeout(r, 150));
    expect(player.getCurrentPosition()).toBeGreaterThan(posAtPause);

    player.dispose();
  });

  test("pause saves the last-reported position, not a recalculated one", async () => {
    const player = new FfplayAudioPlayer(TEST_FILE);
    await player.init();

    // Collect positions reported by the ticker
    const reported: number[] = [];
    player.onPosition((ms) => reported.push(ms));

    player.play();
    // Wait for several ticks
    await new Promise((r) => setTimeout(r, 300));

    // The last reported position before pause
    const lastReported = reported[reported.length - 1]!;

    // Pause — position should match what the UI was showing (last tick), not Date.now()
    player.pause();
    const savedPos = player.getCurrentPosition();

    // savedPos should equal lastReported, not be ahead of it
    expect(savedPos).toBe(lastReported);

    player.dispose();
  });

  test("playSegment clamps position to segment end when process exits", async () => {
    const player = new FfplayAudioPlayer(TEST_FILE);
    await player.init();

    // Play segment from 100ms to 300ms (200ms duration)
    player.playSegment(100, 300);

    // Wait for ffplay to finish (startup + 200ms + some buffer)
    await new Promise((r) => setTimeout(r, 1500));

    // Position should be clamped to 300 (the segment end), not ~100+wallclock
    const pos = player.getCurrentPosition();
    expect(pos).toBe(300);

    player.dispose();
  });

  test("position calibrated by ffplay stderr, not ahead of real audio", async () => {
    const player = new FfplayAudioPlayer(TEST_FILE);
    await player.init();

    player.play();
    // Wait for ffplay to start and calibration to happen
    await new Promise((r) => setTimeout(r, 500));

    const pos = player.getCurrentPosition();
    // Wall clock would say ~500ms. With calibration (startup delay subtracted),
    // position should be noticeably less than 500ms.
    // ffplay typically has 100-400ms startup delay.
    expect(pos).toBeLessThan(450);

    // Also: startupDelay should have been detected (non-zero)
    expect((player as any)._startupDelayMs).toBeGreaterThan(0);

    player.dispose();
  });
});
