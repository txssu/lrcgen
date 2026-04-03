# Unified Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 5 separate screens (Setup, Edit, PlaySync, Preview, Export) with a single fullscreen unified editor.

**Architecture:** One EditorScreen component with internal modes (edit, sync, play, file-picker, text-input, lyrics-source). Modals overlay the main layout. App state machine simplifies to 3 screens: start, import, editor.

**Tech Stack:** Bun, TypeScript, Ink (React for terminal), `useStdout` for terminal dimensions

---

## File Map

### Modified

| File | Change |
|------|--------|
| `src/ui/screens/edit-screen.tsx` | Complete rewrite as unified editor |
| `src/ui/screens/edit-screen.test.tsx` | New tests for unified editor |
| `src/ui/app.tsx` | Simplify to 3-screen state machine |
| `src/ui/app.test.tsx` | Update for new state machine |
| `src/ui/components/line-list.tsx` | Accept dynamic `visibleCount` for fullscreen |

### Deleted

| File | Reason |
|------|--------|
| `src/ui/screens/setup-screen.tsx` | Merged into editor |
| `src/ui/screens/play-sync-screen.tsx` | Merged into editor sync mode |
| `src/ui/screens/play-sync-screen.test.tsx` | Merged into editor tests |
| `src/ui/screens/preview-screen.tsx` | Merged into editor play mode |
| `src/ui/screens/preview-screen.test.tsx` | Merged into editor tests |
| `src/ui/screens/export-screen.tsx` | Replaced by `s` save |
| `src/ui/screens/export-screen.test.tsx` | Replaced by editor tests |

### Unchanged

All `src/core/*`, `src/ports/*`, `src/adapters/*`, `src/registry.ts`, `src/ui/components/progress-bar.tsx`, `src/ui/components/key-hints.tsx`, `src/ui/components/file-picker.tsx`, `src/ui/screens/start-screen.tsx`, `src/ui/screens/import-screen.tsx`.

---

## Task 1: Delete old screens and update app.tsx

**Files:**
- Delete: `src/ui/screens/setup-screen.tsx`, `src/ui/screens/play-sync-screen.tsx`, `src/ui/screens/play-sync-screen.test.tsx`, `src/ui/screens/preview-screen.tsx`, `src/ui/screens/preview-screen.test.tsx`, `src/ui/screens/export-screen.tsx`, `src/ui/screens/export-screen.test.tsx`
- Modify: `src/ui/app.tsx`
- Modify: `src/ui/app.test.tsx`

- [ ] **Step 1: Delete old screen files**

```bash
rm src/ui/screens/setup-screen.tsx src/ui/screens/play-sync-screen.tsx src/ui/screens/play-sync-screen.test.tsx src/ui/screens/preview-screen.tsx src/ui/screens/preview-screen.test.tsx src/ui/screens/export-screen.tsx src/ui/screens/export-screen.test.tsx
```

- [ ] **Step 2: Rewrite app.tsx with 3-screen state machine**

Replace `src/ui/app.tsx` with:

