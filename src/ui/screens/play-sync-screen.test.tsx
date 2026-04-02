import React from "react";
import { test, expect, describe } from "bun:test";
import { render } from "ink-testing-library";
import { PlaySyncScreen } from "./play-sync-screen";
import { createDocument, addLines, linesFromText } from "../../core/lrc-document";

const doc = addLines(createDocument(), linesFromText("Line A\nLine B\nLine C"));

const noopPlayer = {
  play: () => {},
  pause: () => {},
  resume: () => {},
  seek: () => {},
  getCurrentPosition: () => 0,
  getDuration: () => 60000,
  onPosition: () => () => {},
  dispose: () => {},
};

describe("PlaySyncScreen", () => {
  test("renders lines", () => {
    const { lastFrame } = render(
      <PlaySyncScreen document={doc} player={noopPlayer} onComplete={() => {}} />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("Line A");
    expect(frame).toContain("Line B");
    expect(frame).toContain("Line C");
  });
  test("shows first line as current", () => {
    const { lastFrame } = render(
      <PlaySyncScreen document={doc} player={noopPlayer} onComplete={() => {}} />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("▸");
  });
});
