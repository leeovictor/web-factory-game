type Listener<T> = (payload: T) => void

class EventBus {
  private handlers = new Map<string, Listener<unknown>[]>()

  on<T>(type: string, cb: Listener<T>): () => void {
    const arr = this.handlers.get(type) ?? []
    arr.push(cb as Listener<unknown>)
    this.handlers.set(type, arr)
    return () => {
      const a = this.handlers.get(type) ?? []
      this.handlers.set(type, a.filter((h) => h !== cb))
    }
  }

  emit<T>(type: string, payload: T): void {
    const arr = this.handlers.get(type) ?? []
    for (const h of arr) {
      ;(h as Listener<T>)(payload)
    }
  }
}

export const eventBus = new EventBus()