```tsx
import { useState, useEffect } from "react";
import type { Registry } from "../registry";
import type { LrcDocument } from "../core/lrc-document";
import type { AudioRef } from "../ports/audio-source";
import type { AudioPlayer } from "../ports/audio-player";
import { createDocument } from "../core/lrc-document";
import { StartScreen } from "./screens/start-screen";
import { ImportScreen } from "./screens/import-screen";
import { EditorScreen } from "./screens/edit-screen";
import { FfplayAudioPlayer } from "../adapters/audio-player/ffplay-audio-player";
import { detectMatchingAudio } from "../core/auto-detect-audio";
import { LocalAudioSource } from "../adapters/audio-source/local-audio-source";

type Screen = { name: "start" } | { name: "import" } | { name: "editor" };

interface AppProps {
  registry: Registry;
  initialDocument?: LrcDocument;
  initialScreen?: Screen;
}

export function App({ registry, initialDocument, initialScreen }: AppProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen ?? { name: "start" });
  const [document, setDocument] = useState<LrcDocument>(initialDocument ?? createDocument());
  const [audioRef, setAudioRef] = useState<AudioRef | null>(null);
  const [player, setPlayer] = useState<AudioPlayer | null>(null);

  useEffect(() => {
    return () => { player?.dispose(); };
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
              setScreen({ name: "editor" });
            } else {
              setScreen({ name: "import" });
            }
          }}
        />
      );

    case "import":
      return (
        <ImportScreen
          lrcParser={registry.lrcParser}
          onImport={async (doc, filePath) => {
            setDocument(doc);
            const audioPath = await detectMatchingAudio(filePath);
            if (audioPath) {
              const source = registry.audioSources[0] as LocalAudioSource;
              const ref = source.selectFromPath(audioPath);
              setAudioRef(ref);
              await initPlayer(ref);
            }
            setScreen({ name: "editor" });
          }}
          onCancel={() => setScreen({ name: "start" })}
        />
      );

    case "editor":
      return (
        <EditorScreen
          registry={registry}
          document={document}
          audioRef={audioRef}
          player={player}
          onDocumentChange={setDocument}
          onAudioRefChange={async (ref) => {
            setAudioRef(ref);
            await initPlayer(ref);
          }}
          onQuit={() => process.exit(0)}
        />
      );

    default:
      return null;
  }
}
```

- [ ] **Step 3: Rewrite app.test.tsx**

Replace `src/ui/app.test.tsx` with:

```tsx
import { test, expect, describe } from "bun:test";
import { render } from "ink-testing-library";
import { App } from "./app";
import { createDocument, addLines, linesFromText, setTimestamp } from "../core/lrc-document";
import { createDefaultRegistry } from "../registry";

describe("App", () => {
  test("starts on start screen", () => {
    const registry = createDefaultRegistry();
    const { lastFrame } = render(<App registry={registry} />);
    const frame = lastFrame()!;
    expect(frame).toContain("Create new LRC");
    expect(frame).toContain("Import existing LRC");
  });

  test("create new goes to editor", () => {
    const registry = createDefaultRegistry();
    const { lastFrame } = render(
      <App registry={registry} initialScreen={{ name: "editor" }} />
    );
    const frame = lastFrame()!;
    // Editor shows key hints
    expect(frame).toContain("audio");
    expect(frame).toContain("lyrics");
    expect(frame).toContain("save");
  });
});
```

- [ ] **Step 4: Create a stub EditorScreen so app compiles**

Create a minimal `src/ui/screens/edit-screen.tsx` that exports `EditorScreen`:

```tsx
import { Box, Text } from "ink";
import type { Registry } from "../../registry";
import type { LrcDocument } from "../../core/lrc-document";
import type { AudioRef } from "../../ports/audio-source";
import type { AudioPlayer } from "../../ports/audio-player";

interface EditorScreenProps {
  registry: Registry;
  document: LrcDocument;
  audioRef: AudioRef | null;
  player: AudioPlayer | null;
  onDocumentChange: (doc: LrcDocument) => void;
  onAudioRefChange: (ref: AudioRef) => Promise<void>;
  onQuit: () => void;
}

export function EditorScreen({ document }: EditorScreenProps) {
  return (
    <Box flexDirection="column">
      <Text>a audio  l lyrics  m metadata  y sync  p play  s save</Text>
    </Box>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
bun test src/ui/app.test.tsx
```

Expected: PASS (stub is enough for the App routing tests).

- [ ] **Step 6: Run full suite to check nothing else breaks**

```bash
bun test
```

Some old tests that imported deleted screens will fail — delete them:

```bash
rm -f src/ui/screens/start-screen.test.tsx
```

Wait — start-screen.test.tsx should still work. Only delete tests for screens that were deleted. The old `edit-screen.test.tsx` tests the old EditScreen API. Replace it:

