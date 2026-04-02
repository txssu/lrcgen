import { test, expect, describe } from "bun:test";
import { render } from "ink-testing-library";
import { PreviewScreen } from "./preview-screen";
import { createDocument, addLines, linesFromText, setTimestamp } from "../../core/lrc-document";

function makeDoc() {
  let doc = addLines(createDocument(), linesFromText("Line A\nLine B\nLine C\nLine D\nLine E"));
  doc = setTimestamp(doc, 0, 0);
  doc = setTimestamp(doc, 1, 2000);
  doc = setTimestamp(doc, 2, 4000);
  doc = setTimestamp(doc, 3, 6000);
  doc = setTimestamp(doc, 4, 8000);
  return doc;
}

const noopPlayer = {
  play: () => {},
  playSegment: () => {},
  pause: () => {},
  resume: () => {},
  seek: () => {},
  getCurrentPosition: () => 0,
  getDuration: () => 30000,
  onPosition: () => () => {},
  dispose: () => {},
};

describe("PreviewScreen", () => {
  test("renders all lyrics lines", () => {
    const { lastFrame } = render(
      <PreviewScreen document={makeDoc()} player={noopPlayer} onBack={() => {}} />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("Line A");
    expect(frame).toContain("Line B");
    expect(frame).toContain("Line C");
  });

  test("highlights current line based on player position", () => {
    // Player at position 3000ms — should highlight Line B (timestamp 2000, before Line C at 4000)
    const playerAt3s = {
      ...noopPlayer,
      getCurrentPosition: () => 3000,
    };
    const { lastFrame } = render(
      <PreviewScreen document={makeDoc()} player={playerAt3s} onBack={() => {}} />
    );
    const frame = lastFrame()!;
    // Line B should be the current (highlighted) line — marked with ▸
    expect(frame).toContain("▸");
    // The ▸ should be on Line B's row
    const lines = frame.split("\n");
    const currentLine = lines.find((l: string) => l.includes("▸"));
    expect(currentLine).toContain("Line B");
  });

  test("shows progress bar", () => {
    const { lastFrame } = render(
      <PreviewScreen document={makeDoc()} player={noopPlayer} onBack={() => {}} />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("00:00.00");
  });

  test("shows key hints", () => {
    const { lastFrame } = render(
      <PreviewScreen document={makeDoc()} player={noopPlayer} onBack={() => {}} />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("pause");
    expect(frame).toContain("back");
  });
});
