import { useState, useEffect, useCallback } from "react";
import { Box, useInput } from "ink";
import type { LrcDocument } from "../../core/lrc-document";
import type { AudioPlayer } from "../../ports/audio-player";
import { ProgressBar } from "../components/progress-bar";
import { LineList } from "../components/line-list";
import { KeyHints } from "../components/key-hints";

interface PreviewScreenProps {
  document: LrcDocument;
  player: AudioPlayer;
  onBack: () => void;
}

function findCurrentLineIndex(lines: LrcDocument["lines"], positionMs: number): number {
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    const ts = lines[i]!.timestamp;
    if (ts !== null && ts <= positionMs) {
      idx = i;
    }
  }
  return idx;
}

export function PreviewScreen({ document, player, onBack }: PreviewScreenProps) {
  const [positionMs, setPositionMs] = useState(player.getCurrentPosition());
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    player.play();
    const unsub = player.onPosition((ms) => setPositionMs(ms));
    return () => { unsub(); };
  }, [player]);

  const currentIndex = findCurrentLineIndex(document.lines, positionMs);

  useInput((input, key) => {
    if (input === " ") {
      if (paused) {
        player.resume();
        setPaused(false);
      } else {
        player.pause();
        setPaused(true);
      }
    } else if (input === "q") {
      player.dispose();
      onBack();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <ProgressBar currentMs={positionMs} durationMs={player.getDuration()} />
      <Box marginY={1}>
        <LineList lines={document.lines} currentIndex={currentIndex} />
      </Box>
      <KeyHints hints={[
        { key: "␣", label: paused ? "resume" : "pause" },
        { key: "q", label: "back to edit" },
      ]} />
    </Box>
  );
}
