import React from "react";
import { test, expect, describe } from "bun:test";
import { render } from "ink-testing-library";
import { PlaySyncScreen } from "./play-sync-screen";
import { createDocument, addLines, linesFromText, type LrcDocument } from "../../core/lrc-document";

const doc = addLines(createDocument(), linesFromText("Line A\nLine B\nLine C"));

const noopPlayer = {
  play: () => {},
  playSegment: () => {},
  pause: () => {},
  resume: () => {},
  seek: () => {},
  getCurrentPosition: () => 0,
  getDuration: () => 60000,
  onPosition: () => () => {},
  dispose: () => {},
};

function createTrackingPlayer() {
  const calls: string[] = [];
  return {
    player: {
      play: () => { calls.push("play"); },
      pause: () => { calls.push("pause"); },
      resume: () => {},
      seek: () => {},
      getCurrentPosition: () => 5000,
      getDuration: () => 60000,
      onPosition: () => () => {},
      dispose: () => { calls.push("dispose"); },
      playSegment: () => {},
    },
    calls,
  };
}

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

  test("stops audio when all lines are marked", () => {
    const singleLineDoc = addLines(createDocument(), linesFromText("Only line"));
    const { player, calls } = createTrackingPlayer();
    const completed: LrcDocument[] = [];
    const { stdin } = render(
      <PlaySyncScreen document={singleLineDoc} player={player} onComplete={(d) => completed.push(d)} />
    );
    // Mark the only line with spacebar
    stdin.write(" ");
    expect(calls).toContain("dispose");
    expect(completed).toHaveLength(1);
  });
});
