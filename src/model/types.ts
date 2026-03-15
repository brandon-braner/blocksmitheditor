import type { EditorPlugin } from '../plugins/PluginTypes.js';

// ============================================================
// DOCUMENT MODEL
// ============================================================

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'bullet-list'
  | 'numbered-list'
  | 'code'
  | 'quote'
  | 'divider'
  | 'image'
  | 'table';

export type InlineMark = 'bold' | 'italic' | 'code' | 'strikethrough' | 'underline' | 'highlight';

export interface TextNode {
  type: 'text';
  text: string;
  marks?: InlineMark[];
}

export interface LinkNode {
  type: 'link';
  href: string;
  children: TextNode[];
}

export type InlineContent = TextNode | LinkNode;

export interface BlockPropsMap {
  paragraph: Record<string, never>;
  heading: { level: 1 | 2 | 3 };
  'bullet-list': Record<string, never>;
  'numbered-list': { start?: number };
  code: { language?: string };
  quote: Record<string, never>;
  divider: Record<string, never>;
  image: { url: string; alt?: string; caption?: string };
  table: { rows: number; cols: number };
}

export interface Block<T extends BlockType = BlockType> {
  id: string;
  type: T;
  props: BlockPropsMap[T];
  content: InlineContent[] | undefined;
  meta?: Record<string, unknown>;
}

export interface EditorDocument {
  blocks: Block[];
  version: number;
}

// ============================================================
// BLOCK DEFINITION (for the registry)
// ============================================================

export interface BlockRenderContext {
  readonly editorState: EditorStateInterface;
  readonly commandManager: CommandManagerInterface;
  requestFocus: (blockId: string, position?: 'start' | 'end') => void;
  emitChange: (blockId: string) => void;
}

export interface BlockDefinition<T extends BlockType = BlockType> {
  type: T;
  displayName: string;
  icon?: string;
  defaultProps: () => BlockPropsMap[T];
  render: (block: Block<T>, context: BlockRenderContext) => HTMLElement;
  parseContent: (element: HTMLElement) => InlineContent[] | undefined;
  hasContent: boolean;
  placeholder?: string;
  slashMenuKeywords?: string[];
  /** Convert a block's JSON data to an HTML string for export. */
  toHTML?: (block: Block<T>) => string;
}

// ============================================================
// AI PROVIDER
// ============================================================

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  text: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface AIProvider {
  id: string;
  name: string;
  complete(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<string>;
}

// ============================================================
// AI ACTIONS
// ============================================================

export interface AIActionContext {
  selectedText: string;
  selectedBlocks: Block[];
  cursorBlockId: string;
  editorState: EditorStateInterface;
  commandManager: CommandManagerInterface;
}

export interface AIAction {
  id: string;
  label: string;
  icon?: string;
  requiresSelection: boolean;
  buildRequest(context: AIActionContext): AIRequest;
  apply(response: string, context: AIActionContext): void;
}

// ============================================================
// EDITOR CONFIGURATION
// ============================================================

export interface EditorConfig {
  initialContent?: EditorDocument;
  placeholder?: string;
  readOnly?: boolean;
  aiProvider?: AIProvider;
  customBlocks?: BlockDefinition[];
  plugins?: EditorPlugin[];
  onChange?: (document: EditorDocument) => void;
  onReady?: (editor: EditorInstance) => void;
}

export interface EditorInstance {
  getDocument(): EditorDocument;
  setDocument(doc: EditorDocument): void;
  insertBlock(type: BlockType, afterId?: string): Block;
  removeBlock(id: string): void;
  updateBlock(id: string, partial: Partial<Block>): void;
  getBlock(id: string): Block | undefined;
  focusEditor(blockId?: string): void;
  undo(): void;
  redo(): void;
  registerAIProvider(provider: AIProvider): void;
  registerPlugin(plugin: EditorPlugin): void;
  getPlugin<T extends EditorPlugin = EditorPlugin>(id: string): T | undefined;
  /** Export the current document as a complete HTML string. */
  exportHTML(title?: string): string;
  destroy(): void;
}

// ============================================================
// CORE INTERFACES (for decoupling)
// ============================================================

export interface EditorStateInterface {
  getBlocks(): Block[];
  getBlock(id: string): Block | undefined;
  getBlockIndex(id: string): number;
  insertBlock(block: Block, index: number): void;
  removeBlock(id: string): void;
  updateBlock(id: string, updates: Partial<Block>): void;
  moveBlock(id: string, newIndex: number): void;
  toDocument(): EditorDocument;
}

export interface Command {
  execute(): void;
  undo(): void;
}

export interface CommandManagerInterface {
  execute(command: Command): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}
