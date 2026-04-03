import { test, expect, describe } from "bun:test";
import { SimpleLrcParser } from "./simple-lrc-parser";

const parser = new SimpleLrcParser();

describe("SimpleLrcParser.parse", () => {
  test("parses lines with timestamps", () => {
    const input = "[00:12.30]First line\n[00:15.80]Second line";
    const doc = parser.parse(input);
    expect(doc.lines).toEqual([
      { timestamp: 12300, text: "First line" },
      { timestamp: 15800, text: "Second line" },
    ]);
  });
  test("parses metadata tags", () => {
    const input = "[ar:Radiohead]\n[ti:Creep]\n[al:Pablo Honey]\n[00:12.30]Line";
    const doc = parser.parse(input);
    expect(doc.metadata.artist).toBe("Radiohead");
    expect(doc.metadata.title).toBe("Creep");
    expect(doc.metadata.album).toBe("Pablo Honey");
  });
  test("preserves tool tag from parsed file", () => {
    const input = "[tool:SomeTool]\n[00:01.00]Line";
    const doc = parser.parse(input);
    expect(doc.metadata.tool).toBe("https://github.com/txssu/lrcgen");
  });
  test("parses lines without timestamps", () => {
    const input = "Just plain text\nAnother line";
    const doc = parser.parse(input);
    expect(doc.lines).toEqual([
      { timestamp: null, text: "Just plain text" },
      { timestamp: null, text: "Another line" },
    ]);
  });
  test("handles empty input", () => {
    const doc = parser.parse("");
    expect(doc.lines).toEqual([]);
    expect(doc.metadata.tool).toBe("https://github.com/txssu/lrcgen");
  });
  test("skips empty lines", () => {
    const input = "[00:01.00]Line one\n\n[00:05.00]Line two";
    const doc = parser.parse(input);
    expect(doc.lines).toHaveLength(2);
  });
  test("handles mixed metadata and lyrics", () => {
    const input = "[ar:Muse]\n[00:01.00]Hello\n[00:05.00]World";
    const doc = parser.parse(input);
    expect(doc.metadata.artist).toBe("Muse");
    expect(doc.lines).toHaveLength(2);
  });
});

describe("SimpleLrcParser.serialize", () => {
  test("serializes document with metadata and lines", () => {
    const doc = parser.parse("[ar:Muse]\n[ti:Uprising]\n[00:01.00]Hello\n[00:05.00]World");
    const output = parser.serialize(doc);
    expect(output).toContain("[ar:Muse]");
    expect(output).toContain("[ti:Uprising]");
    expect(output).toContain("[tool:https://github.com/txssu/lrcgen]");
    expect(output).toContain("[00:01.00] Hello");
    expect(output).toContain("[00:05.00] World");
  });
  test("omits timestamp for unsynced lines", () => {
    const doc = parser.parse("Plain text line");
    const output = parser.serialize(doc);
    expect(output).toContain("Plain text line");
    expect(output).not.toContain("[00:");
  });
  test("always includes tool tag", () => {
    const doc = parser.parse("[00:01.00]Line");
    const output = parser.serialize(doc);
    expect(output).toContain("[tool:https://github.com/txssu/lrcgen]");
  });
  test("round-trips correctly", () => {
    const input = "[ar:Radiohead]\n[ti:Creep]\n[00:12.30]First\n[00:15.80]Second";
    const doc = parser.parse(input);
    const output = parser.serialize(doc);
    const doc2 = parser.parse(output);
    expect(doc2.metadata.artist).toBe(doc.metadata.artist);
    expect(doc2.metadata.title).toBe(doc.metadata.title);
    expect(doc2.lines).toEqual(doc.lines);
  });
});
