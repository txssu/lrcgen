import { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { KeyHints } from "./key-hints";

interface FilePickerProps {
  directory?: string;
  extensions?: string[];
  onSelect: (filePath: string) => void;
  onCancel: () => void;
}

interface Entry {
  name: string;
  isDir: boolean;
  display: string;
}

function readEntries(dir: string, extensions?: string[]): Entry[] {
  const entries: Entry[] = [];

  entries.push({ name: "..", isDir: true, display: ".." });

  try {
    const names = readdirSync(dir).sort();
    const dirs: Entry[] = [];
    const files: Entry[] = [];

    for (const name of names) {
      if (name.startsWith(".")) continue;
      try {
        const fullPath = path.join(dir, name);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          dirs.push({ name, isDir: true, display: name + "/" });
        } else {
          const ext = path.extname(name).toLowerCase();
          if (!extensions || extensions.includes(ext)) {
            files.push({ name, isDir: false, display: name });
          }
        }
      } catch {
        // skip unreadable entries
      }
    }

    entries.push(...dirs, ...files);
  } catch {
    // directory unreadable
  }

  return entries;
}

export function FilePicker({ directory, extensions, onSelect, onCancel }: FilePickerProps) {
  const [currentDir, setCurrentDir] = useState(directory ?? process.cwd());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const result = readEntries(currentDir, extensions);
    setEntries(result);
    setSelectedIndex(0);
  }, [currentDir]);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(entries.length - 1, i + 1));
    } else if (key.return) {
      const entry = entries[selectedIndex];
      if (!entry) return;
      if (entry.isDir) {
        if (entry.name === "..") {
          setCurrentDir(path.dirname(currentDir));
        } else {
          setCurrentDir(path.join(currentDir, entry.name));
        }
      } else {
        onSelect(path.join(currentDir, entry.name));
      }
    } else if (input === "q" || key.escape) {
      onCancel();
    }
  });

  const visibleCount = 15;
  const half = Math.floor(visibleCount / 2);
  let start = Math.max(0, selectedIndex - half);
  const end = Math.min(entries.length, start + visibleCount);
  if (end - start < visibleCount) {
    start = Math.max(0, end - visibleCount);
  }
  const visible = entries.slice(start, end);

  return (
    <Box flexDirection="column" padding={1}>
      <Text dimColor>{currentDir}</Text>
      <Box flexDirection="column" marginY={1}>
        {visible.map((entry, i) => {
          const actualIndex = start + i;
          const isCurrent = actualIndex === selectedIndex;
          return (
            <Text
              key={entry.display + actualIndex}
              bold={isCurrent}
              color={isCurrent ? "cyan" : entry.isDir ? "blue" : undefined}
            >
              {isCurrent ? "▸ " : "  "}{entry.display}
            </Text>
          );
        })}
      </Box>
      <KeyHints hints={[
        { key: "↑↓", label: "navigate" },
        { key: "⏎", label: "select" },
        { key: "q", label: "cancel" },
      ]} />
    </Box>
  );
}
