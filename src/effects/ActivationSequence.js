/**
 * Stage 1: activation is a passthrough.
 * Replace this class later without touching tracking or recognition.
 */
export class ActivationSequence {
  constructor({ effects = [] } = {}) {
    this.effects = effects;
    this.running = false;
  }

  async run({ durationMs = 80 } = {}) {
    this.running = true;
    for (const effect of this.effects) {
      await effect.start?.();
    }
    await wait(durationMs);
    for (const effect of this.effects) {
      await effect.stop?.();
    }
    this.running = false;
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
