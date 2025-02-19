export class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event).push(listener);
    return this;
  }

  removeListener(event, listener) {
    if (this.events.has(event)) {
      this.events.set(
        event,
        this.events.get(event).filter((cb) => cb !== listener),
      );
    }
    return this;
  }

  emit(event, ...args) {
    if (this.events.has(event)) {
      this.events.get(event).forEach((listener) => listener.apply(this, args));
      return true;
    }
    return false;
  }
}
