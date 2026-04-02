import React from "react";
import { Box, Text } from "ink";
import { formatPosition } from "../../core/time-utils";

interface ProgressBarProps {
  currentMs: number;
  durationMs: number;
  width?: number;
}

export function ProgressBar({ currentMs, durationMs, width = 30 }: ProgressBarProps) {
  const ratio = durationMs > 0 ? Math.min(currentMs / durationMs, 1) : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return (
    <Box flexDirection="column">
      <Text>{"▶ "}{formatPosition(currentMs)} / {formatPosition(durationMs)}</Text>
      <Text>{"━".repeat(filled)}{"░".repeat(empty)}</Text>
    </Box>
  );
}
