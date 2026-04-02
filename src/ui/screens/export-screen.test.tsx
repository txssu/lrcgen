import React from "react";
import { test, expect, describe } from "bun:test";
import { render } from "ink-testing-library";
import { ExportScreen } from "./export-screen";
import { createDocument, addLines, linesFromText, setTimestamp } from "../../core/lrc-document";
import { SimpleLrcParser } from "../../adapters/lrc-parser/simple-lrc-parser";

function makeDoc() {
  let doc = addLines(createDocument(), linesFromText("Line A\nLine B"));
  doc = setTimestamp(doc, 0, 1000);
  doc = setTimestamp(doc, 1, 5000);
  return doc;
}

describe("ExportScreen", () => {
  test("renders preview with timestamps", () => {
    const { lastFrame } = render(
      <ExportScreen document={makeDoc()} lrcParser={new SimpleLrcParser()} defaultPath="~/song.lrc" onBack={() => {}} onSaved={() => {}} />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("[00:01.00]Line A");
    expect(frame).toContain("[00:05.00]Line B");
  });
  test("shows save path", () => {
    const { lastFrame } = render(
      <ExportScreen document={makeDoc()} lrcParser={new SimpleLrcParser()} defaultPath="~/song.lrc" onBack={() => {}} onSaved={() => {}} />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("song.lrc");
  });
});
