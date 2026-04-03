import { test, expect, describe } from "bun:test";
import { buildPublishBody } from "./lrclib-publisher";
import { createDocument, addLines, linesFromText, setTimestamp, setMetadata } from "../../core/lrc-document";
import { SimpleLrcParser } from "../lrc-parser/simple-lrc-parser";

describe("buildPublishBody", () => {
  test("builds correct request body from document", () => {
    let doc = createDocument({ artist: "Muse", title: "Uprising", album: "The Resistance" });
    doc = addLines(doc, linesFromText("Line A\nLine B"));
    doc = setTimestamp(doc, 0, 1000);
    doc = setTimestamp(doc, 1, 5000);

    const parser = new SimpleLrcParser();
    const body = buildPublishBody(doc, 180000, parser);

    expect(body.trackName).toBe("Uprising");
    expect(body.artistName).toBe("Muse");
    expect(body.albumName).toBe("The Resistance");
    expect(body.duration).toBe(180);
    expect(body.syncedLyrics).toContain("[00:01.00]");
    expect(body.syncedLyrics).toContain("Line A");
    expect(body.plainLyrics).toBe("Line A\nLine B");
  });

  test("uses empty strings for missing metadata", () => {
    let doc = createDocument();
    doc = addLines(doc, linesFromText("Hello"));
    doc = setTimestamp(doc, 0, 0);

    const parser = new SimpleLrcParser();
    const body = buildPublishBody(doc, 60000, parser);

    expect(body.trackName).toBe("");
    expect(body.artistName).toBe("");
    expect(body.albumName).toBe("");
  });
});
