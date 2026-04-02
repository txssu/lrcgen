# lrcgen — TUI LRC File Generator

## Overview

TUI application for creating and editing LRC (synchronized lyrics) files. The user loads audio, pastes lyrics, syncs them in real-time by pressing spacebar, then fine-tunes timestamps in an editor. Result exports as a Simple LRC file.

**License:** AGPL-3.0
**Runtime:** Bun + TypeScript
**TUI Framework:** Ink (React for terminal)
**Audio playback:** ffplay (ffmpeg)

---

## 1. Ports (Interfaces)

The core depends only on abstractions. Concrete implementations are swappable adapters.

### AudioSource

Responsible for where audio comes from and how to create a player for it.

```typescript
interface AudioSource {
  name: string
  select(): Promise<AudioRef>
  createPlayer(ref: AudioRef): AudioPlayer
}
```

### AudioPlayer

Responsible for playback control and position tracking.

```typescript
interface AudioPlayer {
  play(fromMs?: number): void
  pause(): void
  resume(): void
  seek(ms: number): void
  getCurrentPosition(): number
  getDuration(): number
  onPosition(callback: (ms: number) => void): () => void
  dispose(): void
}
```

### LyricsProvider

Responsible for obtaining lyrics text.

```typescript
interface LyricsProvider {
  name: string
  fetch(query: { artist?: string; title?: string }): Promise<string>
}
```

### LrcParser

Responsible for parsing and serializing LRC format.

```typescript
interface LrcParser {
  parse(content: string): LrcDocument
  serialize(doc: LrcDocument): string
}
```

### AudioRef

Opaque reference to an audio track. Only the originating AudioSource interprets the `id` field.

```typescript
interface AudioRef {
  source: string
  id: string
  displayName: string
}
```

### First Implementations

| Port | Adapter | Details |
|------|---------|---------|
| AudioSource | `LocalAudioSource` | File picker from disk, creates FfplayAudioPlayer |
| AudioPlayer | `FfplayAudioPlayer` | Playback via `ffplay` subprocess |
| LyricsProvider | `ClipboardLyricsProvider` | Manual text paste in the TUI |
| LrcParser | `SimpleLrcParser` | Simple LRC format `[mm:ss.xx]` |

---

## 2. Data Model

### LrcDocument

```typescript
interface LrcDocument {
  metadata: LrcMetadata
  lines: LrcLine[]
}
```

### LrcMetadata

```typescript
interface LrcMetadata {
  artist?: string
  title?: string
  album?: string
  tool: string // always "https://github.com/txssu/lrcgen"
  [key: string]: string | undefined
}
```

### LrcLine

```typescript
interface LrcLine {
  timestamp: number | null // milliseconds from start, null = not yet synced
  text: string
}
```

**Key decisions:**
- Timestamps stored internally as milliseconds, formatted to `[mm:ss.xx]` only during serialization
- `null` timestamp means the line is not yet synced — visually distinguished in the UI
- `tool` tag is always set to `https://github.com/txssu/lrcgen` automatically during serialization

---

## 3. State Machine

The application is a finite state machine with 5 states:

```
┌─────────┐
│  Start  │──────────────────────────────┐
└────┬────┘                              │
     │                                   │
     ▼                                   ▼
┌─────────┐    ┌──────────┐    ┌──────────────┐
│  Setup  │───▶│ PlaySync │───▶│    Edit      │
└─────────┘    └──────────┘    └──────┬───────┘
                    ▲                 │
                    │                 │
                    └─────────────────┤
                                      ▼
                               ┌──────────┐
                               │  Export   │
                               └──────────┘
```

| State | What happens | Transitions |
|-------|-------------|-------------|
| **Start** | Choose: create new or import existing LRC | → Setup (new) / → Edit (import) |
| **Setup** | Select AudioSource, select audio, paste lyrics, edit metadata | → PlaySync (when audio + text ready) |
| **PlaySync** | Audio plays, spacebar marks current line, auto-advance to next | → Edit (finished or interrupted) |
| **Edit** | Line list, arrow navigation, play line, adjust time (arrows ±step / manual input), edit text | → PlaySync (re-sync) / → Export |
| **Export** | LRC preview, choose path, save file | End or → Edit (go back) |

**Rules:**
- From Edit you can return to PlaySync to re-sync lines
- Import goes directly to Edit (text and timestamps already exist)
- Setup blocks transition to PlaySync without audio and at least one line of text

---

## 4. UI Layouts

### Start Screen

```
╔══════════════════════════════╗
║        lrcgen v0.1.0         ║
║                              ║
║  ▸ Create new LRC            ║
║    Import existing LRC       ║
║                              ║
║  ↑↓ navigate  ⏎ select      ║
╚══════════════════════════════╝
```

### Setup Screen

```
╔══════════════════════════════════════╗
║  Audio: song.mp3              ✓     ║
║  Lyrics: 24 lines             ✓     ║
║  Metadata:                          ║
║    Artist: Radiohead                 ║
║    Title:  Creep                     ║
║    Album:  Pablo Honey               ║
║                                      ║
║  ▸ [Select audio]                    ║
║    [Paste lyrics]                    ║
║    [Edit metadata]                   ║
║    [Start sync] →                    ║
║                                      ║
║  ↑↓ navigate  ⏎ select  q quit     ║
╚══════════════════════════════════════╝
```

