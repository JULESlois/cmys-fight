type EventHandler = (...args: any[]) => void;

export class EventBus {
  private listeners: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  off(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) return;
    const handlers = this.listeners.get(event)!;
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners.has(event)) return;
    for (const handler of this.listeners.get(event)!) {
      handler(...args);
    }
  }
}

export const events = new EventBus();
