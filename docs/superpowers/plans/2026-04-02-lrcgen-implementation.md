# lrcgen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TUI application for creating and editing LRC (synchronized lyrics) files with a plugin architecture.

**Architecture:** Hexagonal (ports & adapters). Core logic has zero dependencies on UI or external tools. Ports define interfaces (AudioSource, AudioPlayer, LyricsProvider, LrcParser). Adapters implement them (ffplay, local files, clipboard, simple LRC). Ink renders the TUI with a state-machine router.

**Tech Stack:** Bun, TypeScript, Ink (React for terminal), ffplay (ffmpeg)

---

## File Map

### Core (pure logic, no side effects)

| File | Responsibility |
|------|---------------|
| `src/core/time-utils.ts` | ms ↔ `[mm:ss.xx]` conversion |
| `src/core/lrc-document.ts` | LrcDocument, LrcLine, LrcMetadata types and factory functions |
| `src/core/sync-engine.ts` | Stateful engine: mark line, undo, skip, track current index |

### Ports (interfaces only)

| File | Responsibility |
|------|---------------|
| `src/ports/audio-player.ts` | AudioPlayer interface |
| `src/ports/audio-source.ts` | AudioSource, AudioRef interfaces |
| `src/ports/lyrics-provider.ts` | LyricsProvider interface |
| `src/ports/lrc-parser.ts` | LrcParser interface |

### Adapters (implementations)

| File | Responsibility |
|------|---------------|
| `src/adapters/lrc-parser/simple-lrc-parser.ts` | Parse/serialize Simple LRC format |
| `src/adapters/audio-player/ffplay-audio-player.ts` | Playback via ffplay subprocess |
| `src/adapters/audio-source/local-audio-source.ts` | File picker, creates FfplayAudioPlayer |
| `src/adapters/lyrics-provider/clipboard-lyrics-provider.ts` | Manual text paste (no-op provider, UI handles input) |

### UI

| File | Responsibility |
|------|---------------|
| `src/registry.ts` | Registry type + createDefaultRegistry() |
| `src/ui/app.tsx` | Root component, state-machine router |
| `src/ui/screens/start-screen.tsx` | Create new / Import existing |
| `src/ui/screens/setup-screen.tsx` | Audio + lyrics + metadata setup |
| `src/ui/screens/play-sync-screen.tsx` | Real-time sync with spacebar |
| `src/ui/screens/edit-screen.tsx` | Fine-tune timestamps, edit text |
| `src/ui/screens/export-screen.tsx` | Preview + save LRC |
| `src/ui/components/progress-bar.tsx` | Audio position bar |
| `src/ui/components/line-list.tsx` | Scrollable line list with current highlight |
| `src/ui/components/key-hints.tsx` | Bottom key hint bar |
| `src/index.ts` | Entry point: registry + render |

### Tests

| File | Tests for |
|------|-----------|
| `src/core/time-utils.test.ts` | time-utils |
| `src/core/lrc-document.test.ts` | lrc-document |
| `src/core/sync-engine.test.ts` | sync-engine |
| `src/adapters/lrc-parser/simple-lrc-parser.test.ts` | simple-lrc-parser |
| `src/ui/screens/start-screen.test.tsx` | start-screen |
| `src/ui/screens/play-sync-screen.test.tsx` | play-sync-screen |
| `src/ui/screens/edit-screen.test.tsx` | edit-screen |
| `src/ui/screens/export-screen.test.tsx` | export-screen |

---

## Task 1: Project Setup — Dependencies and Configuration

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: Install dependencies**

```bash
bun add ink react ink-text-input ink-select-input
```

- [ ] **Step 2: Install dev dependencies**

```bash
bun add -d @types/react ink-testing-library
```

- [ ] **Step 3: Update tsconfig.json for JSX**

Verify `tsconfig.json` has `"jsx": "react-jsx"` (already present from `bun init`). No changes needed.

- [ ] **Step 4: Add scripts to package.json**

Edit `package.json` to add:

```json
{
  "scripts": {
    "start": "bun run src/index.ts",
    "test": "bun test"
  },
  "module": "src/index.ts"
}
```

Replace the existing `"module": "index.ts"` with `"module": "src/index.ts"`.

- [ ] **Step 5: Create directory structure**

```bash
mkdir -p src/core src/ports src/adapters/audio-player src/adapters/audio-source src/adapters/lyrics-provider src/adapters/lrc-parser src/ui/screens src/ui/components
```

- [ ] **Step 6: Delete placeholder index.ts**

```bash
rm index.ts
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: set up project structure and dependencies"
```

---

## Task 2: Core — time-utils (TDD)

**Files:**
- Create: `src/core/time-utils.ts`
- Create: `src/core/time-utils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/core/time-utils.test.ts`:

```typescript
import { test, expect, describe } from "bun:test";
import { msToLrc, lrcToMs, formatPosition } from "./time-utils";

describe("msToLrc", () => {
  test("converts 0ms", () => {
    expect(msToLrc(0)).toBe("00:00.00");
  });

  test("converts simple seconds", () => {
    expect(msToLrc(5000)).toBe("00:05.00");
  });

  test("converts minutes and seconds", () => {
    expect(msToLrc(83450)).toBe("01:23.45");
  });

  test("converts with hundredths", () => {
    expect(msToLrc(12300)).toBe("00:12.30");
  });

  test("converts large values", () => {
    expect(msToLrc(600000)).toBe("10:00.00");
  });

  test("rounds to hundredths", () => {
    expect(msToLrc(12345)).toBe("00:12.35");
  });
});

describe("lrcToMs", () => {
  test("parses 00:00.00", () => {
    expect(lrcToMs("00:00.00")).toBe(0);
  });

  test("parses minutes and seconds", () => {
    expect(lrcToMs("01:23.45")).toBe(83450);
  });

  test("parses seconds only", () => {
    expect(lrcToMs("00:12.30")).toBe(12300);
  });

  test("returns null for invalid format", () => {
    expect(lrcToMs("invalid")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(lrcToMs("")).toBeNull();
  });

  test("parses single-digit hundredths", () => {
    expect(lrcToMs("00:05.03")).toBe(5030);
  });
});

describe("formatPosition", () => {
  test("formats 0ms", () => {
    expect(formatPosition(0)).toBe("00:00.00");
  });

  test("formats minutes and seconds", () => {
    expect(formatPosition(83450)).toBe("01:23.45");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test src/core/time-utils.test.ts
```

