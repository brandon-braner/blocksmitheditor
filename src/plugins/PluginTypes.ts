import type { EditorStateInterface, CommandManagerInterface, Block, BlockType, InlineContent } from '../model/types.js';
import type { EventBus } from '../core/EventBus.js';

/**
 * Context provided to plugins during initialization.
 * Gives read/write access to the editor's core systems.
 *
 * External plugins (published as separate npm packages) use this
 * context to interact with the editor without coupling to internal
 * implementation details.
 */
export interface PluginContext {
  readonly editorState: EditorStateInterface;
  readonly eventBus: EventBus;
  readonly commandManager: CommandManagerInterface;

  /**
   * The editor's Shadow DOM root.
   * Plugins can append their own UI elements here (floating menus,
   * toolbar sections, overlays, etc.).
   */
  readonly shadowRoot: ShadowRoot;

  /** Returns the currently selected text inside the editor. */
  getSelectedText(): string;

  /** Returns the id of the currently focused block, or null. */
  getFocusedBlockId(): string | null;

  /** Factory to create a new Block value object. */
  createBlock(type: BlockType, props?: Record<string, unknown>, content?: InlineContent[]): Block;

  /** Returns the DOM wrapper element for a block, or null. */
  getBlockElement(blockId: string): HTMLElement | null;
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
