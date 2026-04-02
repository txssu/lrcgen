import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import type { LrcParser } from "../../ports/lrc-parser";
import type { LrcDocument } from "../../core/lrc-document";

interface ImportScreenProps {
  lrcParser: LrcParser;
  onImport: (doc: LrcDocument) => void;
}

export function ImportScreen({ lrcParser, onImport }: ImportScreenProps) {
  const [filePath, setFilePath] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Box flexDirection="column" padding={1}>
      <Text>Enter LRC file path:</Text>
      <TextInput
        value={filePath}
        onChange={setFilePath}
        onSubmit={async (value) => {
          try {
            const resolved = value.replace(/^~/, Bun.env.HOME ?? "");
            const content = await Bun.file(resolved).text();
            onImport(lrcParser.parse(content));
          } catch (e) {
            setError(`Failed to read file: ${e}`);
          }
        }}
      />
      {error && <Text color="red">{error}</Text>}
    </Box>
  );
}
