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
