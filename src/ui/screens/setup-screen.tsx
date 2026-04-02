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
        case 0: setMode("audio-path"); setInputValue(""); break;
        case 1: setMode("lyrics-paste"); setInputValue(""); break;
        case 2: setMode("edit-metadata"); setMetadataField("artist"); setInputValue(document.metadata.artist ?? ""); break;
        case 3: if (canSync) onStartSync(); break;
      }
    } else if (input === "q") {
      onQuit();
    }
  });

  if (mode === "audio-path") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Enter audio file path:</Text>
        <TextInput value={inputValue} onChange={setInputValue} onSubmit={(value) => {
          const source = registry.audioSources[0] as LocalAudioSource;
          const ref = source.selectFromPath(value);
          onAudioRefChange(ref);
          setMode("menu");
        }} />
      </Box>
    );
  }

  if (mode === "lyrics-paste") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Paste lyrics (press Enter to finish):</Text>
        <TextInput value={inputValue} onChange={setInputValue} onSubmit={(value) => {
          if (value.trim()) {
            const lines = linesFromText(value);
            onDocumentChange(addLines(document, lines));
          }
          setMode("menu");
        }} />
      </Box>
    );
  }

  if (mode === "edit-metadata") {
    const fields: MetadataField[] = ["artist", "title", "album"];
    return (
      <Box flexDirection="column" padding={1}>
        <Text>{metadataField.charAt(0).toUpperCase() + metadataField.slice(1)}:</Text>
        <TextInput value={inputValue} onChange={setInputValue} onSubmit={(value) => {
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
        }} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} flexDirection="column">
        <Text>Audio: {audioRef ? audioRef.displayName : "not selected"}{" "}{hasAudio ? <Text color="green">✓</Text> : ""}</Text>
        <Text>Lyrics: {document.lines.length} lines{" "}{hasLyrics ? <Text color="green">✓</Text> : ""}</Text>
        {document.metadata.artist && <Text dimColor>  Artist: {document.metadata.artist}</Text>}
        {document.metadata.title && <Text dimColor>  Title: {document.metadata.title}</Text>}
        {document.metadata.album && <Text dimColor>  Album: {document.metadata.album}</Text>}
      </Box>
      <Box flexDirection="column">
        {MENU_ITEMS.map((item, i) => {
          const isCurrent = i === menuIndex;
          const isDisabled = i === 3 && !canSync;
          return (
            <Text key={item} color={isDisabled ? "gray" : isCurrent ? "cyan" : undefined} bold={isCurrent}>
              {isCurrent ? "▸ " : "  "}{item}
            </Text>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <KeyHints hints={[{ key: "↑↓", label: "navigate" }, { key: "⏎", label: "select" }, { key: "q", label: "quit" }]} />
      </Box>
    </Box>
  );
}
