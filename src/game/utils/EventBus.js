class EventBus {
  constructor() {
    this.listeners = {};
  }

  static getInstance() {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeListener(event, callback) {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event] = this.listeners[event].filter(
      (listener) => listener !== callback,
    );
  }

  emit(event, ...data) {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event].forEach((listener) => listener(...data));
  }
}

export default EventBus;