### PlaySync Screen

```
╔══════════════════════════════════════╗
║  ▶ 01:23.45 / 04:12.00              ║
║  ━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░   ║
║                                      ║
║    [01:18.20] Previous line          ║
║  ▸ [  ?.??  ] Current line ←        ║
║    [  ?.??  ] Next line              ║
║    [  ?.??  ] Another line           ║
║                                      ║
║  ␣ mark  ⏎ skip  ⌫ undo  q done    ║
╚══════════════════════════════════════╝
```

**Keys:** Space = mark line, Enter = skip without mark, Backspace = undo last mark, q = done → Edit

### Edit Screen

```
╔══════════════════════════════════════╗
║  ▶ 01:23.45 / 04:12.00              ║
║  ━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░   ║
║                                      ║
║    [01:18.20] Previous line          ║
║  ▸ [01:23.45] Current line           ║
║    [01:28.10] Next line              ║
║                                      ║
║  ←→ ±100ms  ⏎ play line  e edit    ║
║  t set time  ↑↓ navigate  q done    ║
╚══════════════════════════════════════╝
```

**Keys:** Left/Right = shift ±step, Enter = play current line, e = edit text, t = manual time input, `[`/`]` = change step size, q = done → Export

### Export Screen

```
╔══════════════════════════════════════╗
║  Preview:                            ║
║  [00:12.30] First line of song       ║
║  [00:15.80] Second line here         ║
║  [00:20.10] Third line goes on       ║
║  ... (scrollable)                    ║
║                                      ║
║  Save to: ~/song.lrc                 ║
║                                      ║
║  ⏎ save  e edit path  ←back         ║
╚══════════════════════════════════════╝
```

---

## 5. Project Structure

```
src/
├── ports/
│   ├── audio-source.ts
│   ├── audio-player.ts
│   ├── lyrics-provider.ts
│   └── lrc-parser.ts
│
├── adapters/
│   ├── audio-source/
│   │   └── local-audio-source.ts
│   ├── audio-player/
│   │   └── ffplay-audio-player.ts
│   ├── lyrics-provider/
│   │   └── clipboard-lyrics-provider.ts
│   └── lrc-parser/
│       └── simple-lrc-parser.ts
│
├── core/
│   ├── lrc-document.ts
│   ├── sync-engine.ts
│   └── time-utils.ts
│
├── ui/
│   ├── app.tsx
│   ├── screens/
│   │   ├── start-screen.tsx
│   │   ├── setup-screen.tsx
│   │   ├── play-sync-screen.tsx
│   │   ├── edit-screen.tsx
│   │   └── export-screen.tsx
│   └── components/
│       ├── progress-bar.tsx
│       ├── line-list.tsx
│       └── key-hints.tsx
│
├── registry.ts
└── index.ts
```

### Registry

```typescript
interface Registry {
  audioSources: AudioSource[]
  lyricsProviders: LyricsProvider[]
  lrcParser: LrcParser
}
```

`index.ts` creates a Registry, registers default adapters, passes it to `<App registry={registry} />`.

### Dependencies

| Package | Purpose |
|---------|---------|
| `ink` | TUI framework |
| `react` | Peer dependency for Ink |
| `ink-text-input` | Text input for metadata, path, manual time |
| `ink-select-input` | Selection lists |

No npm dependency on ffmpeg — `ffplay` is called via `Bun.spawn`, presence checked at startup.

---

## 6. Error Handling

### Startup
- `ffplay` not found → message: "ffplay not found. Install ffmpeg: https://ffmpeg.org/download.html" and exit
- Terminal too narrow → warning with minimum dimensions

### Setup
- Audio file doesn't exist / unreadable → error, stay in Setup
- Empty text → block transition to PlaySync

### PlaySync
- ffplay crashes during playback → message, transition to Edit with whatever was synced
- All lines synced → auto-transition to Edit

### Edit
- Invalid time format in manual input → show expected format, don't apply
- Shift below 0 → clamp to 0
- Shift past next line's start → allowed (user decides order)

### Export
- Lines without timestamps → warning before save, but don't block
- File already exists → overwrite confirmation

### Global
- `Ctrl+C` — exit from any state without saving

---

## 7. Testing Strategy

### Unit Tests (core + adapters)

| Module | Tests |
|--------|-------|
| `simple-lrc-parser` | Parse valid LRC, parse with metadata, parse without timestamps, serialize, round-trip, invalid format |
| `time-utils` | ms → `[mm:ss.xx]`, reverse, edge values (0, large numbers), invalid input |
| `sync-engine` | Mark line, undo, skip line, all lines marked |
| `lrc-document` | Create, add lines, edit timestamp, edit text |

### Integration Tests (UI via ink-testing-library)

| Screen | Tests |
|--------|-------|
| `start-screen` | Navigate between items, select |
| `play-sync-screen` | Space marks line, backspace undoes, display position |
| `edit-screen` | Arrows shift timestamp, `t` opens time input, enter plays line |
| `export-screen` | Preview matches document, save creates file |

### Not Tested Automatically
- `ffplay-audio-player` — real subprocess, manual testing
- `local-audio-source` — file dialog, OS-dependent

### Approach
TDD: Red → Green → Refactor. Start with `core/` (pure logic), then adapters, then UI.
