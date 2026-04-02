import { test, expect, describe } from "bun:test";
import { render } from "ink-testing-library";
import { App } from "./app";
import { createDocument, addLines, linesFromText, setTimestamp } from "../core/lrc-document";
import { createDefaultRegistry } from "../registry";

function makeImportedDoc() {
  let doc = addLines(createDocument({ artist: "Test" }), linesFromText("Line A\nLine B"));
  doc = setTimestamp(doc, 0, 1000);
  doc = setTimestamp(doc, 1, 5000);
  return doc;
}

describe("App", () => {
  test("import flow leads to setup screen (not edit) so user can select audio", () => {
    const registry = createDefaultRegistry();
    // Simulate what happens after ImportScreen calls onImport:
    // The app should go to setup, not edit, because there's no audio player yet
    const { lastFrame } = render(
      <App
        registry={registry}
        initialDocument={makeImportedDoc()}
        initialScreen={{ name: "setup" }}
      />
    );
    const frame = lastFrame()!;
    expect(frame).not.toContain("No audio player available");
    expect(frame).toContain("2 lines");
    expect(frame).toContain("Select audio");
  });

  test("import screen does not navigate to edit screen", () => {
    const registry = createDefaultRegistry();
    // If we start at edit without a player, we get the error
    const { lastFrame } = render(
      <App
        registry={registry}
        initialDocument={makeImportedDoc()}
        initialScreen={{ name: "edit" }}
      />
    );
    const frame = lastFrame()!;
    // This currently shows "No audio player available" — the bug
    // After fix, this path should not be reachable from import flow
    // But if someone forces it, it should redirect to setup
    expect(frame).not.toContain("No audio player available");
  });
});
