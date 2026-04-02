import type { LrcDocument } from "./lrc-document";
import { setTimestamp } from "./lrc-document";

interface HistoryEntry {
  index: number;
  previousTimestamp: number | null;
}

export class SyncEngine {
  private _document: LrcDocument;
  private _currentIndex: number = 0;
  private _history: HistoryEntry[] = [];

  constructor(document: LrcDocument) {
    this._document = document;
  }

  get document(): LrcDocument { return this._document; }
  get currentIndex(): number { return this._currentIndex; }
  get isComplete(): boolean { return this._currentIndex >= this._document.lines.length; }

  mark(timestampMs: number): void {
    if (this.isComplete) return;
    const previous = this._document.lines[this._currentIndex]!.timestamp;
    this._history.push({ index: this._currentIndex, previousTimestamp: previous });
    this._document = setTimestamp(this._document, this._currentIndex, timestampMs);
    this._currentIndex++;
  }

  skip(): void {
    if (this.isComplete) return;
    this._history.push({ index: this._currentIndex, previousTimestamp: this._document.lines[this._currentIndex]!.timestamp });
    this._currentIndex++;
  }

  undo(): void {
    const entry = this._history.pop();
    if (!entry) return;
    this._document = setTimestamp(this._document, entry.index, entry.previousTimestamp);
    this._currentIndex = entry.index;
  }
}
