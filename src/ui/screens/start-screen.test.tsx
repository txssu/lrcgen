import React from "react";
import { test, expect, describe } from "bun:test";
import { render } from "ink-testing-library";
import { StartScreen } from "./start-screen";

describe("StartScreen", () => {
  test("renders title and options", () => {
    const { lastFrame } = render(<StartScreen onSelect={() => {}} />);
    const frame = lastFrame()!;
    expect(frame).toContain("lrcgen");
    expect(frame).toContain("Create new LRC");
    expect(frame).toContain("Import existing LRC");
  });
});
