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

export function ExportScreen({ document, lrcParser, defaultPath, onBack, onSaved }: ExportScreenProps) {
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
        <TextInput value={savePath} onChange={setSavePath} onSubmit={() => setMode("preview")} />
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
        <Text color="yellow">⚠ {unsynced} line{unsynced > 1 ? "s" : ""} without timestamps</Text>
      )}
      <Box marginTop={1}>
        <Text>Save to: {savePath}</Text>
      </Box>
      {saved && <Text color="green">Saved!</Text>}
      {error && <Text color="red">{error}</Text>}
      <Box marginTop={1}>
        <KeyHints hints={[
          { key: "⏎", label: "save" },
          { key: "e", label: "edit path" },
          { key: "←", label: "back" },
        ]} />
      </Box>
    </Box>
  );
}
