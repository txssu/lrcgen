import { test, expect, describe } from "bun:test";
import { ClipboardLyricsProvider } from "./clipboard-lyrics-provider";

describe("ClipboardLyricsProvider", () => {
  test("reads multi-line text from system clipboard", async () => {
    // Put known text into clipboard
    const testText = "Line one\nLine two\nLine three";
    const proc = Bun.spawn(["pbcopy"], {
      stdin: new Response(testText).body,
    });
    await proc.exited;

    const provider = new ClipboardLyricsProvider();
    const result = await provider.fetch();

    expect(result).toContain("Line one");
    expect(result).toContain("Line two");
    expect(result).toContain("Line three");
    expect(result.split("\n").length).toBeGreaterThanOrEqual(3);
  });

  test("returns empty string when clipboard is empty", async () => {
    // Clear clipboard
    const proc = Bun.spawn(["pbcopy"], {
      stdin: new Response("").body,
    });
    await proc.exited;

    const provider = new ClipboardLyricsProvider();
    const result = await provider.fetch();

    expect(result).toBe("");
  });
});
