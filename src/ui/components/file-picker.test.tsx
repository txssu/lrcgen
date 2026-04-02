import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { render } from "ink-testing-library";
import { FilePicker } from "./file-picker";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

const TEST_DIR = "/tmp/lrcgen-test-filepicker";

beforeAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(`${TEST_DIR}/subdir`, { recursive: true });
  writeFileSync(`${TEST_DIR}/song.mp3`, "fake");
  writeFileSync(`${TEST_DIR}/track.flac`, "fake");
  writeFileSync(`${TEST_DIR}/notes.txt`, "fake");
  writeFileSync(`${TEST_DIR}/lyrics.lrc`, "fake");
  writeFileSync(`${TEST_DIR}/.hidden`, "fake");
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("FilePicker", () => {
  test("renders files and directories in the given path", async () => {
    const { lastFrame } = render(
      <FilePicker directory={TEST_DIR} onSelect={() => {}} onCancel={() => {}} />
    );
    // Wait for async directory read
    await new Promise((r) => setTimeout(r, 50));
    const frame = lastFrame()!;
    expect(frame).toContain("subdir/");
    expect(frame).toContain("song.mp3");
  });

  test("filters files by extensions", async () => {
    const { lastFrame } = render(
      <FilePicker directory={TEST_DIR} extensions={[".lrc"]} onSelect={() => {}} onCancel={() => {}} />
    );
    await new Promise((r) => setTimeout(r, 50));
    const frame = lastFrame()!;
    expect(frame).toContain("lyrics.lrc");
    expect(frame).toContain("subdir/"); // directories always shown
    expect(frame).not.toContain("song.mp3");
    expect(frame).not.toContain("notes.txt");
  });

  test("hides dotfiles", async () => {
    const { lastFrame } = render(
      <FilePicker directory={TEST_DIR} onSelect={() => {}} onCancel={() => {}} />
    );
    await new Promise((r) => setTimeout(r, 50));
    const frame = lastFrame()!;
    expect(frame).not.toContain(".hidden");
  });

  test("shows .. for parent navigation", async () => {
    const { lastFrame } = render(
      <FilePicker directory={TEST_DIR} onSelect={() => {}} onCancel={() => {}} />
    );
    await new Promise((r) => setTimeout(r, 50));
    const frame = lastFrame()!;
    expect(frame).toContain("..");
  });

  test("shows current directory path", async () => {
    const { lastFrame } = render(
      <FilePicker directory={TEST_DIR} onSelect={() => {}} onCancel={() => {}} />
    );
    await new Promise((r) => setTimeout(r, 50));
    const frame = lastFrame()!;
    expect(frame).toContain(TEST_DIR);
  });
});
