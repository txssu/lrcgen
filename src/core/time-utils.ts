export function msToLrc(ms: number): string {
  const totalHundredths = Math.round(ms / 10);
  const hundredths = totalHundredths % 100;
  const totalSeconds = Math.floor(totalHundredths / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

export function lrcToMs(lrc: string): number | null {
  const match = lrc.match(/^(\d{2,}):(\d{2})\.(\d{2})$/);
  if (!match) return null;
  const minutes = parseInt(match[1]!, 10);
  const seconds = parseInt(match[2]!, 10);
  const hundredths = parseInt(match[3]!, 10);
  return (minutes * 60 + seconds) * 1000 + hundredths * 10;
}

export function formatPosition(ms: number): string {
  return msToLrc(ms);
}
