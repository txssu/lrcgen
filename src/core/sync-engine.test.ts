import { test, expect, describe } from "bun:test";
import { SyncEngine } from "./sync-engine";
import { createDocument, addLines, linesFromText } from "./lrc-document";

function makeDoc(text: string) {
  return addLines(createDocument(), linesFromText(text));
}

describe("SyncEngine", () => {
  test("starts at index 0", () => {
    const engine = new SyncEngine(makeDoc("A\nB\nC"));
    expect(engine.currentIndex).toBe(0);
  });
  test("mark sets timestamp and advances", () => {
    const engine = new SyncEngine(makeDoc("A\nB\nC"));
    engine.mark(1000);
    expect(engine.document.lines[0]!.timestamp).toBe(1000);
    expect(engine.currentIndex).toBe(1);
  });
  test("skip advances without setting timestamp", () => {
    const engine = new SyncEngine(makeDoc("A\nB\nC"));
    engine.skip();
    expect(engine.document.lines[0]!.timestamp).toBeNull();
    expect(engine.currentIndex).toBe(1);
  });
  test("undo reverts last mark and moves back", () => {
    const engine = new SyncEngine(makeDoc("A\nB\nC"));
    engine.mark(1000);
    engine.mark(2000);
    engine.undo();
    expect(engine.currentIndex).toBe(1);
    expect(engine.document.lines[1]!.timestamp).toBeNull();
  });
  test("undo reverts last skip", () => {
    const engine = new SyncEngine(makeDoc("A\nB\nC"));
    engine.mark(1000);
    engine.skip();
    engine.undo();
    expect(engine.currentIndex).toBe(1);
    expect(engine.document.lines[1]!.timestamp).toBeNull();
  });
  test("undo does nothing at index 0", () => {
    const engine = new SyncEngine(makeDoc("A\nB\nC"));
    engine.undo();
    expect(engine.currentIndex).toBe(0);
  });
  test("isComplete returns true when all lines processed", () => {
    const engine = new SyncEngine(makeDoc("A\nB"));
    expect(engine.isComplete).toBe(false);
    engine.mark(1000);
    expect(engine.isComplete).toBe(false);
    engine.mark(2000);
    expect(engine.isComplete).toBe(true);
  });
  test("mark does nothing when complete", () => {
    const engine = new SyncEngine(makeDoc("A"));
    engine.mark(1000);
    engine.mark(2000);
    expect(engine.currentIndex).toBe(1);
    expect(engine.document.lines).toHaveLength(1);
  });
});
