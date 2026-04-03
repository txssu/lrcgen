import { test, expect, describe } from "bun:test";
import { render } from "ink-testing-library";
import { App } from "./app";
import { createDefaultRegistry } from "../registry";

describe("App", () => {
  test("starts on start screen", () => {
    const registry = createDefaultRegistry();
    const { lastFrame } = render(<App registry={registry} />);
    const frame = lastFrame()!;
    expect(frame).toContain("Create new LRC");
    expect(frame).toContain("Import existing LRC");
  });

  test("create new goes to editor", () => {
    const registry = createDefaultRegistry();
    const { lastFrame } = render(
      <App registry={registry} initialScreen={{ name: "editor" }} />
    );
    const frame = lastFrame()!;
    expect(frame).toContain("audio");
    expect(frame).toContain("save");
  });
});
