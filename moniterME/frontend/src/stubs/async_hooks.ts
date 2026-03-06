// Browser stub for node:async_hooks — langgraph imports this but only uses
// AsyncLocalStorage for server-side context propagation which we don't need.

export class AsyncLocalStorage<T> {
  private store: T | undefined;
  getStore(): T | undefined { return this.store; }
  run<R>(store: T, callback: (...args: any[]) => R, ...args: any[]): R {
    const prev = this.store;
    this.store = store;
    try { return callback(...args); }
    finally { this.store = prev; }
  }
  disable() { }
  enterWith(store: T) { this.store = store; }
}

export class AsyncResource {
  constructor(_type: string, _options?: any) { }
  runInAsyncScope<R>(fn: (...args: any[]) => R, _thisArg?: any, ...args: any[]): R {
    return fn(...args);
  }
  bind<T extends Function>(fn: T): T { return fn; }
  static bind<T extends Function>(fn: T): T { return fn; }
  emitDestroy() { return this; }
}

export default {
  AsyncLocalStorage,
  AsyncResource,
  createHook: () => ({ enable: () => { }, disable: () => { } }),
  executionAsyncId: () => 0,
  triggerAsyncId: () => 0,
};
