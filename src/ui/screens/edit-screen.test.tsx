import React from "react";
import { test, expect, describe } from "bun:test";
import { render } from "ink-testing-library";
import { EditScreen } from "./edit-screen";
import { createDocument, addLines, linesFromText, setTimestamp } from "../../core/lrc-document";

function makeDoc() {
  let doc = addLines(createDocument(), linesFromText("Line A\nLine B\nLine C"));
  doc = setTimestamp(doc, 0, 1000);
  doc = setTimestamp(doc, 1, 5000);
  doc = setTimestamp(doc, 2, 10000);
  return doc;
}

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

describe("EditScreen", () => {
  test("renders synced lines with timestamps", () => {
    const { lastFrame } = render(
      <EditScreen document={makeDoc()} player={noopPlayer} onDocumentChange={() => {}} onResync={() => {}} onExport={() => {}} />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("00:01.00");
    expect(frame).toContain("Line A");
    expect(frame).toContain("00:05.00");
    expect(frame).toContain("Line B");
  });
  test("shows first line as current", () => {
    const { lastFrame } = render(
      <EditScreen document={makeDoc()} player={noopPlayer} onDocumentChange={() => {}} onResync={() => {}} onExport={() => {}} />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("▸");
  });
});
