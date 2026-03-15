export type {
  Block,
  BlockType,
  BlockPropsMap,
  InlineContent,
  TextNode,
  LinkNode,
  InlineMark,
  EditorDocument,
  BlockDefinition,
  BlockRenderContext,
  AIProvider,
  AIRequest,
  AIResponse,
  AIAction,
  AIActionContext,
  EditorConfig,
  EditorInstance,
  Command,
  EditorStateInterface,
  CommandManagerInterface,
} from './model/types.js';

export type { EditorPlugin, PluginContext } from './plugins/PluginTypes.js';
export type { EditorEvent } from './core/EventBus.js';

export { createBlock } from './model/Block.js';
export { EventBus } from './core/EventBus.js';
export { EditorState } from './core/EditorState.js';
export { CommandManager } from './core/CommandManager.js';
export { BlockRegistry } from './core/BlockRegistry.js';
export {
  InsertBlockCommand,
  DeleteBlockCommand,
  UpdateBlockCommand,
  MoveBlockCommand,
  ChangeBlockTypeCommand,
} from './core/commands.js';
export { EditorElement } from './components/EditorElement.js';
export { hljs } from './blocks/CodeBlock.js';

// Plugin system
export { PluginManager } from './plugins/PluginManager.js';
export { AutoSavePlugin } from './plugins/builtin/AutoSavePlugin.js';
export type { AutoSaveConfig } from './plugins/builtin/AutoSavePlugin.js';
export { HTMLExportPlugin } from './plugins/builtin/HTMLExportPlugin.js';
export { PDFExportPlugin } from './plugins/builtin/PDFExportPlugin.js';

import { EditorElement } from './components/EditorElement.js';
import type { EditorConfig, EditorInstance } from './model/types.js';

// Register the custom element
if (typeof customElements !== 'undefined' && !customElements.get('blocksmith-editor')) {
  customElements.define('blocksmith-editor', EditorElement);
}

/**
 * Convenience function to create an editor instance.
 */
export function createEditor(
  container: HTMLElement,
  config: EditorConfig = {}
): EditorInstance {
  const editor = document.createElement('blocksmith-editor') as EditorElement;
  editor.config = config;
  container.appendChild(editor);
  return editor;
}
