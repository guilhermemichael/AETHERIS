import { useEffect, useRef } from "react";

import type { WorldState } from "../api/contracts";
import type { LocalInputSnapshot } from "../biometrics/localInput";
import { AetherisRenderEngine } from "../render/engine";
import type { RendererMode } from "../render/capabilities";

interface RenderViewportProps {
  worldState: WorldState | null;
  localInput: LocalInputSnapshot;
  onRendererMode: (mode: RendererMode) => void;
}

export function RenderViewport({ worldState, localInput, onRendererMode }: RenderViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<AetherisRenderEngine | null>(null);
  const latestInputRef = useRef(localInput);

  useEffect(() => {
    latestInputRef.current = localInput;
  }, [localInput]);

  useEffect(() => {
    if (!containerRef.current || !worldState) {
      return;
    }

    const engine = new AetherisRenderEngine();
    engineRef.current = engine;
    let isActive = true;

    const container = containerRef.current;
    console.info("[AETHERIS] RenderViewport mounted");

    void engine
      .mount(container, {
        worldState,
        localInput: latestInputRef.current,
        viewport: readViewport(container),
      })
      .then((mode) => {
        if (isActive) {
          onRendererMode(mode);
        }
      })
      .catch((error) => {
        console.error("[AETHERIS] renderer mount failed", error);
        if (isActive) {
          onRendererMode("static");
        }
      });

    const resizeObserver = new ResizeObserver(() => {
      if (!engineRef.current || !containerRef.current || !worldState) {
        return;
      }
      engineRef.current.update({
        worldState,
        localInput: latestInputRef.current,
        viewport: readViewport(containerRef.current),
      });
    });
    resizeObserver.observe(container);

    return () => {
      isActive = false;
      resizeObserver.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, [onRendererMode, worldState]);

  useEffect(() => {
    if (!worldState || !containerRef.current) {
      return;
    }
    engineRef.current?.update({
      worldState,
      localInput,
      viewport: readViewport(containerRef.current),
    });
  }, [localInput, worldState]);

  return <div ref={containerRef} className="aetheris-viewport" />;
}

function readViewport(container: HTMLElement) {
  return {
    width: Math.max(1, container.clientWidth),
    height: Math.max(1, container.clientHeight),
    dpr: window.devicePixelRatio || 1,
  };
}