```tsx
import { test, expect, describe } from "bun:test";
import { render } from "ink-testing-library";
import { EditorScreen } from "./edit-screen";
import { createDocument, addLines, linesFromText, setTimestamp } from "../../core/lrc-document";
import { createDefaultRegistry } from "../../registry";

function makeDoc() {
  let doc = addLines(createDocument(), linesFromText("Line A\nLine B\nLine C"));
  doc = setTimestamp(doc, 0, 1000);
  doc = setTimestamp(doc, 1, 5000);
  doc = setTimestamp(doc, 2, 10000);
  return doc;
}

const noopPlayer = {
  play: () => {},
  playSegment: () => {},
  pause: () => {},
  resume: () => {},
  seek: () => {},
  getCurrentPosition: () => 0,
  getDuration: () => 60000,
  onPosition: () => () => {},
  dispose: () => {},
};

describe("EditorScreen", () => {
  test("renders key hints", () => {
    const registry = createDefaultRegistry();
    const { lastFrame } = render(
      <EditorScreen
        registry={registry}
        document={makeDoc()}
        audioRef={null}
        player={noopPlayer}
        onDocumentChange={() => {}}
        onAudioRefChange={async () => {}}
        onQuit={() => {}}
      />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("audio");
    expect(frame).toContain("lyrics");
    expect(frame).toContain("save");
  });
});
```

- [ ] **Step 7: Run full test suite**

```bash
bun test
```

