import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Registry } from "../../registry";
import type { AudioRef } from "../../ports/audio-source";
import type { LrcDocument } from "../../core/lrc-document";
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

type Mode = "menu" | "audio-path" | "lyrics-source" | "lyrics-file" | "lyrics-loading" | "edit-metadata";
type MetadataField = "artist" | "title" | "album";

const MENU_ITEMS = [
  "Select audio",
  "Add lyrics",
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
  const [sourceIndex, setSourceIndex] = useState(0);

  const hasAudio = audioRef !== null;
  const hasLyrics = document.lines.length > 0;
  const canSync = hasAudio && hasLyrics;

  const lyricsSources = [
    ...registry.lyricsProviders.map((p) => ({ label: p.name, type: "provider" as const, provider: p })),
    { label: "Load from file", type: "file" as const, provider: null },
  ];

  useInput((input, key) => {
    if (mode === "menu") {
      if (key.upArrow) {
        setMenuIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setMenuIndex((i) => Math.min(MENU_ITEMS.length - 1, i + 1));
      } else if (key.return) {
        switch (menuIndex) {
          case 0: setMode("audio-path"); setInputValue(""); break;
          case 1: setMode("lyrics-source"); setSourceIndex(0); break;
          case 2: setMode("edit-metadata"); setMetadataField("artist"); setInputValue(document.metadata.artist ?? ""); break;
          case 3: if (canSync) onStartSync(); break;
        }
      } else if (input === "q") {
        onQuit();
      }
    } else if (mode === "lyrics-source") {
      if (key.upArrow) {
        setSourceIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSourceIndex((i) => Math.min(lyricsSources.length - 1, i + 1));
      } else if (key.return) {
        const selected = lyricsSources[sourceIndex]!;
        if (selected.type === "file") {
          setMode("lyrics-file");
          setInputValue("");
        } else {
          setMode("lyrics-loading");
          selected.provider!.fetch({ artist: document.metadata.artist, title: document.metadata.title }).then((text) => {
            if (text.trim()) {
              onDocumentChange(addLines(document, linesFromText(text)));
            }
            setMode("menu");
          });
        }
      } else if (key.escape || input === "q") {
        setMode("menu");
      }
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

  if (mode === "lyrics-source") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Add lyrics from:</Text>
        <Box flexDirection="column" marginY={1}>
          {lyricsSources.map((s, i) => (
            <Text key={s.label} color={i === sourceIndex ? "cyan" : undefined} bold={i === sourceIndex}>
              {i === sourceIndex ? "▸ " : "  "}{s.label}
            </Text>
          ))}
        </Box>
        <KeyHints hints={[{ key: "↑↓", label: "navigate" }, { key: "⏎", label: "select" }, { key: "q", label: "back" }]} />
      </Box>
    );
  }

  if (mode === "lyrics-loading") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Reading lyrics...</Text>
      </Box>
    );
  }

  if (mode === "lyrics-file") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Enter lyrics file path (.txt):</Text>
        <TextInput value={inputValue} onChange={setInputValue} onSubmit={async (value) => {
          try {
            const resolved = value.replace(/^~/, Bun.env.HOME ?? "");
            const text = await Bun.file(resolved).text();
            if (text.trim()) {
              onDocumentChange(addLines(document, linesFromText(text)));
            }
          } catch {
            // stay in menu, user can try again
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
