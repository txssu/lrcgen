import { test, expect, describe } from "bun:test";
import {
  createDocument, addLines, setTimestamp, setLineText, setMetadata, linesFromText,
} from "./lrc-document";
import type { LrcDocument } from "./lrc-document";

describe("createDocument", () => {
  test("creates empty document with default tool", () => {
    const doc = createDocument();
    expect(doc.metadata.tool).toBe("https://github.com/txssu/lrcgen");
    expect(doc.lines).toEqual([]);
  });
  test("creates document with metadata", () => {
    const doc = createDocument({ artist: "Radiohead", title: "Creep" });
    expect(doc.metadata.artist).toBe("Radiohead");
    expect(doc.metadata.title).toBe("Creep");
    expect(doc.metadata.tool).toBe("https://github.com/txssu/lrcgen");
  });
});

describe("linesFromText", () => {
  test("splits text into lines with null timestamps", () => {
    const lines = linesFromText("Line one\nLine two\nLine three");
    expect(lines).toEqual([
      { timestamp: null, text: "Line one" },
      { timestamp: null, text: "Line two" },
      { timestamp: null, text: "Line three" },
    ]);
  });
  test("filters empty lines", () => {
    const lines = linesFromText("Line one\n\nLine two\n\n");
    expect(lines).toEqual([
      { timestamp: null, text: "Line one" },
      { timestamp: null, text: "Line two" },
    ]);
  });
  test("returns empty array for empty string", () => {
    expect(linesFromText("")).toEqual([]);
  });
});

describe("addLines", () => {
  test("adds lines to document", () => {
    const doc = createDocument();
    const updated = addLines(doc, linesFromText("Hello\nWorld"));
    expect(updated.lines).toHaveLength(2);
    expect(updated.lines[0]!.text).toBe("Hello");
  });
});

describe("setTimestamp", () => {
  test("sets timestamp on a line", () => {
    const doc = addLines(createDocument(), linesFromText("Hello\nWorld"));
    const updated = setTimestamp(doc, 0, 5000);
    expect(updated.lines[0]!.timestamp).toBe(5000);
    expect(updated.lines[1]!.timestamp).toBeNull();
  });
  test("clears timestamp with null", () => {
    let doc = addLines(createDocument(), linesFromText("Hello"));
    doc = setTimestamp(doc, 0, 5000);
    const updated = setTimestamp(doc, 0, null);
    expect(updated.lines[0]!.timestamp).toBeNull();
  });
});

describe("setLineText", () => {
  test("updates line text", () => {
    const doc = addLines(createDocument(), linesFromText("Old text"));
    const updated = setLineText(doc, 0, "New text");
    expect(updated.lines[0]!.text).toBe("New text");
  });
});

describe("setMetadata", () => {
  test("updates metadata fields", () => {
    const doc = createDocument();
    const updated = setMetadata(doc, { artist: "Muse", album: "Absolution" });
    expect(updated.metadata.artist).toBe("Muse");
    expect(updated.metadata.album).toBe("Absolution");
    expect(updated.metadata.tool).toBe("https://github.com/txssu/lrcgen");
  });
});