Expected: FAIL — module `./time-utils` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/time-utils.ts`:

```typescript
export function msToLrc(ms: number): string {
  const totalHundredths = Math.round(ms / 10);
  const hundredths = totalHundredths % 100;
  const totalSeconds = Math.floor(totalHundredths / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

export function lrcToMs(lrc: string): number | null {
  const match = lrc.match(/^(\d{2,}):(\d{2})\.(\d{2})$/);
  if (!match) return null;

  const minutes = parseInt(match[1]!, 10);
  const seconds = parseInt(match[2]!, 10);
  const hundredths = parseInt(match[3]!, 10);

  return (minutes * 60 + seconds) * 1000 + hundredths * 10;
}

export function formatPosition(ms: number): string {
  return msToLrc(ms);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/core/time-utils.test.ts
```

Expected: all 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/time-utils.ts src/core/time-utils.test.ts && git commit -m "feat: add time-utils for ms/LRC timestamp conversion"
```

---

## Task 3: Core — lrc-document (TDD)

**Files:**
- Create: `src/core/lrc-document.ts`
- Create: `src/core/lrc-document.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/core/lrc-document.test.ts`:

```typescript
import { test, expect, describe } from "bun:test";
import {
  createDocument,
  addLines,
  setTimestamp,
  setLineText,
  setMetadata,
  linesFromText,
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test src/core/lrc-document.test.ts
```

Expected: FAIL — module `./lrc-document` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/lrc-document.ts`:

```typescript
export interface LrcMetadata {
  artist?: string;
  title?: string;
  album?: string;
  tool: string;
  [key: string]: string | undefined;
}

export interface LrcLine {
  timestamp: number | null;
  text: string;
}

export interface LrcDocument {
  metadata: LrcMetadata;
  lines: LrcLine[];
}

const TOOL_URL = "https://github.com/txssu/lrcgen";

export function createDocument(
  metadata?: Partial<Omit<LrcMetadata, "tool">>
): LrcDocument {
  return {
    metadata: { ...metadata, tool: TOOL_URL },
    lines: [],
  };
}

export function linesFromText(text: string): LrcLine[] {
  if (!text) return [];
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => ({ timestamp: null, text: line }));
}

export function addLines(doc: LrcDocument, lines: LrcLine[]): LrcDocument {
  return { ...doc, lines: [...doc.lines, ...lines] };
}

export function setTimestamp(
  doc: LrcDocument,
  index: number,
  timestamp: number | null
): LrcDocument {
  const lines = doc.lines.map((line, i) =>
    i === index ? { ...line, timestamp } : line
  );
  return { ...doc, lines };
}

export function setLineText(
  doc: LrcDocument,
  index: number,
  text: string
): LrcDocument {
  const lines = doc.lines.map((line, i) =>
    i === index ? { ...line, text } : line
  );
  return { ...doc, lines };
}

export function setMetadata(
  doc: LrcDocument,
  updates: Partial<Omit<LrcMetadata, "tool">>
): LrcDocument {
  return {
    ...doc,
    metadata: { ...doc.metadata, ...updates, tool: TOOL_URL },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/core/lrc-document.test.ts
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/lrc-document.ts src/core/lrc-document.test.ts && git commit -m "feat: add lrc-document data model with immutable operations"
```

---

## Task 4: Core — sync-engine (TDD)

**Files:**
- Create: `src/core/sync-engine.ts`
- Create: `src/core/sync-engine.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/core/sync-engine.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test src/core/sync-engine.test.ts
```

Expected: FAIL — module `./sync-engine` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/sync-engine.ts`:

```typescript
import type { LrcDocument } from "./lrc-document";
import { setTimestamp } from "./lrc-document";

interface HistoryEntry {
  index: number;
  previousTimestamp: number | null;
}

export class SyncEngine {
  private _document: LrcDocument;
  private _currentIndex: number = 0;
  private _history: HistoryEntry[] = [];

  constructor(document: LrcDocument) {
    this._document = document;
  }

  get document(): LrcDocument {
    return this._document;
  }

  get currentIndex(): number {
    return this._currentIndex;
  }

  get isComplete(): boolean {
    return this._currentIndex >= this._document.lines.length;
  }

  mark(timestampMs: number): void {
    if (this.isComplete) return;

    const previous = this._document.lines[this._currentIndex]!.timestamp;
    this._history.push({
      index: this._currentIndex,
      previousTimestamp: previous,
    });
    this._document = setTimestamp(
      this._document,
      this._currentIndex,
      timestampMs
    );
    this._currentIndex++;
  }

  skip(): void {
    if (this.isComplete) return;

    this._history.push({
      index: this._currentIndex,
      previousTimestamp: this._document.lines[this._currentIndex]!.timestamp,
    });
    this._currentIndex++;
  }

  undo(): void {
    const entry = this._history.pop();
    if (!entry) return;

    this._document = setTimestamp(
      this._document,
      entry.index,
      entry.previousTimestamp
    );
    this._currentIndex = entry.index;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/core/sync-engine.test.ts
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/sync-engine.ts src/core/sync-engine.test.ts && git commit -m "feat: add sync-engine for real-time line marking"
```

---

## Task 5: Ports — Define All Interfaces

**Files:**
- Create: `src/ports/audio-player.ts`
- Create: `src/ports/audio-source.ts`
- Create: `src/ports/lyrics-provider.ts`
- Create: `src/ports/lrc-parser.ts`

- [ ] **Step 1: Create AudioPlayer port**

Create `src/ports/audio-player.ts`:

```typescript
export interface AudioPlayer {
  play(fromMs?: number): void;
  pause(): void;
  resume(): void;
  seek(ms: number): void;
  getCurrentPosition(): number;
  getDuration(): number;
  onPosition(callback: (ms: number) => void): () => void;
  dispose(): void;
}
```

- [ ] **Step 2: Create AudioSource port**

Create `src/ports/audio-source.ts`:

```typescript
import type { AudioPlayer } from "./audio-player";

export interface AudioRef {
  source: string;
  id: string;
  displayName: string;
}

export interface AudioSource {
  name: string;
  select(): Promise<AudioRef>;
  createPlayer(ref: AudioRef): AudioPlayer;
}
```

- [ ] **Step 3: Create LyricsProvider port**

Create `src/ports/lyrics-provider.ts`:

```typescript
export interface LyricsProvider {
  name: string;
  fetch(query: { artist?: string; title?: string }): Promise<string>;
}
```

- [ ] **Step 4: Create LrcParser port**

Create `src/ports/lrc-parser.ts`:

```typescript
import type { LrcDocument } from "../core/lrc-document";

export interface LrcParser {
  parse(content: string): LrcDocument;
  serialize(doc: LrcDocument): string;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/ports/ && git commit -m "feat: define port interfaces for plugin architecture"
```

---

## Task 6: Adapter — SimpleLrcParser (TDD)

**Files:**
- Create: `src/adapters/lrc-parser/simple-lrc-parser.ts`
- Create: `src/adapters/lrc-parser/simple-lrc-parser.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/adapters/lrc-parser/simple-lrc-parser.test.ts`:

```typescript
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
    expect(output).toContain("[00:01.00]Hello");
    expect(output).toContain("[00:05.00]World");
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test src/adapters/lrc-parser/simple-lrc-parser.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/adapters/lrc-parser/simple-lrc-parser.ts`:

```typescript
import type { LrcParser } from "../../ports/lrc-parser";
import type { LrcDocument, LrcLine, LrcMetadata } from "../../core/lrc-document";
import { createDocument } from "../../core/lrc-document";
import { msToLrc, lrcToMs } from "../../core/time-utils";

const METADATA_TAGS: Record<string, keyof LrcMetadata> = {
  ar: "artist",
  ti: "title",
  al: "album",
};

const REVERSE_TAGS: Record<string, string> = {
  artist: "ar",
  title: "ti",
  album: "al",
};

export class SimpleLrcParser implements LrcParser {
  parse(content: string): LrcDocument {
    const metadata: Partial<Omit<LrcMetadata, "tool">> = {};
    const lines: LrcLine[] = [];

    for (const raw of content.split("\n")) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const metaMatch = trimmed.match(/^\[([a-z]+):(.+)\]$/i);
      if (metaMatch) {
        const tag = metaMatch[1]!.toLowerCase();
        const value = metaMatch[2]!.trim();
        const field = METADATA_TAGS[tag];
        if (field) {
          (metadata as Record<string, string>)[field] = value;
        }
        continue;
      }

      const lineMatch = trimmed.match(/^\[(\d{2,}:\d{2}\.\d{2})\](.*)$/);
      if (lineMatch) {
        const timestamp = lrcToMs(lineMatch[1]!);
        lines.push({ timestamp, text: lineMatch[2]! });
        continue;
      }

      lines.push({ timestamp: null, text: trimmed });
    }

    const doc = createDocument(metadata);
    return { ...doc, lines };
  }

  serialize(doc: LrcDocument): string {
    const parts: string[] = [];

    for (const [field, tag] of Object.entries(REVERSE_TAGS)) {
      const value = doc.metadata[field];
      if (value) {
        parts.push(`[${tag}:${value}]`);
      }
    }

    parts.push(`[tool:${doc.metadata.tool}]`);

    for (const line of doc.lines) {
      if (line.timestamp !== null) {
        parts.push(`[${msToLrc(line.timestamp)}]${line.text}`);
      } else {
        parts.push(line.text);
      }
    }

    return parts.join("\n");
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/adapters/lrc-parser/simple-lrc-parser.test.ts
```

Expected: all 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/lrc-parser/ && git commit -m "feat: add SimpleLrcParser for parsing and serializing LRC files"
```

---

## Task 7: Adapter — FfplayAudioPlayer

**Files:**
- Create: `src/adapters/audio-player/ffplay-audio-player.ts`

This adapter manages a real subprocess and is NOT unit-tested. It will be tested manually.

- [ ] **Step 1: Create FfplayAudioPlayer**

Create `src/adapters/audio-player/ffplay-audio-player.ts`:

```typescript
import type { AudioPlayer } from "../../ports/audio-player";
import type { Subprocess } from "bun";

export class FfplayAudioPlayer implements AudioPlayer {
  private process: Subprocess | null = null;
  private filePath: string;
  private _duration: number = 0;
  private _position: number = 0;
  private _playing: boolean = false;
  private positionCallbacks: Set<(ms: number) => void> = new Set();
  private ticker: ReturnType<typeof setInterval> | null = null;
  private startedAt: number = 0;
  private offsetMs: number = 0;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async init(): Promise<void> {
    const result = await Bun.$`ffprobe -v quiet -print_format json -show_format ${this.filePath}`.json();
    this._duration = Math.round(parseFloat(result.format.duration) * 1000);
  }

  play(fromMs?: number): void {
    this.dispose();
    this.offsetMs = fromMs ?? 0;
    const args = ["-nodisp", "-autoexit", "-loglevel", "quiet"];
    if (this.offsetMs > 0) {
      args.push("-ss", String(this.offsetMs / 1000));
    }
    args.push(this.filePath);

    this.process = Bun.spawn(["ffplay", ...args], {
      stdout: "ignore",
      stderr: "ignore",
    });

    this._playing = true;
    this.startedAt = Date.now();
    this.startTicker();
  }

  pause(): void {
    if (!this._playing || !this.process) return;
    this._position = this.getCurrentPosition();
    this.process.kill("SIGSTOP");
    this._playing = false;
    this.stopTicker();
  }

  resume(): void {
    if (this._playing || !this.process) return;
    this.process.kill("SIGCONT");
    this._playing = true;
    this.offsetMs = this._position;
    this.startedAt = Date.now();
    this.startTicker();
  }

  seek(ms: number): void {
    this.play(ms);
  }

  getCurrentPosition(): number {
    if (!this._playing) return this._position;
    return this.offsetMs + (Date.now() - this.startedAt);
  }

  getDuration(): number {
    return this._duration;
  }

  onPosition(callback: (ms: number) => void): () => void {
    this.positionCallbacks.add(callback);
    return () => {
      this.positionCallbacks.delete(callback);
    };
  }

  dispose(): void {
    this.stopTicker();
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this._playing = false;
  }

  private startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => {
      const pos = this.getCurrentPosition();
      for (const cb of this.positionCallbacks) {
        cb(pos);
      }
    }, 50);
  }

  private stopTicker(): void {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/adapters/audio-player/ && git commit -m "feat: add FfplayAudioPlayer adapter"
```

---

## Task 8: Adapter — LocalAudioSource and ClipboardLyricsProvider

**Files:**
- Create: `src/adapters/audio-source/local-audio-source.ts`
- Create: `src/adapters/lyrics-provider/clipboard-lyrics-provider.ts`

- [ ] **Step 1: Create LocalAudioSource**

Create `src/adapters/audio-source/local-audio-source.ts`:

```typescript
import type { AudioSource, AudioRef } from "../../ports/audio-source";
import type { AudioPlayer } from "../../ports/audio-player";
import { FfplayAudioPlayer } from "../audio-player/ffplay-audio-player";
import path from "node:path";

export class LocalAudioSource implements AudioSource {
  name = "Local File";

  async select(): Promise<AudioRef> {
    // In TUI context, the file path is provided via the UI.
    // This method is called with a path injected by the setup screen.
    throw new Error("Use selectFromPath() instead");
  }

  selectFromPath(filePath: string): AudioRef {
    return {
      source: this.name,
      id: filePath,
      displayName: path.basename(filePath),
    };
  }

  createPlayer(ref: AudioRef): AudioPlayer {
    return new FfplayAudioPlayer(ref.id);
  }
}
```

- [ ] **Step 2: Create ClipboardLyricsProvider**

Create `src/adapters/lyrics-provider/clipboard-lyrics-provider.ts`:

```typescript
import type { LyricsProvider } from "../../ports/lyrics-provider";

export class ClipboardLyricsProvider implements LyricsProvider {
  name = "Paste text";

  async fetch(): Promise<string> {
    // In TUI context, text input is handled by the UI directly.
    // This provider serves as a placeholder in the registry.
    return "";
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/adapters/audio-source/ src/adapters/lyrics-provider/ && git commit -m "feat: add LocalAudioSource and ClipboardLyricsProvider adapters"
```

---

## Task 9: Registry

**Files:**
- Create: `src/registry.ts`

- [ ] **Step 1: Create Registry**

Create `src/registry.ts`:

```typescript
import type { AudioSource } from "./ports/audio-source";
import type { LyricsProvider } from "./ports/lyrics-provider";
import type { LrcParser } from "./ports/lrc-parser";
import { LocalAudioSource } from "./adapters/audio-source/local-audio-source";
import { ClipboardLyricsProvider } from "./adapters/lyrics-provider/clipboard-lyrics-provider";
import { SimpleLrcParser } from "./adapters/lrc-parser/simple-lrc-parser";

export interface Registry {
  audioSources: AudioSource[];
  lyricsProviders: LyricsProvider[];
  lrcParser: LrcParser;
}

export function createDefaultRegistry(): Registry {
  return {
    audioSources: [new LocalAudioSource()],
    lyricsProviders: [new ClipboardLyricsProvider()],
    lrcParser: new SimpleLrcParser(),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/registry.ts && git commit -m "feat: add plugin registry with default adapters"
```

---

## Task 10: UI — Shared Components

**Files:**
- Create: `src/ui/components/progress-bar.tsx`
- Create: `src/ui/components/line-list.tsx`
- Create: `src/ui/components/key-hints.tsx`

- [ ] **Step 1: Create ProgressBar**

Create `src/ui/components/progress-bar.tsx`:

```tsx
import React from "react";
import { Box, Text } from "ink";
import { formatPosition } from "../../core/time-utils";

interface ProgressBarProps {
  currentMs: number;
  durationMs: number;
  width?: number;
}

export function ProgressBar({
  currentMs,
  durationMs,
  width = 30,
}: ProgressBarProps) {
  const ratio = durationMs > 0 ? Math.min(currentMs / durationMs, 1) : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;

  return (
    <Box flexDirection="column">
      <Text>
        {"▶ "}
        {formatPosition(currentMs)} / {formatPosition(durationMs)}
      </Text>
      <Text>
        {"━".repeat(filled)}
        {"░".repeat(empty)}
      </Text>
    </Box>
  );
}
```

- [ ] **Step 2: Create LineList**

Create `src/ui/components/line-list.tsx`:

```tsx
import React from "react";
import { Box, Text } from "ink";
import type { LrcLine } from "../../core/lrc-document";
import { msToLrc } from "../../core/time-utils";

interface LineListProps {
  lines: LrcLine[];
  currentIndex: number;
  visibleCount?: number;
}

export function LineList({
  lines,
  currentIndex,
  visibleCount = 7,
}: LineListProps) {
  const half = Math.floor(visibleCount / 2);
  let start = Math.max(0, currentIndex - half);
  const end = Math.min(lines.length, start + visibleCount);
  if (end - start < visibleCount) {
    start = Math.max(0, end - visibleCount);
  }

  const visible = lines.slice(start, end);

  return (
    <Box flexDirection="column">
      {visible.map((line, i) => {
        const actualIndex = start + i;
        const isCurrent = actualIndex === currentIndex;
        const prefix = isCurrent ? "▸ " : "  ";
        const timeStr =
          line.timestamp !== null
            ? `[${msToLrc(line.timestamp)}]`
            : "[  ?.??  ]";

        return (
          <Text key={actualIndex} bold={isCurrent} color={isCurrent ? "cyan" : undefined}>
            {prefix}
            {timeStr} {line.text}
          </Text>
        );
      })}
    </Box>
  );
}
```

- [ ] **Step 3: Create KeyHints**

Create `src/ui/components/key-hints.tsx`:

```tsx
import React from "react";
import { Text } from "ink";

interface KeyHintsProps {
  hints: Array<{ key: string; label: string }>;
}

export function KeyHints({ hints }: KeyHintsProps) {
  return (
    <Text dimColor>
      {hints.map((h, i) => (
        <Text key={h.key}>
          {i > 0 ? "  " : ""}
          <Text bold>{h.key}</Text> {h.label}
        </Text>
      ))}
    </Text>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/ui/components/ && git commit -m "feat: add shared UI components (ProgressBar, LineList, KeyHints)"
```

---

## Task 11: UI — App Router and Start Screen (TDD)

**Files:**
- Create: `src/ui/app.tsx`
- Create: `src/ui/screens/start-screen.tsx`
- Create: `src/ui/screens/start-screen.test.tsx`

- [ ] **Step 1: Write failing test for StartScreen**

Create `src/ui/screens/start-screen.test.tsx`:

```tsx
import React from "react";
import { test, expect, describe } from "bun:test";
import { render } from "ink-testing-library";
import { StartScreen } from "./start-screen";

describe("StartScreen", () => {
  test("renders title and options", () => {
    const { lastFrame } = render(
      <StartScreen onSelect={() => {}} />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("lrcgen");
    expect(frame).toContain("Create new LRC");
    expect(frame).toContain("Import existing LRC");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/ui/screens/start-screen.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create StartScreen**

Create `src/ui/screens/start-screen.tsx`:

```tsx
import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { KeyHints } from "../components/key-hints";

type StartAction = "create" | "import";

interface StartScreenProps {
  onSelect: (action: StartAction) => void;
}

const items = [
  { label: "Create new LRC", value: "create" as const },
  { label: "Import existing LRC", value: "import" as const },
];

export function StartScreen({ onSelect }: StartScreenProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">
          lrcgen
        </Text>
      </Box>

      <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />

      <Box marginTop={1}>
        <KeyHints
          hints={[
            { key: "↑↓", label: "navigate" },
            { key: "⏎", label: "select" },
          ]}
        />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Create App router**

Create `src/ui/app.tsx`:

```tsx
import React, { useState } from "react";
import type { Registry } from "../registry";
import type { LrcDocument } from "../core/lrc-document";
import type { AudioRef } from "../ports/audio-source";
import { createDocument } from "../core/lrc-document";
import { StartScreen } from "./screens/start-screen";

type Screen =
  | { name: "start" }
  | { name: "setup" }
  | { name: "play-sync" }
  | { name: "edit" }
  | { name: "export" };

interface AppProps {
  registry: Registry;
}

export function App({ registry }: AppProps) {
  const [screen, setScreen] = useState<Screen>({ name: "start" });
  const [document, setDocument] = useState<LrcDocument>(createDocument());
  const [audioRef, setAudioRef] = useState<AudioRef | null>(null);

  switch (screen.name) {
    case "start":
      return (
        <StartScreen
          onSelect={(action) => {
            if (action === "create") {
              setScreen({ name: "setup" });
            } else {
              setScreen({ name: "edit" });
            }
          }}
        />
      );
    default:
      return null;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
bun test src/ui/screens/start-screen.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/app.tsx src/ui/screens/start-screen.tsx src/ui/screens/start-screen.test.tsx && git commit -m "feat: add App router and StartScreen"
```

---

## Task 12: UI — Setup Screen

**Files:**
- Create: `src/ui/screens/setup-screen.tsx`

- [ ] **Step 1: Create SetupScreen**

Create `src/ui/screens/setup-screen.tsx`:

```tsx
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Registry } from "../../registry";
import type { AudioRef } from "../../ports/audio-source";
import type { LrcDocument, LrcMetadata } from "../../core/lrc-document";
import { linesFromText, addLines, setMetadata } from "../../core/lrc-document";
import { LocalAudioSource } from "../../adapters/audio-source/local-audio-source";
import { KeyHints } from "../components/key-hints";

interface SetupScreenProps {
  registry: Registry;
  document: LrcDocument;
  audioRef: AudioRef | null;
  onDocumentChange: (doc: LrcDocument) => void;
  onAudioRefChange: (ref: AudioRef) => void;
  onStartSync: () => void;
  onQuit: () => void;
}

type Mode = "menu" | "audio-path" | "lyrics-paste" | "edit-metadata";
type MetadataField = "artist" | "title" | "album";

const MENU_ITEMS = [
  "Select audio",
  "Paste lyrics",
  "Edit metadata",
  "Start sync →",
] as const;

export function SetupScreen({
  registry,
  document,
  audioRef,
  onDocumentChange,
  onAudioRefChange,
  onStartSync,
  onQuit,
}: SetupScreenProps) {
  const [mode, setMode] = useState<Mode>("menu");
  const [menuIndex, setMenuIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [metadataField, setMetadataField] = useState<MetadataField>("artist");

  const hasAudio = audioRef !== null;
  const hasLyrics = document.lines.length > 0;
  const canSync = hasAudio && hasLyrics;

  useInput((input, key) => {
    if (mode !== "menu") return;

    if (key.upArrow) {
      setMenuIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setMenuIndex((i) => Math.min(MENU_ITEMS.length - 1, i + 1));
    } else if (key.return) {
      switch (menuIndex) {
        case 0:
          setMode("audio-path");
          setInputValue("");
          break;
        case 1:
          setMode("lyrics-paste");
          setInputValue("");
          break;
        case 2:
          setMode("edit-metadata");
          setMetadataField("artist");
          setInputValue(document.metadata.artist ?? "");
          break;
        case 3:
          if (canSync) onStartSync();
          break;
      }
    } else if (input === "q") {
      onQuit();
    }
  });

  if (mode === "audio-path") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Enter audio file path:</Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={(value) => {
            const source = registry.audioSources[0] as LocalAudioSource;
            const ref = source.selectFromPath(value);
            onAudioRefChange(ref);
            setMode("menu");
          }}
        />
      </Box>
    );
  }

  if (mode === "lyrics-paste") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Paste lyrics (press Enter twice to finish):</Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={(value) => {
            if (value.trim()) {
              const lines = linesFromText(value);
              onDocumentChange(addLines(document, lines));
            }
            setMode("menu");
          }}
        />
      </Box>
    );
  }

  if (mode === "edit-metadata") {
    const fields: MetadataField[] = ["artist", "title", "album"];
    return (
      <Box flexDirection="column" padding={1}>
        <Text>
          {metadataField.charAt(0).toUpperCase() + metadataField.slice(1)}:
        </Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={(value) => {
            const updated = setMetadata(document, { [metadataField]: value });
            onDocumentChange(updated);
            const currentIdx = fields.indexOf(metadataField);
            if (currentIdx < fields.length - 1) {
              const next = fields[currentIdx + 1]!;
              setMetadataField(next);
              setInputValue(document.metadata[next] ?? "");
            } else {
              setMode("menu");
            }
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} flexDirection="column">
        <Text>
          Audio: {audioRef ? audioRef.displayName : "not selected"}{" "}
          {hasAudio ? <Text color="green">✓</Text> : ""}
        </Text>
        <Text>
          Lyrics: {document.lines.length} lines{" "}
          {hasLyrics ? <Text color="green">✓</Text> : ""}
        </Text>
        {document.metadata.artist && (
          <Text dimColor>  Artist: {document.metadata.artist}</Text>
        )}
        {document.metadata.title && (
          <Text dimColor>  Title: {document.metadata.title}</Text>
        )}
        {document.metadata.album && (
          <Text dimColor>  Album: {document.metadata.album}</Text>
        )}
      </Box>

      <Box flexDirection="column">
        {MENU_ITEMS.map((item, i) => {
          const isCurrent = i === menuIndex;
          const isDisabled = i === 3 && !canSync;
          return (
            <Text
              key={item}
              color={isDisabled ? "gray" : isCurrent ? "cyan" : undefined}
              bold={isCurrent}
            >
              {isCurrent ? "▸ " : "  "}
              {item}
            </Text>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <KeyHints
          hints={[
            { key: "↑↓", label: "navigate" },
            { key: "⏎", label: "select" },
            { key: "q", label: "quit" },
          ]}
        />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Wire SetupScreen into App**

Edit `src/ui/app.tsx` — replace the entire file:

```tsx
import React, { useState } from "react";
import type { Registry } from "../registry";
import type { LrcDocument } from "../core/lrc-document";
import type { AudioRef } from "../ports/audio-source";
import { createDocument } from "../core/lrc-document";
import { StartScreen } from "./screens/start-screen";
import { SetupScreen } from "./screens/setup-screen";

type Screen =
  | { name: "start" }
  | { name: "setup" }
  | { name: "play-sync" }
  | { name: "edit" }
  | { name: "export" };

interface AppProps {
  registry: Registry;
}

export function App({ registry }: AppProps) {
  const [screen, setScreen] = useState<Screen>({ name: "start" });
  const [document, setDocument] = useState<LrcDocument>(createDocument());
  const [audioRef, setAudioRef] = useState<AudioRef | null>(null);

  switch (screen.name) {
    case "start":
      return (
        <StartScreen
          onSelect={(action) => {
            if (action === "create") {
              setScreen({ name: "setup" });
            } else {
              setScreen({ name: "edit" });
            }
          }}
        />
      );
    case "setup":
      return (
        <SetupScreen
          registry={registry}
          document={document}
          audioRef={audioRef}
          onDocumentChange={setDocument}
          onAudioRefChange={setAudioRef}
          onStartSync={() => setScreen({ name: "play-sync" })}
          onQuit={() => process.exit(0)}
        />
      );
    default:
      return null;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/screens/setup-screen.tsx src/ui/app.tsx && git commit -m "feat: add SetupScreen with audio/lyrics/metadata input"
```

---

## Task 13: UI — PlaySync Screen (TDD)

**Files:**
- Create: `src/ui/screens/play-sync-screen.tsx`
- Create: `src/ui/screens/play-sync-screen.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/ui/screens/play-sync-screen.test.tsx`:

```tsx
import React from "react";
import { test, expect, describe } from "bun:test";
import { render } from "ink-testing-library";
import { PlaySyncScreen } from "./play-sync-screen";
import { createDocument, addLines, linesFromText } from "../../core/lrc-document";

const doc = addLines(createDocument(), linesFromText("Line A\nLine B\nLine C"));

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

describe("PlaySyncScreen", () => {
  test("renders lines", () => {
    const { lastFrame } = render(
      <PlaySyncScreen
        document={doc}
        player={noopPlayer}
        onComplete={() => {}}
      />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("Line A");
    expect(frame).toContain("Line B");
    expect(frame).toContain("Line C");
  });

  test("shows first line as current", () => {
    const { lastFrame } = render(
      <PlaySyncScreen
        document={doc}
        player={noopPlayer}
        onComplete={() => {}}
      />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("▸");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/ui/screens/play-sync-screen.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create PlaySyncScreen**

Create `src/ui/screens/play-sync-screen.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from "react";
import { Box, useInput } from "ink";
import type { LrcDocument } from "../../core/lrc-document";
import type { AudioPlayer } from "../../ports/audio-player";
import { SyncEngine } from "../../core/sync-engine";
import { ProgressBar } from "../components/progress-bar";
import { LineList } from "../components/line-list";
import { KeyHints } from "../components/key-hints";

interface PlaySyncScreenProps {
  document: LrcDocument;
  player: AudioPlayer;
  onComplete: (doc: LrcDocument) => void;
}

export function PlaySyncScreen({
  document,
  player,
  onComplete,
}: PlaySyncScreenProps) {
  const [engine] = useState(() => new SyncEngine(document));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [doc, setDoc] = useState(document);
  const [positionMs, setPositionMs] = useState(0);

  useEffect(() => {
    player.play();
    const unsub = player.onPosition((ms) => setPositionMs(ms));
    return () => {
      unsub();
    };
  }, [player]);

  const syncState = useCallback(() => {
    setCurrentIndex(engine.currentIndex);
    setDoc(engine.document);
  }, [engine]);

  useInput((input, key) => {
    if (input === " ") {
      engine.mark(player.getCurrentPosition());
      syncState();
      if (engine.isComplete) {
        player.pause();
        onComplete(engine.document);
      }
    } else if (key.return) {
      engine.skip();
      syncState();
      if (engine.isComplete) {
        player.pause();
        onComplete(engine.document);
      }
    } else if (key.backspace || key.delete) {
      engine.undo();
      syncState();
    } else if (input === "q") {
      player.pause();
      onComplete(engine.document);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <ProgressBar
        currentMs={positionMs}
        durationMs={player.getDuration()}
      />

      <Box marginY={1}>
        <LineList lines={doc.lines} currentIndex={currentIndex} />
      </Box>

      <KeyHints
        hints={[
          { key: "␣", label: "mark" },
          { key: "⏎", label: "skip" },
          { key: "⌫", label: "undo" },
          { key: "q", label: "done" },
        ]}
      />
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/ui/screens/play-sync-screen.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/play-sync-screen.tsx src/ui/screens/play-sync-screen.test.tsx && git commit -m "feat: add PlaySyncScreen for real-time lyric marking"
```

---

## Task 14: UI — Edit Screen (TDD)

**Files:**
- Create: `src/ui/screens/edit-screen.tsx`
- Create: `src/ui/screens/edit-screen.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/ui/screens/edit-screen.test.tsx`:

```tsx
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
      <EditScreen
        document={makeDoc()}
        player={noopPlayer}
        onDocumentChange={() => {}}
        onResync={() => {}}
        onExport={() => {}}
      />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("00:01.00");
    expect(frame).toContain("Line A");
    expect(frame).toContain("00:05.00");
    expect(frame).toContain("Line B");
  });

  test("shows first line as current", () => {
    const { lastFrame } = render(
      <EditScreen
        document={makeDoc()}
        player={noopPlayer}
        onDocumentChange={() => {}}
        onResync={() => {}}
        onExport={() => {}}
      />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("▸");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/ui/screens/edit-screen.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create EditScreen**

Create `src/ui/screens/edit-screen.tsx`:

```tsx
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { LrcDocument } from "../../core/lrc-document";
import type { AudioPlayer } from "../../ports/audio-player";
import { setTimestamp, setLineText } from "../../core/lrc-document";
import { lrcToMs } from "../../core/time-utils";
import { ProgressBar } from "../components/progress-bar";
import { LineList } from "../components/line-list";
import { KeyHints } from "../components/key-hints";

interface EditScreenProps {
  document: LrcDocument;
  player: AudioPlayer;
  onDocumentChange: (doc: LrcDocument) => void;
  onResync: () => void;
  onExport: () => void;
}

type Mode = "navigate" | "edit-text" | "set-time";

const STEP_OPTIONS = [10, 50, 100, 200, 500, 1000];

export function EditScreen({
  document,
  player,
  onDocumentChange,
  onResync,
  onExport,
}: EditScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("navigate");
  const [inputValue, setInputValue] = useState("");
  const [stepIndex, setStepIndex] = useState(2); // 100ms default
  const [positionMs, setPositionMs] = useState(0);

  const step = STEP_OPTIONS[stepIndex]!;
  const currentLine = document.lines[currentIndex];

  React.useEffect(() => {
    const unsub = player.onPosition((ms) => setPositionMs(ms));
    return unsub;
  }, [player]);

  useInput((input, key) => {
    if (mode !== "navigate") return;

    if (key.upArrow) {
      setCurrentIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setCurrentIndex((i) => Math.min(document.lines.length - 1, i + 1));
    } else if (key.leftArrow && currentLine?.timestamp !== null) {
      const newTs = Math.max(0, (currentLine?.timestamp ?? 0) - step);
      onDocumentChange(setTimestamp(document, currentIndex, newTs));
    } else if (key.rightArrow && currentLine?.timestamp !== null) {
      const newTs = (currentLine?.timestamp ?? 0) + step;
      onDocumentChange(setTimestamp(document, currentIndex, newTs));
    } else if (key.return) {
      if (currentLine?.timestamp !== null) {
        const nextLine = document.lines[currentIndex + 1];
        const endMs = nextLine?.timestamp ?? (currentLine.timestamp! + 5000);
        player.play(currentLine.timestamp!);
        setTimeout(() => player.pause(), endMs - currentLine.timestamp!);
      }
    } else if (input === "e") {
      setInputValue(currentLine?.text ?? "");
      setMode("edit-text");
    } else if (input === "t") {
      setInputValue("");
      setMode("set-time");
    } else if (input === "[") {
      setStepIndex((i) => Math.max(0, i - 1));
    } else if (input === "]") {
      setStepIndex((i) => Math.min(STEP_OPTIONS.length - 1, i + 1));
    } else if (input === "r") {
      onResync();
    } else if (input === "q") {
      onExport();
    }
  });

  if (mode === "edit-text") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Edit text:</Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={(value) => {
            onDocumentChange(setLineText(document, currentIndex, value));
            setMode("navigate");
          }}
        />
      </Box>
    );
  }

  if (mode === "set-time") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Enter time (mm:ss.xx):</Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={(value) => {
            const ms = lrcToMs(value);
            if (ms !== null) {
              onDocumentChange(setTimestamp(document, currentIndex, ms));
            }
            setMode("navigate");
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <ProgressBar currentMs={positionMs} durationMs={player.getDuration()} />

      <Box marginY={1}>
        <LineList lines={document.lines} currentIndex={currentIndex} />
      </Box>

      <Text dimColor>Step: {step}ms</Text>

      <KeyHints
        hints={[
          { key: "←→", label: `±${step}ms` },
          { key: "⏎", label: "play line" },
          { key: "e", label: "edit" },
          { key: "t", label: "set time" },
          { key: "[]", label: "step size" },
          { key: "r", label: "re-sync" },
          { key: "q", label: "done" },
        ]}
      />
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/ui/screens/edit-screen.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/edit-screen.tsx src/ui/screens/edit-screen.test.tsx && git commit -m "feat: add EditScreen with timestamp adjustment and text editing"
```

---

## Task 15: UI — Export Screen (TDD)

**Files:**
- Create: `src/ui/screens/export-screen.tsx`
- Create: `src/ui/screens/export-screen.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/ui/screens/export-screen.test.tsx`:

```tsx
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
      <ExportScreen
        document={makeDoc()}
        lrcParser={new SimpleLrcParser()}
        defaultPath="~/song.lrc"
        onBack={() => {}}
        onSaved={() => {}}
      />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("[00:01.00]Line A");
    expect(frame).toContain("[00:05.00]Line B");
  });

  test("shows save path", () => {
    const { lastFrame } = render(
      <ExportScreen
        document={makeDoc()}
        lrcParser={new SimpleLrcParser()}
        defaultPath="~/song.lrc"
        onBack={() => {}}
        onSaved={() => {}}
      />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("song.lrc");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/ui/screens/export-screen.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create ExportScreen**

Create `src/ui/screens/export-screen.tsx`:

```tsx
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { LrcDocument } from "../../core/lrc-document";
import type { LrcParser } from "../../ports/lrc-parser";
import { KeyHints } from "../components/key-hints";

interface ExportScreenProps {
  document: LrcDocument;
  lrcParser: LrcParser;
  defaultPath: string;
  onBack: () => void;
  onSaved: (path: string) => void;
}

type Mode = "preview" | "edit-path";

export function ExportScreen({
  document,
  lrcParser,
  defaultPath,
  onBack,
  onSaved,
}: ExportScreenProps) {
  const [mode, setMode] = useState<Mode>("preview");
  const [savePath, setSavePath] = useState(defaultPath);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = lrcParser.serialize(document);
  const unsynced = document.lines.filter((l) => l.timestamp === null).length;

  useInput((input, key) => {
    if (mode !== "preview") return;

    if (key.return) {
      try {
        const resolvedPath = savePath.replace(/^~/, Bun.env.HOME ?? "");
        Bun.write(resolvedPath, preview);
        setSaved(true);
        onSaved(resolvedPath);
      } catch (e) {
        setError(String(e));
      }
    } else if (input === "e") {
      setMode("edit-path");
    } else if (key.leftArrow || key.escape) {
      onBack();
    }
  });

  if (mode === "edit-path") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Save to:</Text>
        <TextInput
          value={savePath}
          onChange={setSavePath}
          onSubmit={() => setMode("preview")}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Preview:</Text>
      <Box flexDirection="column" marginY={1}>
        {preview.split("\n").map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>

      {unsynced > 0 && (
        <Text color="yellow">
          ⚠ {unsynced} line{unsynced > 1 ? "s" : ""} without timestamps
        </Text>
      )}

      <Box marginTop={1}>
        <Text>Save to: {savePath}</Text>
      </Box>

      {saved && <Text color="green">Saved!</Text>}
      {error && <Text color="red">{error}</Text>}

      <Box marginTop={1}>
        <KeyHints
          hints={[
            { key: "⏎", label: "save" },
            { key: "e", label: "edit path" },
            { key: "←", label: "back" },
          ]}
        />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/ui/screens/export-screen.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/export-screen.tsx src/ui/screens/export-screen.test.tsx && git commit -m "feat: add ExportScreen with LRC preview and file save"
```

---

## Task 16: Wire All Screens into App Router

**Files:**
- Modify: `src/ui/app.tsx`

- [ ] **Step 1: Update App with all screen transitions**

Replace `src/ui/app.tsx` entirely:

```tsx
import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { Registry } from "../registry";
import type { LrcDocument } from "../core/lrc-document";
import type { AudioRef } from "../ports/audio-source";
import type { AudioPlayer } from "../ports/audio-player";
import { createDocument } from "../core/lrc-document";
import { StartScreen } from "./screens/start-screen";
import { SetupScreen } from "./screens/setup-screen";
import { PlaySyncScreen } from "./screens/play-sync-screen";
import { EditScreen } from "./screens/edit-screen";
import { ExportScreen } from "./screens/export-screen";
import { FfplayAudioPlayer } from "../adapters/audio-player/ffplay-audio-player";
import path from "node:path";

type Screen =
  | { name: "start" }
  | { name: "setup" }
  | { name: "play-sync" }
  | { name: "edit" }
  | { name: "export" };

interface AppProps {
  registry: Registry;
  initialDocument?: LrcDocument;
  initialScreen?: Screen;
}

export function App({ registry, initialDocument, initialScreen }: AppProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen ?? { name: "start" });
  const [document, setDocument] = useState<LrcDocument>(
    initialDocument ?? createDocument()
  );
  const [audioRef, setAudioRef] = useState<AudioRef | null>(null);
  const [player, setPlayer] = useState<AudioPlayer | null>(null);

  useEffect(() => {
    return () => {
      player?.dispose();
    };
  }, [player]);

  async function initPlayer(ref: AudioRef) {
    player?.dispose();
    const source = registry.audioSources.find((s) => s.name === ref.source) ?? registry.audioSources[0]!;
    const newPlayer = source.createPlayer(ref);
    if (newPlayer instanceof FfplayAudioPlayer) {
      await newPlayer.init();
    }
    setPlayer(newPlayer);
    return newPlayer;
  }

  switch (screen.name) {
    case "start":
      return (
        <StartScreen
          onSelect={(action) => {
            if (action === "create") {
              setScreen({ name: "setup" });
            } else {
              // Import: for now go to edit with empty doc
              // The setup screen handles import via file path
              setScreen({ name: "setup" });
            }
          }}
        />
      );

    case "setup":
      return (
        <SetupScreen
          registry={registry}
          document={document}
          audioRef={audioRef}
          onDocumentChange={setDocument}
          onAudioRefChange={(ref) => {
            setAudioRef(ref);
            initPlayer(ref);
          }}
          onStartSync={() => setScreen({ name: "play-sync" })}
          onQuit={() => process.exit(0)}
        />
      );

    case "play-sync":
      if (!player) {
        return <Text color="red">No audio player available</Text>;
      }
      return (
        <PlaySyncScreen
          document={document}
          player={player}
          onComplete={(doc) => {
            setDocument(doc);
            setScreen({ name: "edit" });
          }}
        />
      );

    case "edit":
      if (!player) {
        return <Text color="red">No audio player available</Text>;
      }
      return (
        <EditScreen
          document={document}
          player={player}
          onDocumentChange={setDocument}
          onResync={() => setScreen({ name: "play-sync" })}
          onExport={() => setScreen({ name: "export" })}
        />
      );

    case "export": {
      const defaultPath = audioRef
        ? audioRef.id.replace(/\.[^.]+$/, ".lrc")
        : "output.lrc";
      return (
        <ExportScreen
          document={document}
          lrcParser={registry.lrcParser}
          defaultPath={defaultPath}
          onBack={() => setScreen({ name: "edit" })}
          onSaved={(p) => {
            // Stay on export screen, show saved state
          }}
        />
      );
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/app.tsx && git commit -m "feat: wire all screens into App state-machine router"
```

---

## Task 17: Entry Point + ffplay Check

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create entry point**

Create `src/index.ts`:

```tsx
import React from "react";
import { render } from "ink";
import { App } from "./ui/app";
import { createDefaultRegistry } from "./registry";

async function checkFfplay(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["ffplay", "-version"], {
      stdout: "ignore",
      stderr: "ignore",
    });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

async function main() {
  const hasFfplay = await checkFfplay();
  if (!hasFfplay) {
    console.error(
      "ffplay not found. Install ffmpeg: https://ffmpeg.org/download.html"
    );
    process.exit(1);
  }

  const registry = createDefaultRegistry();
  render(React.createElement(App, { registry }));
}

main();
```

- [ ] **Step 2: Verify the app starts**

```bash
bun run src/index.ts
```

Expected: Start screen renders with "Create new LRC" and "Import existing LRC".

- [ ] **Step 3: Commit**

```bash
git add src/index.ts && git commit -m "feat: add entry point with ffplay check"
```

---

## Task 18: LRC Import Support

**Files:**
- Modify: `src/ui/screens/start-screen.tsx`
- Modify: `src/ui/app.tsx`

- [ ] **Step 1: Update App to handle import flow**

In `src/ui/app.tsx`, update the `"start"` case to distinguish create vs import. When "import" is selected, transition to a state where the user provides an LRC file path, parse it, then go to Edit.

Add an `"import"` screen variant to the Screen type:

```typescript
type Screen =
  | { name: "start" }
  | { name: "import" }
  | { name: "setup" }
  | { name: "play-sync" }
  | { name: "edit" }
  | { name: "export" };
```

Create `src/ui/screens/import-screen.tsx`:

```tsx
import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import type { LrcParser } from "../../ports/lrc-parser";
import type { LrcDocument } from "../../core/lrc-document";

interface ImportScreenProps {
  lrcParser: LrcParser;
  onImport: (doc: LrcDocument) => void;
}

export function ImportScreen({ lrcParser, onImport }: ImportScreenProps) {
  const [filePath, setFilePath] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Box flexDirection="column" padding={1}>
      <Text>Enter LRC file path:</Text>
      <TextInput
        value={filePath}
        onChange={setFilePath}
        onSubmit={async (value) => {
          try {
            const resolved = value.replace(/^~/, Bun.env.HOME ?? "");
            const content = await Bun.file(resolved).text();
            onImport(lrcParser.parse(content));
          } catch (e) {
            setError(`Failed to read file: ${e}`);
          }
        }}
      />
      {error && <Text color="red">{error}</Text>}
    </Box>
  );
}
```

Add the import case to App's switch:

```tsx
case "import":
  return (
    <ImportScreen
      lrcParser={registry.lrcParser}
      onImport={(doc) => {
        setDocument(doc);
        setScreen({ name: "edit" });
      }}
    />
  );
```

Update `"start"` case:

```tsx
case "start":
  return (
    <StartScreen
      onSelect={(action) => {
        if (action === "create") {
          setScreen({ name: "setup" });
        } else {
          setScreen({ name: "import" });
        }
      }}
    />
  );
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/screens/import-screen.tsx src/ui/app.tsx && git commit -m "feat: add LRC import flow from Start screen"
```

---

## Task 19: Run All Tests

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

```bash
bun test
```

Expected: All tests pass.

- [ ] **Step 2: Fix any failures**

If any tests fail, fix them and re-run.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve test failures"
```

(Skip if no fixes needed.)

---

## Task 20: README.md

**Files:**
- Create: `README.md` (overwrite existing placeholder)

- [ ] **Step 1: Write README.md**

```markdown
# lrcgen

A terminal app for making LRC files — the kind that sync lyrics to music.

You bring the audio and the lyrics, tap spacebar in time with the song, and lrcgen writes the timestamps for you. Then fine-tune whatever needs fixing and export.

## What it does

- Load any audio file your system's ffmpeg can handle
- Paste in lyrics and sync them line-by-line in real time
- Adjust timestamps after the fact — shift by milliseconds or type exact values
- Import existing LRC files to edit them
- Export clean Simple LRC

## Install

You need [Bun](https://bun.sh) and [ffmpeg](https://ffmpeg.org/download.html) (for `ffplay`).

```bash
git clone https://github.com/txssu/lrcgen.git
cd lrcgen
bun install
```

## Usage

```bash
bun run start
```

### Workflow

1. Pick "Create new LRC" or "Import existing LRC"
2. Point it at an audio file and paste your lyrics
3. Hit spacebar to mark each line as the song plays
4. Switch to the editor to fix anything that's off — arrow keys nudge timestamps, or type them in directly
5. Export to `.lrc`

### Keyboard shortcuts

**Sync mode:**
| Key | Action |
|-----|--------|
| Space | Mark current line |
| Enter | Skip line |
| Backspace | Undo last mark |
| q | Finish |

**Edit mode:**
| Key | Action |
|-----|--------|
| Up/Down | Navigate lines |
| Left/Right | Shift timestamp ±step |
| `[` / `]` | Change step size |
| Enter | Play current line |
| e | Edit line text |
| t | Type exact timestamp |
| r | Re-sync from scratch |
| q | Export |

## Architecture

Plugin-based. Audio sources, lyrics providers, and the LRC parser are all swappable through a port/adapter pattern. The default setup uses ffplay for audio and supports local files, but the system is built so you could plug in Spotify, Genius lyrics, or whatever else without touching the core.

## License

AGPL-3.0
```

- [ ] **Step 2: Commit**

```bash
git add README.md && git commit -m "docs: add README"
```

---

## Task 21: Humanize README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Invoke the humanizer skill on README.md**

Use the `humanizer` skill to review and clean up the README, removing any patterns that read as AI-generated.

- [ ] **Step 2: Apply humanizer suggestions**

Edit README.md with the humanizer's output.

- [ ] **Step 3: Commit**

```bash
git add README.md && git commit -m "docs: humanize README"
```

---

## Task 22: Add AGPL-3.0 License

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Create LICENSE file**

Fetch the AGPL-3.0 license text and write it to `LICENSE` with the correct copyright year and holder.

- [ ] **Step 2: Commit**

```bash
git add LICENSE && git commit -m "chore: add AGPL-3.0 license"
```
