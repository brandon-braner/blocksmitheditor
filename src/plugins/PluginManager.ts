import type { EditorPlugin, PluginContext } from './PluginTypes.js';
import type { EventBus } from '../core/EventBus.js';

/**
 * Manages plugin lifecycle: registration, lookup, and teardown.
 */
export class PluginManager {
  private plugins = new Map<string, EditorPlugin>();

  constructor(
    private eventBus: EventBus,
    private contextFactory: () => PluginContext
  ) {}

  /**
   * Register a plugin. Calls plugin.init() immediately with the
   * current editor context and emits 'plugin:registered'.
   */
  register(plugin: EditorPlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginManager] Plugin "${plugin.id}" is already registered — skipping.`);
      return;
    }

    plugin.init(this.contextFactory());
    this.plugins.set(plugin.id, plugin);
    this.eventBus.emit('plugin:registered', { pluginId: plugin.id });
    console.log(`[PluginManager] Registered plugin "${plugin.id}"`);
  }

  /**
   * Unregister a plugin by id. Calls plugin.destroy() and emits
   * 'plugin:unregistered'.
   */
  unregister(id: string): void {
    const plugin = this.plugins.get(id);
    if (!plugin) return;

    try {
      plugin.destroy();
    } catch (e) {
      console.error(`[PluginManager] Error destroying plugin "${id}":`, e);
    }

    this.plugins.delete(id);
    this.eventBus.emit('plugin:unregistered', { pluginId: id });
  }

  /** Get a plugin by id. */
  get<T extends EditorPlugin = EditorPlugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }

  /** Get all registered plugins. */
  getAll(): EditorPlugin[] {
    return Array.from(this.plugins.values());
  }

  /** Destroy all plugins (called on editor teardown). */
  destroyAll(): void {
    for (const [id, plugin] of this.plugins) {
      try {
        plugin.destroy();
      } catch (e) {
        console.error(`[PluginManager] Error destroying plugin "${id}":`, e);
      }
    }
    this.plugins.clear();
  }
}
