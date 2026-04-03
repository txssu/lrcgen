import { test, expect, describe } from "bun:test";
import { parseLrclibResponse } from "./lrclib-lyrics-provider";

describe("parseLrclibResponse", () => {
  test("returns synced lyrics when available", () => {
    const response = {
      syncedLyrics: "[00:01.00] Hello\n[00:05.00] World",
      plainLyrics: "Hello\nWorld",
    };
    expect(parseLrclibResponse(response)).toBe("[00:01.00] Hello\n[00:05.00] World");
  });

  test("falls back to plain lyrics when no synced", () => {
    const response = {
      syncedLyrics: null,
      plainLyrics: "Hello\nWorld",
    };
    expect(parseLrclibResponse(response)).toBe("Hello\nWorld");
  });

  test("returns empty string when both null", () => {
    const response = {
      syncedLyrics: null,
      plainLyrics: null,
    };
    expect(parseLrclibResponse(response)).toBe("");
  });
});
