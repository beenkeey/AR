export const STATES = {
  SCAN: 'SCAN',
  TRANSITION: 'TRANSITION',
  EXHIBITION: 'AR_VIEW',
};

export class AppState {
  constructor(initial = STATES.SCAN) {
    this.value = initial;
    this.listeners = new Set();
  }

  get() {
    return this.value;
  }

  is(state) {
    return this.value === state;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.value);
    return () => this.listeners.delete(fn);
  }

  set(next) {
    if (this.value === next) return;
    this.value = next;
    for (const fn of this.listeners) fn(next);
  }

  reset() {
    this.set(STATES.SCAN);
  }
}
