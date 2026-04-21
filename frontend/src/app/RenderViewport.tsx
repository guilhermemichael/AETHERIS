import { useEffect, useRef, useState } from "react";

import type { LocalInputSnapshot, WorldState } from "./types";
import { AetherisRenderEngine } from "../render/engine";

interface RenderViewportProps {
  worldState: WorldState | null;
  localInput: LocalInputSnapshot;
}

export function RenderViewport({ worldState, localInput }: RenderViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<AetherisRenderEngine | null>(null);
  const [rendererMode, setRendererMode] = useState("static");

  useEffect(() => {
    if (!containerRef.current || !worldState) {
      return;
    }

    const engine = new AetherisRenderEngine();
    engineRef.current = engine;
    let isActive = true;

    void engine.mount(containerRef.current, worldState, localInput).then((mode) => {
      if (isActive) {
        setRendererMode(mode);
      }
    });

    return () => {
      isActive = false;
      engine.dispose();
      engineRef.current = null;
    };
  }, [worldState]);

  useEffect(() => {
    if (!worldState) {
      return;
    }
    engineRef.current?.update(worldState, localInput);
  }, [localInput, worldState]);

  return <div ref={containerRef} className="render-viewport" data-renderer-mode={rendererMode} />;
}

