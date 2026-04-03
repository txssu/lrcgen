# Unified Editor Screen

## Overview

Replace Setup, Edit, PlaySync, Preview, and Export screens with a single unified editor. Start screen and Import screen remain. Total: 3 screens instead of 7.

## State Machine

```
Start --> Import --> Editor
  |                    ^
  +--- (create new) ---+
```

## Layout

Always visible:

```
  Audio: song.mp3                     01:23.45 / 04:12.00
  ━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

    [00:00.00] First line
  ▸ [00:03.57] Current line here
    [00:07.12] Next line goes here

  Step: 100ms                                      [edit]
  a audio  l lyrics  m metadata  y sync  p play  s save
```

The editor fills 100% of the terminal (stdout.rows / stdout.columns). Resizes with the terminal.

Top: audio file name + progress bar (hidden if no audio selected).
Center: line list fills all remaining vertical space, current line highlighted.
Bottom: current step size, active mode indicator, key hints.

## Internal Modes

The editor has internal modes. Only one mode active at a time.

### edit (default)

Standard line editing. Always returns here after other modes finish.

| Key | Action |
|-----|--------|
| Up/Down | Navigate lines |
| Left/Right | Shift timestamp +-step |
| `[` / `]` | Change step size (10, 50, 100, 200, 500, 1000ms) |
| Enter | Play current line segment |
| `e` | Edit line text (text-input modal) |
| `t` | Set time manually (text-input modal) |
| `a` | Select audio file (file-picker modal) |
| `l` | Add lyrics (source selector, then clipboard or file-picker) |
| `m` | Edit metadata (text-input modal, cycles artist/title/album) |
| `y` | Enter sync mode from current line |
| `p` | Enter play mode (preview) |
| `s` | Save LRC file (file-picker modal, default path = audio name + .lrc) |
| `q` | Quit |

### sync

Real-time timestamp marking. Entered via `y` from edit mode. Audio starts playing from the current line's position (or from 0 if no timestamp on current line).

| Key | Action |
|-----|--------|
| Space | Mark current line with player position, advance to next |
| Enter | Skip line (no timestamp), advance |
| Backspace | Undo last mark, go back |
| Escape | Exit sync mode, return to edit |

Auto-exits to edit mode when all remaining lines are marked.

### play

Preview playback. Audio plays from the beginning, current line auto-advances based on timestamps.

| Key | Action |
|-----|--------|
| Space | Pause / resume |
| Escape | Stop, return to edit |

### file-picker (modal overlay)

Triggered by `a`, `l` (file option), `s`. File picker component renders over the main layout. Selecting a file or pressing Escape/q returns to edit mode.

- `a`: filter by audio extensions (.mp3, .flac, .wav, .ogg, .m4a, .aac, .wma)
- `l`: filter by text extensions (.txt, .lrc)
- `s`: filter by .lrc, default filename = audio basename + .lrc

### text-input (modal overlay)

Triggered by `e`, `t`, `m`. Single-line text input renders over the main layout.

- `e`: edit current line's text
- `t`: enter timestamp in mm:ss.xx format
- `m`: cycles through artist, title, album fields

Enter submits, Escape cancels. Returns to edit mode.

### lyrics-source (modal overlay)

Triggered by `l`. Shows source selector (clipboard providers + "Load from file"). Selecting clipboard reads from system clipboard and returns to edit. Selecting file opens file-picker modal.

## Save Behavior

`s` opens file picker with default path derived from audio file:
- If audio is `~/Music/song.mp3`, default save path is `~/Music/song.lrc`
- If no audio selected, default is `output.lrc` in cwd
- `[tool:https://github.com/txssu/lrcgen]` tag always included in output

## Files to Delete

- `src/ui/screens/setup-screen.tsx`
- `src/ui/screens/play-sync-screen.tsx`
- `src/ui/screens/preview-screen.tsx`
- `src/ui/screens/export-screen.tsx`
- Corresponding test files

## Files to Modify

- `src/ui/screens/edit-screen.tsx` — complete rewrite as unified editor
- `src/ui/screens/edit-screen.test.tsx` — new tests for unified editor
- `src/ui/app.tsx` — simplify state machine to 3 screens (start, import, editor)
- `src/ui/app.test.tsx` — update tests

## Files Unchanged

- All `src/core/*` — data model, sync engine, time utils
- All `src/ports/*` — interfaces
- All `src/adapters/*` — implementations
- `src/registry.ts`
- `src/ui/components/*` — ProgressBar, LineList, KeyHints, FilePicker
- `src/ui/screens/start-screen.tsx`
- `src/ui/screens/import-screen.tsx`
