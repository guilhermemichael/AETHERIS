import type { WorldState } from "../api/contracts";
import type { LocalInputSnapshot } from "../biometrics/localInput";

export class ReactiveSoundscape {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  async start() {
    if (this.audioContext || typeof window === "undefined" || !("AudioContext" in window)) {
      return;
    }

    this.audioContext = new AudioContext();
    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();
    this.oscillator.type = "sine";
    this.oscillator.frequency.value = 88;
    this.gainNode.gain.value = 0.0001;
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    this.oscillator.start();
  }

  update(world: WorldState, input: LocalInputSnapshot) {
    if (!this.audioContext || !this.oscillator || !this.gainNode) {
      return;
    }

    const now = this.audioContext.currentTime;
    this.oscillator.frequency.linearRampToValueAtTime(
      88 + world.audio_intensity * 42 + input.breathRate * 4 + input.cameraEnergy * 8,
      now + 0.2,
    );
    this.gainNode.gain.linearRampToValueAtTime(
      Math.min(0.06, 0.008 + world.bloom_strength * 0.03 + input.attention * 0.02),
      now + 0.25,
    );
  }

  stop() {
    if (!this.audioContext || !this.oscillator || !this.gainNode) {
      return;
    }

    this.gainNode.gain.value = 0.0001;
    this.oscillator.stop();
    this.oscillator.disconnect();
    this.gainNode.disconnect();
    void this.audioContext.close();
    this.audioContext = null;
    this.oscillator = null;
    this.gainNode = null;
  }
}

