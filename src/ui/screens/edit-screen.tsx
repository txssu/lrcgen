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

export function EditScreen({ document, player, onDocumentChange, onResync, onExport }: EditScreenProps) {
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
    } else if (key.leftArrow && currentLine?.timestamp !== null && currentLine?.timestamp !== undefined) {
      const newTs = Math.max(0, (currentLine.timestamp ?? 0) - step);
      onDocumentChange(setTimestamp(document, currentIndex, newTs));
    } else if (key.rightArrow && currentLine?.timestamp !== null && currentLine?.timestamp !== undefined) {
      const newTs = (currentLine.timestamp ?? 0) + step;
      onDocumentChange(setTimestamp(document, currentIndex, newTs));
    } else if (key.return) {
      if (currentLine?.timestamp !== null && currentLine?.timestamp !== undefined) {
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
        <TextInput value={inputValue} onChange={setInputValue} onSubmit={(value) => {
          onDocumentChange(setLineText(document, currentIndex, value));
          setMode("navigate");
        }} />
      </Box>
    );
  }

  if (mode === "set-time") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Enter time (mm:ss.xx):</Text>
        <TextInput value={inputValue} onChange={setInputValue} onSubmit={(value) => {
          const ms = lrcToMs(value);
          if (ms !== null) {
            onDocumentChange(setTimestamp(document, currentIndex, ms));
          }
          setMode("navigate");
        }} />
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
      <KeyHints hints={[
        { key: "←→", label: `±${step}ms` },
        { key: "⏎", label: "play line" },
        { key: "e", label: "edit" },
        { key: "t", label: "set time" },
        { key: "[]", label: "step size" },
        { key: "r", label: "re-sync" },
        { key: "q", label: "done" },
      ]} />
    </Box>
  );
}
