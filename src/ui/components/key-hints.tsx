import React from "react";
import { Text } from "ink";

interface KeyHintsProps {
  hints: Array<{ key: string; label: string }>;
}

export function KeyHints({ hints }: KeyHintsProps) {
  return (
    <Text dimColor>
      {hints.map((h, i) => (
        <Text key={h.key}>
          {i > 0 ? "  " : ""}
          <Text bold>{h.key}</Text> {h.label}
        </Text>
      ))}
    </Text>
  );
}
