export interface LrcMetadata {
  artist?: string;
  title?: string;
  album?: string;
  tool: string;
  [key: string]: string | undefined;
}

export interface LrcLine {
  timestamp: number | null;
  text: string;
}

export interface LrcDocument {
  metadata: LrcMetadata;
  lines: LrcLine[];
}

const TOOL_URL = "https://github.com/txssu/lrcgen";

export function createDocument(metadata?: Partial<Omit<LrcMetadata, "tool">>): LrcDocument {
  return { metadata: { ...metadata, tool: TOOL_URL }, lines: [] };
}

export function linesFromText(text: string): LrcLine[] {
  if (!text) return [];
  return text.split("\n").map((line) => line.trim()).filter((line) => line !== "").map((text) => ({ timestamp: null, text }));
}

export function addLines(doc: LrcDocument, lines: LrcLine[]): LrcDocument {
  return { ...doc, lines: [...doc.lines, ...lines] };
}

export function setTimestamp(doc: LrcDocument, index: number, timestamp: number | null): LrcDocument {
  const lines = doc.lines.map((line, i) => i === index ? { ...line, timestamp } : line);
  return { ...doc, lines };
}

export function setLineText(doc: LrcDocument, index: number, text: string): LrcDocument {
  const lines = doc.lines.map((line, i) => i === index ? { ...line, text } : line);
  return { ...doc, lines };
}

export function insertLine(doc: LrcDocument, afterIndex: number): LrcDocument {
  const newLine: LrcLine = { timestamp: null, text: "" };
  const lines = [...doc.lines];
  lines.splice(afterIndex + 1, 0, newLine);
  return { ...doc, lines };
}

export function removeLine(doc: LrcDocument, index: number): LrcDocument {
  if (index < 0 || index >= doc.lines.length) return doc;
  const lines = doc.lines.filter((_, i) => i !== index);
  return { ...doc, lines };
}

export function setMetadata(doc: LrcDocument, updates: Partial<Omit<LrcMetadata, "tool">>): LrcDocument {
  return { ...doc, metadata: { ...doc.metadata, ...updates, tool: TOOL_URL } };
}
