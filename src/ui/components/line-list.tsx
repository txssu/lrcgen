import React, { type ReactNode } from "react";
import { Box, Text } from "ink";
import type { LrcLine } from "../../core/lrc-document";
import { msToLrc } from "../../core/time-utils";

interface LineListProps {
  lines: LrcLine[];
  currentIndex: number;
  visibleCount?: number;
  currentLineOverride?: ReactNode;
}

export function LineList({ lines, currentIndex, visibleCount = 7, currentLineOverride }: LineListProps) {
  const half = Math.floor(visibleCount / 2);
  let start = Math.max(0, currentIndex - half);
  const end = Math.min(lines.length, start + visibleCount);
  if (end - start < visibleCount) {
    start = Math.max(0, end - visibleCount);
  }
  const visible = lines.slice(start, end);
  return (
    <Box flexDirection="column">
      {visible.map((line, i) => {
        const actualIndex = start + i;
        const isCurrent = actualIndex === currentIndex;
        const prefix = isCurrent ? "▸ " : "  ";

        if (isCurrent && currentLineOverride) {
          return (
            <Box key={actualIndex}>
              <Text bold color="cyan">{prefix}</Text>
              {currentLineOverride}
            </Box>
          );
        }

        const timeStr = line.timestamp !== null ? `[${msToLrc(line.timestamp)}]` : "[  ?.??  ]";
        return (
          <Text key={actualIndex} bold={isCurrent} color={isCurrent ? "cyan" : undefined}>
            {prefix}{timeStr} {line.text}
          </Text>
        );
      })}
    </Box>
  );
}
