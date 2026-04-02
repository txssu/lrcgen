import React, { useState } from "react";
import type { Registry } from "../registry";
import type { LrcDocument } from "../core/lrc-document";
import type { AudioRef } from "../ports/audio-source";
import { createDocument } from "../core/lrc-document";
import { StartScreen } from "./screens/start-screen";
import { SetupScreen } from "./screens/setup-screen";

type Screen =
  | { name: "start" }
  | { name: "setup" }
  | { name: "play-sync" }
  | { name: "edit" }
  | { name: "export" };

interface AppProps {
  registry: Registry;
}

export function App({ registry }: AppProps) {
  const [screen, setScreen] = useState<Screen>({ name: "start" });
  const [document, setDocument] = useState<LrcDocument>(createDocument());
  const [audioRef, setAudioRef] = useState<AudioRef | null>(null);

  switch (screen.name) {
    case "start":
      return (
        <StartScreen
          onSelect={(action) => {
            if (action === "create") {
              setScreen({ name: "setup" });
            } else {
              setScreen({ name: "edit" });
            }
          }}
        />
      );
    case "setup":
      return (
        <SetupScreen
          registry={registry}
          document={document}
          audioRef={audioRef}
          onDocumentChange={setDocument}
          onAudioRefChange={setAudioRef}
          onStartSync={() => setScreen({ name: "play-sync" })}
          onQuit={() => process.exit(0)}
        />
      );
    default:
      return null;
  }
}
