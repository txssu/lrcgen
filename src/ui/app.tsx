import { useState, useEffect } from "react";
import { Text } from "ink";
import type { Registry } from "../registry";
import type { LrcDocument } from "../core/lrc-document";
import type { AudioRef } from "../ports/audio-source";
import type { AudioPlayer } from "../ports/audio-player";
import { createDocument } from "../core/lrc-document";
import { StartScreen } from "./screens/start-screen";
import { SetupScreen } from "./screens/setup-screen";
import { PlaySyncScreen } from "./screens/play-sync-screen";
import { EditScreen } from "./screens/edit-screen";
import { ExportScreen } from "./screens/export-screen";
import { FfplayAudioPlayer } from "../adapters/audio-player/ffplay-audio-player";
import { ImportScreen } from "./screens/import-screen";

type Screen =
  | { name: "start" }
  | { name: "import" }
  | { name: "setup" }
  | { name: "play-sync" }
  | { name: "edit" }
  | { name: "export" };

interface AppProps {
  registry: Registry;
  initialDocument?: LrcDocument;
  initialScreen?: Screen;
}

export function App({ registry, initialDocument, initialScreen }: AppProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen ?? { name: "start" });
  const [document, setDocument] = useState<LrcDocument>(initialDocument ?? createDocument());
  const [audioRef, setAudioRef] = useState<AudioRef | null>(null);
  const [player, setPlayer] = useState<AudioPlayer | null>(null);

  useEffect(() => {
    return () => { player?.dispose(); };
  }, [player]);

  async function initPlayer(ref: AudioRef) {
    player?.dispose();
    const source = registry.audioSources.find((s) => s.name === ref.source) ?? registry.audioSources[0]!;
    const newPlayer = source.createPlayer(ref);
    if (newPlayer instanceof FfplayAudioPlayer) {
      await newPlayer.init();
    }
    setPlayer(newPlayer);
    return newPlayer;
  }

  switch (screen.name) {
    case "start":
      return (
        <StartScreen
          onSelect={(action) => {
            if (action === "create") {
              setScreen({ name: "setup" });
            } else {
              setScreen({ name: "import" });
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
          onAudioRefChange={(ref) => {
            setAudioRef(ref);
            initPlayer(ref);
          }}
          onStartSync={() => setScreen({ name: "play-sync" })}
          onQuit={() => process.exit(0)}
        />
      );

    case "play-sync":
      if (!player) {
        return <Text color="red">No audio player available</Text>;
      }
      return (
        <PlaySyncScreen
          document={document}
          player={player}
          onComplete={(doc) => {
            setDocument(doc);
            setScreen({ name: "edit" });
          }}
        />
      );

    case "edit":
      if (!player) {
        return <Text color="red">No audio player available</Text>;
      }
      return (
        <EditScreen
          document={document}
          player={player}
          onDocumentChange={setDocument}
          onResync={() => setScreen({ name: "play-sync" })}
          onExport={() => setScreen({ name: "export" })}
        />
      );

    case "export": {
      const defaultPath = audioRef
        ? audioRef.id.replace(/\.[^.]+$/, ".lrc")
        : "output.lrc";
      return (
        <ExportScreen
          document={document}
          lrcParser={registry.lrcParser}
          defaultPath={defaultPath}
          onBack={() => setScreen({ name: "edit" })}
          onSaved={() => {}}
        />
      );
    }

    case "import":
      return (
        <ImportScreen
          lrcParser={registry.lrcParser}
          onImport={(doc) => {
            setDocument(doc);
            setScreen({ name: "edit" });
          }}
        />
      );

    default:
      return null;
  }
}
