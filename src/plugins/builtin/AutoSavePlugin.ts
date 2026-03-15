import type { EditorPlugin, PluginContext } from '../PluginTypes.js';

export interface AutoSaveConfig {
  /** localStorage key (default: 'blocksmith-doc') */
  key?: string;
  /** Debounce interval in ms (default: 1000) */
  debounceMs?: number;
  /** Storage backend — anything with getItem/setItem (default: localStorage) */
  storage?: { getItem(key: string): string | null; setItem(key: string, value: string): void };
  /** Optional callback after each save */
  onSave?: (json: string) => void;
}

/**
 * Auto-saves the editor document as JSON to a configurable storage
 * backend (defaults to localStorage). Listens to 'state:changed'
 * events and debounces writes.
 */
export class AutoSavePlugin implements EditorPlugin {
  readonly id = 'auto-save';
  readonly name = 'Auto Save';

  private context: PluginContext | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private config: Required<Pick<AutoSaveConfig, 'key' | 'debounceMs'>> & AutoSaveConfig;

  private handleStateChanged = () => {
    this.scheduleSave();
  };

  constructor(config: AutoSaveConfig = {}) {
    this.config = {
      key: config.key ?? 'blocksmith-doc',
      debounceMs: config.debounceMs ?? 1000,
      storage: config.storage,
      onSave: config.onSave,
    };
  }

  init(context: PluginContext): void {
    this.context = context;
    context.eventBus.on('state:changed', this.handleStateChanged);
  }

  destroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.context?.eventBus.off('state:changed', this.handleStateChanged);
    this.context = null;
  }

  /** Force an immediate save (bypasses debounce). */
  saveNow(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.performSave();
  }

  /** Load a previously saved document from storage. Returns null if none found. */
  load(): string | null {
    const storage = this.config.storage ?? localStorage;
    return storage.getItem(this.config.key);
  }

  private scheduleSave(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.performSave();
    }, this.config.debounceMs);
  }

  private performSave(): void {
    if (!this.context) return;

    const doc = this.context.editorState.toDocument();
    const json = JSON.stringify(doc);
    const storage = this.config.storage ?? localStorage;
    storage.setItem(this.config.key, json);

    this.config.onSave?.(json);
    this.context.eventBus.emit('document:saved', { format: 'json', key: this.config.key });
  }
}
