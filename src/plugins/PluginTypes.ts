import type { EditorStateInterface, CommandManagerInterface } from '../model/types.js';
import type { EventBus } from '../core/EventBus.js';

/**
 * Context provided to plugins during initialization.
 * Gives read/write access to the editor's core systems.
 */
export interface PluginContext {
  readonly editorState: EditorStateInterface;
  readonly eventBus: EventBus;
  readonly commandManager: CommandManagerInterface;
}

/**
 * Base interface for all editor plugins.
 *
 * Plugins are the primary extensibility mechanism for Blocksmith.
 * They receive a PluginContext on init and can subscribe to EventBus
 * events, read/write editor state, and expose their own public API.
 *
 * @example
 * ```ts
 * const myPlugin: EditorPlugin = {
 *   id: 'my-plugin',
 *   name: 'My Plugin',
 *   init(ctx) {
 *     ctx.eventBus.on('state:changed', () => { ... });
 *   },
 *   destroy() { ... },
 * };
 * ```
 */
export interface EditorPlugin {
  /** Unique identifier for the plugin */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Called when the plugin is registered with the editor */
  init(context: PluginContext): void;
  /** Called when the plugin is unregistered or the editor is destroyed */
  destroy(): void;
}
