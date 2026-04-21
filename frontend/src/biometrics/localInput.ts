import type { LocalInputSnapshot, WorldState } from "../app/types";

export function createPointerSnapshot(
  event: PointerEvent,
  bounds: DOMRect,
  previous: LocalInputSnapshot,
): LocalInputSnapshot {
  const pointerX = bounds.width === 0 ? 0.5 : (event.clientX - bounds.left) / bounds.width;
  const pointerY = bounds.height === 0 ? 0.5 : (event.clientY - bounds.top) / bounds.height;
  const now = performance.now();
  const delta = Math.max(16, now - previous.lastInteractionAt);
  const velocity =
    (Math.abs(pointerX - previous.pointerX) + Math.abs(pointerY - previous.pointerY)) /
    (delta / 1000);

  return {
    ...previous,
    pointerX: clamp(pointerX),
    pointerY: clamp(pointerY),
    motionTension: clamp(previous.motionTension * 0.75 + Math.min(velocity / 3.5, 1) * 0.25),
    attention: clamp(previous.attention * 0.88 + 0.12),
    dwell: clamp(previous.dwell * 0.6 + 0.24),
    lastInteractionAt: now,
  };
}

export function decayLocalInput(snapshot: LocalInputSnapshot): LocalInputSnapshot {
  return {
    ...snapshot,
    attention: clamp(snapshot.attention * 0.985),
    motionTension: clamp(snapshot.motionTension * 0.96),
    dwell: clamp(snapshot.dwell * 0.965),
  };
}

export function estimateBreathRate(level: number, previous: number): number {
  return clamp(previous * 0.82 + Math.min(level * 8, 8) * 0.18, 0, 8);
}

export function mapLocalInputToWorldModifiers(world: WorldState, input: LocalInputSnapshot) {
  return {
    bloomBoost: clamp(world.bloom * 0.45 + input.breathRate * 0.04, 0, 1.2),
    revealBoost: clamp(world.reveal_radius + input.dwell * 0.35, 0, 1.3),
    paletteDrift: clamp(world.collective_luminosity + input.attention * 0.12, 0, 1),
    turbulence: clamp(world.entropy * 0.55 + input.motionTension * 0.45, 0, 1),
  };
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

