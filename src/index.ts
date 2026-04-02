import React from "react";
import { render } from "ink";
import { App } from "./ui/app";
import { createDefaultRegistry } from "./registry";

async function checkFfplay(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["ffplay", "-version"], { stdout: "ignore", stderr: "ignore" });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

async function main() {
  const hasFfplay = await checkFfplay();
  if (!hasFfplay) {
    console.error("ffplay not found. Install ffmpeg: https://ffmpeg.org/download.html");
    process.exit(1);
  }
  const registry = createDefaultRegistry();
  render(React.createElement(App, { registry }));
}

main();
