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

export function PlaySyncScreen({ document, player, onComplete }: PlaySyncScreenProps) {
  const [engine] = useState(() => new SyncEngine(document));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [doc, setDoc] = useState(document);
  const [positionMs, setPositionMs] = useState(0);

  useEffect(() => {
    player.play();
    const unsub = player.onPosition((ms) => setPositionMs(ms));
    return () => { unsub(); };
  }, [player]);

  const syncState = useCallback(() => {
    setCurrentIndex(engine.currentIndex);
    setDoc(engine.document);
  }, [engine]);

  useInput((input, key) => {
    if (input === " ") {
      engine.mark(player.getCurrentPosition());
      syncState();
      if (engine.isComplete) { player.dispose(); onComplete(engine.document); }
    } else if (key.return) {
      engine.skip();
      syncState();
      if (engine.isComplete) { player.dispose(); onComplete(engine.document); }
    } else if (key.backspace || key.delete) {
      engine.undo();
      syncState();
    } else if (input === "q") {
      player.dispose();
      onComplete(engine.document);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <ProgressBar currentMs={positionMs} durationMs={player.getDuration()} />
      <Box marginY={1}>
        <LineList lines={doc.lines} currentIndex={currentIndex} />
      </Box>
      <KeyHints hints={[
        { key: "␣", label: "mark" },
        { key: "⏎", label: "skip" },
        { key: "⌫", label: "undo" },
        { key: "q", label: "done" },
      ]} />
    </Box>
  );
}
