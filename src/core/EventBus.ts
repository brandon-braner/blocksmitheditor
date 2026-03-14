export type EditorEvent =
  | 'state:changed'
  | 'block:added'
  | 'block:removed'
  | 'block:updated'
  | 'block:moved'
  | 'block:focused'
  | 'selection:changed'
  | 'ai:start'
  | 'ai:chunk'
  | 'ai:complete'
  | 'ai:error';

type Handler = (data?: unknown) => void;

export class EventBus {
  private handlers = new Map<EditorEvent, Set<Handler>>();

  on(event: EditorEvent, handler: Handler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: EditorEvent, handler: Handler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: EditorEvent, data?: unknown): void {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (e) {
        console.error(`EventBus error in handler for "${event}":`, e);
      }
    });
  }

  destroy(): void {
    this.handlers.clear();
  }
}
