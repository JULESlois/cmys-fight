export class ObjectPool<T> {
  private items: T[] = [];
  private created = 0;

  constructor(
    private readonly factory: () => T,
    private readonly reset: (item: T) => void,
    private readonly maxSize = 256,
  ) {}

  acquire(): T {
    const item = this.items.pop();
    if (item) return item;
    this.created++;
    return this.factory();
  }

  release(item: T): void {
    this.reset(item);
    if (this.items.length < this.maxSize) this.items.push(item);
  }

  clear(): void {
    this.items = [];
  }

  getStats() {
    return { available: this.items.length, created: this.created, maxSize: this.maxSize };
  }
}
