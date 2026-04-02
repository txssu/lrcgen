import type { LyricsProvider } from "../../ports/lyrics-provider";

export class ClipboardLyricsProvider implements LyricsProvider {
  name = "Paste from clipboard";

  async fetch(): Promise<string> {
    const cmd = process.platform === "darwin"
      ? ["pbpaste"]
      : process.platform === "win32"
        ? ["powershell", "-command", "Get-Clipboard"]
        : ["xclip", "-selection", "clipboard", "-o"];

    try {
      const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "ignore" });
      const text = await new Response(proc.stdout).text();
      await proc.exited;
      return text.trimEnd();
    } catch {
      return "";
    }
  }
}