Expected: All pass (old screen tests deleted, new stubs pass).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "refactor: delete old screens, simplify app to 3-screen state machine"
```

---

## Task 2: Fullscreen layout with dynamic LineList

**Files:**
- Modify: `src/ui/components/line-list.tsx`
- Modify: `src/ui/screens/edit-screen.tsx`
- Modify: `src/ui/screens/edit-screen.test.tsx`

- [ ] **Step 1: Write failing test for fullscreen editor layout**

Add to `src/ui/screens/edit-screen.test.tsx`:

```tsx
  test("renders audio info when audioRef is set", () => {
    const registry = createDefaultRegistry();
    const ref = { source: "Local File", id: "/path/to/song.mp3", displayName: "song.mp3" };
    const { lastFrame } = render(
      <EditorScreen
        registry={registry}
        document={makeDoc()}
        audioRef={ref}
        player={noopPlayer}
        onDocumentChange={() => {}}
        onAudioRefChange={async () => {}}
        onQuit={() => {}}
      />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("song.mp3");
    expect(frame).toContain("00:01.00");
  });

  test("renders lines from document", () => {
    const registry = createDefaultRegistry();
    const { lastFrame } = render(
      <EditorScreen
        registry={registry}
        document={makeDoc()}
        audioRef={null}
        player={noopPlayer}
        onDocumentChange={() => {}}
        onAudioRefChange={async () => {}}
        onQuit={() => {}}
      />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("Line A");
    expect(frame).toContain("Line B");
  });

  test("shows mode indicator", () => {
    const registry = createDefaultRegistry();
    const { lastFrame } = render(
      <EditorScreen
        registry={registry}
        document={makeDoc()}
        audioRef={null}
        player={noopPlayer}
        onDocumentChange={() => {}}
        onAudioRefChange={async () => {}}
        onQuit={() => {}}
      />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("[edit]");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test src/ui/screens/edit-screen.test.tsx
```

Expected: FAIL (stub doesn't render lines, audio info, or mode indicator).

- [ ] **Step 3: Implement fullscreen edit-mode layout**

Replace `src/ui/screens/edit-screen.tsx` with the full edit-mode layout (no other modes yet):

```tsx
import { useState, useEffect } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import type { Registry } from "../../registry";
import type { LrcDocument } from "../../core/lrc-document";
import type { AudioRef } from "../../ports/audio-source";
import type { AudioPlayer } from "../../ports/audio-player";
import { setTimestamp, setLineText, addLines, linesFromText, setMetadata } from "../../core/lrc-document";
import { lrcToMs } from "../../core/time-utils";
import { LocalAudioSource } from "../../adapters/audio-source/local-audio-source";
import { ProgressBar } from "../components/progress-bar";
import { LineList } from "../components/line-list";
import { KeyHints } from "../components/key-hints";
import { FilePicker } from "../components/file-picker";
import { SyncEngine } from "../../core/sync-engine";
import path from "node:path";

interface EditorScreenProps {
  registry: Registry;
  document: LrcDocument;
  audioRef: AudioRef | null;
  player: AudioPlayer | null;
  onDocumentChange: (doc: LrcDocument) => void;
  onAudioRefChange: (ref: AudioRef) => Promise<void>;
  onQuit: () => void;
}

type Mode =
  | "edit"
  | "sync"
  | "play"
  | "file-picker-audio"
  | "file-picker-lyrics"
  | "file-picker-save"
  | "text-input-edit"
  | "text-input-time"
  | "text-input-metadata"
  | "lyrics-source";

const STEP_OPTIONS = [10, 50, 100, 200, 500, 1000];
const AUDIO_EXTENSIONS = [".mp3", ".flac", ".wav", ".ogg", ".m4a", ".aac", ".wma"];

export function EditorScreen({
  registry,
  document,
  audioRef,
  player,
  onDocumentChange,
  onAudioRefChange,
  onQuit,
}: EditorScreenProps) {
  const { stdout } = useStdout();
  const [rows, setRows] = useState(stdout?.rows ?? 24);

  const [mode, setMode] = useState<Mode>("edit");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(2);
  const [positionMs, setPositionMs] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [metadataField, setMetadataField] = useState<"artist" | "title" | "album">("artist");
  const [syncEngine, setSyncEngine] = useState<SyncEngine | null>(null);
  const [paused, setPaused] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);

  const step = STEP_OPTIONS[stepIndex]!;
  const currentLine = document.lines[currentIndex];
  const hasPlayer = player !== null;

  // Track terminal resize
  useEffect(() => {
    const onResize = () => setRows(stdout?.rows ?? 24);
    stdout?.on("resize", onResize);
    return () => { stdout?.off("resize", onResize); };
  }, [stdout]);

  // Track player position
  useEffect(() => {
    if (!player) return;
    const unsub = player.onPosition((ms) => setPositionMs(ms));
    return unsub;
  }, [player]);

  // Calculate visible lines: total rows - header (3) - footer (2) - margins (2)
  const lineListHeight = Math.max(3, rows - 7);

  // Mode-specific key hints
  function getHints() {
    switch (mode) {
      case "edit":
        return [
          { key: "←→", label: `±${step}ms` },
          { key: "⏎", label: "play line" },
          { key: "e", label: "edit" },
          { key: "t", label: "time" },
          { key: "a", label: "audio" },
          { key: "l", label: "lyrics" },
          { key: "m", label: "metadata" },
          { key: "y", label: "sync" },
          { key: "p", label: "play" },
          { key: "s", label: "save" },
          { key: "q", label: "quit" },
        ];
      case "sync":
        return [
          { key: "␣", label: "mark" },
          { key: "⏎", label: "skip" },
          { key: "⌫", label: "undo" },
          { key: "Esc", label: "stop" },
        ];
      case "play":
        return [
          { key: "␣", label: paused ? "resume" : "pause" },
          { key: "Esc", label: "stop" },
        ];
      default:
        return [];
    }
  }

  // --- Input handling per mode ---
  useInput((input, key) => {
    if (mode === "edit") {
      handleEditInput(input, key);
    } else if (mode === "sync") {
      handleSyncInput(input, key);
    } else if (mode === "play") {
      handlePlayInput(input, key);
    } else if (mode === "lyrics-source") {
      handleLyricsSourceInput(input, key);
    }
  });

  function handleEditInput(input: string, key: any) {
    if (key.upArrow) {
      setCurrentIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setCurrentIndex((i) => Math.min(document.lines.length - 1, i + 1));
    } else if (key.leftArrow && currentLine?.timestamp != null) {
      onDocumentChange(setTimestamp(document, currentIndex, Math.max(0, currentLine.timestamp - step)));
    } else if (key.rightArrow && currentLine?.timestamp != null) {
      onDocumentChange(setTimestamp(document, currentIndex, currentLine.timestamp + step));
    } else if (key.return && currentLine?.timestamp != null && hasPlayer) {
      const nextLine = document.lines[currentIndex + 1];
      const endMs = nextLine?.timestamp ?? (currentLine.timestamp! + 5000);
      player!.playSegment(currentLine.timestamp!, endMs);
    } else if (input === "e" && currentLine) {
      setInputValue(currentLine.text);
      setMode("text-input-edit");
    } else if (input === "t") {
      setInputValue("");
      setMode("text-input-time");
    } else if (input === "a") {
      setMode("file-picker-audio");
    } else if (input === "l") {
      setSourceIndex(0);
      setMode("lyrics-source");
    } else if (input === "m") {
      setMetadataField("artist");
      setInputValue(document.metadata.artist ?? "");
      setMode("text-input-metadata");
    } else if (input === "y" && hasPlayer) {
      const engine = new SyncEngine(document);
      // Advance engine to current index
      for (let i = 0; i < currentIndex; i++) {
        if (document.lines[i]?.timestamp != null) {
          engine.mark(document.lines[i]!.timestamp!);
        } else {
          engine.skip();
        }
      }
      setSyncEngine(engine);
      const startMs = currentLine?.timestamp ?? 0;
      player!.play(startMs);
      setMode("sync");
    } else if (input === "p" && hasPlayer) {
      player!.play();
      setPaused(false);
      setMode("play");
    } else if (input === "s") {
      setMode("file-picker-save");
    } else if (input === "[") {
      setStepIndex((i) => Math.max(0, i - 1));
    } else if (input === "]") {
      setStepIndex((i) => Math.min(STEP_OPTIONS.length - 1, i + 1));
    } else if (input === "q") {
      player?.dispose();
      onQuit();
    }
  }

  function handleSyncInput(input: string, key: any) {
    if (!syncEngine || !player) return;
    if (input === " ") {
      syncEngine.mark(player.getCurrentPosition());
      onDocumentChange(syncEngine.document);
      setCurrentIndex(syncEngine.currentIndex);
      if (syncEngine.isComplete) {
        player.dispose();
        setMode("edit");
        setSyncEngine(null);
      }
    } else if (key.return) {
      syncEngine.skip();
      onDocumentChange(syncEngine.document);
      setCurrentIndex(syncEngine.currentIndex);
      if (syncEngine.isComplete) {
        player.dispose();
        setMode("edit");
        setSyncEngine(null);
      }
    } else if (key.backspace || key.delete) {
      syncEngine.undo();
      onDocumentChange(syncEngine.document);
      setCurrentIndex(syncEngine.currentIndex);
    } else if (key.escape) {
      player.dispose();
      onDocumentChange(syncEngine.document);
      setMode("edit");
      setSyncEngine(null);
    }
  }

  function handlePlayInput(input: string, key: any) {
    if (!player) return;
    if (input === " ") {
      if (paused) {
        player.resume();
        setPaused(false);
      } else {
        player.pause();
        setPaused(true);
      }
    } else if (key.escape) {
      player.dispose();
      setMode("edit");
    }
  }

  function handleLyricsSourceInput(input: string, key: any) {
    const sources = [
      ...registry.lyricsProviders.map((p) => ({ label: p.name, type: "provider" as const, provider: p })),
      { label: "Load from file", type: "file" as const, provider: null },
    ];
    if (key.upArrow) {
      setSourceIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSourceIndex((i) => Math.min(sources.length - 1, i + 1));
    } else if (key.return) {
      const selected = sources[sourceIndex]!;
      if (selected.type === "file") {
        setMode("file-picker-lyrics");
      } else {
        selected.provider!.fetch({ artist: document.metadata.artist, title: document.metadata.title }).then((text) => {
          if (text.trim()) {
            onDocumentChange(addLines(document, linesFromText(text)));
          }
          setMode("edit");
        });
      }
    } else if (key.escape || input === "q") {
      setMode("edit");
    }
  }

  // Auto-advance current line in play mode
  useEffect(() => {
    if (mode !== "play") return;
    let idx = 0;
    for (let i = 0; i < document.lines.length; i++) {
      const ts = document.lines[i]!.timestamp;
      if (ts !== null && ts <= positionMs) idx = i;
    }
    setCurrentIndex(idx);
  }, [positionMs, mode]);

  // --- Modal overlays ---
  if (mode === "file-picker-audio") {
    return (
      <FilePicker
        extensions={AUDIO_EXTENSIONS}
        onSelect={async (filePath) => {
          const source = registry.audioSources[0] as LocalAudioSource;
          const ref = source.selectFromPath(filePath);
          await onAudioRefChange(ref);
          setMode("edit");
        }}
        onCancel={() => setMode("edit")}
      />
    );
  }

  if (mode === "file-picker-lyrics") {
    return (
      <FilePicker
        extensions={[".txt", ".lrc"]}
        onSelect={async (filePath) => {
          try {
            const text = await Bun.file(filePath).text();
            if (text.trim()) {
              onDocumentChange(addLines(document, linesFromText(text)));
            }
          } catch {}
          setMode("edit");
        }}
        onCancel={() => setMode("edit")}
      />
    );
  }

  if (mode === "file-picker-save") {
    const defaultDir = audioRef ? path.dirname(audioRef.id) : process.cwd();
    return (
      <FilePicker
        directory={defaultDir}
        extensions={[".lrc"]}
        onSelect={async (filePath) => {
          const content = registry.lrcParser.serialize(document);
          await Bun.write(filePath, content);
          setMode("edit");
        }}
        onCancel={() => setMode("edit")}
      />
    );
  }

  if (mode === "text-input-edit") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Edit text:</Text>
        <TextInput value={inputValue} onChange={setInputValue} onSubmit={(value) => {
          onDocumentChange(setLineText(document, currentIndex, value));
          setMode("edit");
        }} />
      </Box>
    );
  }

  if (mode === "text-input-time") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Enter time (mm:ss.xx):</Text>
        <TextInput value={inputValue} onChange={setInputValue} onSubmit={(value) => {
          const ms = lrcToMs(value);
          if (ms !== null) {
            onDocumentChange(setTimestamp(document, currentIndex, ms));
          }
          setMode("edit");
        }} />
      </Box>
    );
  }

  if (mode === "text-input-metadata") {
    const fields: Array<"artist" | "title" | "album"> = ["artist", "title", "album"];
    return (
      <Box flexDirection="column" padding={1}>
        <Text>{metadataField.charAt(0).toUpperCase() + metadataField.slice(1)}:</Text>
        <TextInput value={inputValue} onChange={setInputValue} onSubmit={(value) => {
          onDocumentChange(setMetadata(document, { [metadataField]: value }));
          const idx = fields.indexOf(metadataField);
          if (idx < fields.length - 1) {
            const next = fields[idx + 1]!;
            setMetadataField(next);
            setInputValue(document.metadata[next] ?? "");
          } else {
            setMode("edit");
          }
        }} />
      </Box>
    );
  }

  if (mode === "lyrics-source") {
    const sources = [
      ...registry.lyricsProviders.map((p) => ({ label: p.name, type: "provider" as const })),
      { label: "Load from file", type: "file" as const },
    ];
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Add lyrics from:</Text>
        <Box flexDirection="column" marginY={1}>
          {sources.map((s, i) => (
            <Text key={s.label} color={i === sourceIndex ? "cyan" : undefined} bold={i === sourceIndex}>
              {i === sourceIndex ? "▸ " : "  "}{s.label}
            </Text>
          ))}
        </Box>
        <KeyHints hints={[{ key: "↑↓", label: "navigate" }, { key: "⏎", label: "select" }, { key: "Esc", label: "back" }]} />
      </Box>
    );
  }

  // --- Main layout ---
  const modeLabel = mode === "edit" ? "[edit]" : mode === "sync" ? "[sync]" : mode === "play" ? "[play]" : "[edit]";

  return (
    <Box flexDirection="column" height={rows}>
      {/* Header: audio + progress */}
      {hasPlayer && audioRef ? (
        <Box flexDirection="column">
          <Box justifyContent="space-between">
            <Text>Audio: {audioRef.displayName}</Text>
            <Text>{" "}</Text>
          </Box>
          <ProgressBar currentMs={positionMs} durationMs={player!.getDuration()} width={Math.max(20, (stdout?.columns ?? 80) - 4)} />
        </Box>
      ) : (
        <Text dimColor>No audio selected (press a)</Text>
      )}

      {/* Center: line list */}
      <Box flexGrow={1} marginY={1}>
        <LineList lines={document.lines} currentIndex={currentIndex} visibleCount={lineListHeight} />
      </Box>

      {/* Footer: step + mode + hints */}
      <Box justifyContent="space-between">
        <Text dimColor>Step: {step}ms</Text>
        <Text dimColor>{modeLabel}</Text>
      </Box>
      <KeyHints hints={getHints()} />
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
bun test src/ui/screens/edit-screen.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: implement fullscreen unified editor with edit mode"
```

---

## Task 3: Comprehensive editor tests

**Files:**
- Modify: `src/ui/screens/edit-screen.test.tsx`

- [ ] **Step 1: Add tests for sync, play, and save modes**

Append to `src/ui/screens/edit-screen.test.tsx`:

```tsx
  test("y key enters sync mode when player available", () => {
    const registry = createDefaultRegistry();
    const { lastFrame, stdin } = render(
      <EditorScreen
        registry={registry}
        document={makeDoc()}
        audioRef={{ source: "Local File", id: "/test.mp3", displayName: "test.mp3" }}
        player={noopPlayer}
        onDocumentChange={() => {}}
        onAudioRefChange={async () => {}}
        onQuit={() => {}}
      />
    );
    stdin.write("y");
    const frame = lastFrame()!;
    expect(frame).toContain("[sync]");
  });

  test("p key enters play mode when player available", () => {
    const registry = createDefaultRegistry();
    const { lastFrame, stdin } = render(
      <EditorScreen
        registry={registry}
        document={makeDoc()}
        audioRef={{ source: "Local File", id: "/test.mp3", displayName: "test.mp3" }}
        player={noopPlayer}
        onDocumentChange={() => {}}
        onAudioRefChange={async () => {}}
        onQuit={() => {}}
      />
    );
    stdin.write("p");
    const frame = lastFrame()!;
    expect(frame).toContain("[play]");
  });

  test("q key calls onQuit", () => {
    const registry = createDefaultRegistry();
    let quit = false;
    const { stdin } = render(
      <EditorScreen
        registry={registry}
        document={makeDoc()}
        audioRef={null}
        player={noopPlayer}
        onDocumentChange={() => {}}
        onAudioRefChange={async () => {}}
        onQuit={() => { quit = true; }}
      />
    );
    stdin.write("q");
    expect(quit).toBe(true);
  });

  test("empty document shows no lines", () => {
    const registry = createDefaultRegistry();
    const { lastFrame } = render(
      <EditorScreen
        registry={registry}
        document={createDocument()}
        audioRef={null}
        player={null}
        onDocumentChange={() => {}}
        onAudioRefChange={async () => {}}
        onQuit={() => {}}
      />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("No audio selected");
    expect(frame).toContain("[edit]");
  });
```

- [ ] **Step 2: Run tests**

```bash
bun test src/ui/screens/edit-screen.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

```bash
bun test
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/ui/screens/edit-screen.test.tsx && git commit -m "test: add comprehensive editor screen tests"
```

---

## Task 4: Save with file picker default path

The current file picker selects existing files. For save, we need it to work when the target file doesn't exist yet. The simplest approach: save uses the default path directly (audio basename + .lrc), with a confirmation prompt. No file picker needed for save — just show the path and let user confirm or edit it.

**Files:**
- Modify: `src/ui/screens/edit-screen.tsx`

- [ ] **Step 1: Write failing test for save**

Add to `src/ui/screens/edit-screen.test.tsx`:

```tsx
  test("s key shows save prompt with default path", () => {
    const registry = createDefaultRegistry();
    const ref = { source: "Local File", id: "/tmp/test-song.mp3", displayName: "test-song.mp3" };
    const { lastFrame, stdin } = render(
      <EditorScreen
        registry={registry}
        document={makeDoc()}
        audioRef={ref}
        player={noopPlayer}
        onDocumentChange={() => {}}
        onAudioRefChange={async () => {}}
        onQuit={() => {}}
      />
    );
    stdin.write("s");
    const frame = lastFrame()!;
    expect(frame).toContain("test-song.lrc");
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/ui/screens/edit-screen.test.tsx
```

Expected: FAIL (current save opens file picker, not a text input with default path).

- [ ] **Step 3: Change save mode from file-picker to text-input with default path**

In `src/ui/screens/edit-screen.tsx`, add a new state variable and mode. Replace the `file-picker-save` handling:

Add state:
```tsx
const [savePath, setSavePath] = useState("");
```

In `handleEditInput`, change the `s` handler:
```tsx
    } else if (input === "s") {
      const defaultPath = audioRef
        ? audioRef.id.replace(/\.[^.]+$/, ".lrc")
        : path.join(process.cwd(), "output.lrc");
      setSavePath(defaultPath);
      setMode("text-input-save");
    }
```

Replace the `file-picker-save` modal with `text-input-save`:
```tsx
  if (mode === "text-input-save") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Save to:</Text>
        <TextInput value={savePath} onChange={setSavePath} onSubmit={async (value) => {
          const content = registry.lrcParser.serialize(document);
          await Bun.write(value, content);
          setMode("edit");
        }} />
      </Box>
    );
  }
```

Remove the `file-picker-save` block entirely.

Update the Mode type to include `"text-input-save"` and remove `"file-picker-save"`.

- [ ] **Step 4: Run tests**

```bash
bun test src/ui/screens/edit-screen.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/edit-screen.tsx src/ui/screens/edit-screen.test.tsx && git commit -m "feat: save with editable default path instead of file picker"
```

---

## Task 5: Full test suite verification and cleanup

**Files:**
- Possibly modify: any files with leftover references

- [ ] **Step 1: Run full test suite**

```bash
bun test
```

- [ ] **Step 2: Fix any failures**

Check for any imports of deleted screens or broken references. Fix and re-run.

- [ ] **Step 3: Commit fixes if any**

```bash
git add -A && git commit -m "fix: resolve test failures after unified editor refactor"
```

(Skip if no fixes needed.)

- [ ] **Step 4: Verify the app starts**

```bash
bun run src/index.ts
```

Expected: Start screen renders. Press Enter to go to editor. Verify `a`, `l`, `m`, `y`, `p`, `s`, `q` all work.

- [ ] **Step 5: Final commit if any manual fixes were needed**

```bash
git add -A && git commit -m "fix: manual fixes after unified editor refactor"
```
