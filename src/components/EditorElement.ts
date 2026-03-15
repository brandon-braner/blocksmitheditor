import type {
  EditorConfig,
  EditorInstance,
  Block,
  BlockType,
  BlockDefinition,
  AIActionContext,
} from '../model/types.js';
import { EventBus } from '../core/EventBus.js';
import { EditorState } from '../core/EditorState.js';
import { CommandManager } from '../core/CommandManager.js';
import { BlockRegistry } from '../core/BlockRegistry.js';
import { AIManager } from '../ai/AIManager.js';
import {
  InsertBlockCommand,
  DeleteBlockCommand,
  ChangeBlockTypeCommand,
  MoveBlockCommand,
} from '../core/commands.js';
import { createBlock } from '../model/Block.js';
import { getCaretPosition, setCaretPosition, getSelectedText, getShadowSelection } from '../utils/dom.js';
import { matchMarkdownShortcut } from '../formatting/MarkdownShortcuts.js';
import { debounce, type DebouncedFn } from '../utils/debounce.js';
import { sanitizeHtml } from '../utils/sanitize.js';
import { PluginManager } from '../plugins/PluginManager.js';
import type { PluginContext } from '../plugins/PluginTypes.js';
import { HTMLExportPlugin } from '../plugins/builtin/HTMLExportPlugin.js';

import { paragraphBlock } from '../blocks/ParagraphBlock.js';
import { headingBlock } from '../blocks/HeadingBlock.js';
import { bulletListBlock } from '../blocks/BulletListBlock.js';
import { numberedListBlock } from '../blocks/NumberedListBlock.js';
import { codeBlock } from '../blocks/CodeBlock.js';
import { quoteBlock } from '../blocks/QuoteBlock.js';
import { dividerBlock } from '../blocks/DividerBlock.js';
import { imageBlock } from '../blocks/ImageBlock.js';
import { tableBlock } from '../blocks/TableBlock.js';

import { writeAction } from '../ai/actions/WriteAction.js';
import { rewriteAction } from '../ai/actions/RewriteAction.js';
import { summarizeAction } from '../ai/actions/SummarizeAction.js';
import { expandAction } from '../ai/actions/ExpandAction.js';
import { improveAction } from '../ai/actions/ImproveAction.js';
import { proofreadAction } from '../ai/actions/ProofreadAction.js';
import { explainAction } from '../ai/actions/ExplainAction.js';
import { reformatAction } from '../ai/actions/ReformatAction.js';
import { editWithAIAction } from '../ai/actions/EditWithAIAction.js';

import { SlashMenuElement } from './SlashMenuElement.js';
import { ToolbarElement } from './ToolbarElement.js';
import { AIMenuElement } from './AIMenuElement.js';

import editorStyles from '../../styles/editor.css?inline';

export class EditorElement extends HTMLElement implements EditorInstance {
  private eventBus!: EventBus;
  private editorState!: EditorState;
  private commandManager!: CommandManager;
  private blockRegistry!: BlockRegistry;
  private aiManager!: AIManager;
  private pluginManager!: PluginManager;

  private editorContainer!: HTMLDivElement;
  private blockElements = new Map<string, HTMLElement>();
  private blockDebouncedSaves = new Map<string, DebouncedFn<() => void>>();
  private suppressRerender = false;
  private focusedBlockId: string | null = null;
  private slashMenu!: SlashMenuElement;
  private toolbar!: ToolbarElement;
  private aiMenu!: AIMenuElement;
  private slashFilterStart: number | null = null;

  private _config: EditorConfig = {};
  private _initialized = false;

  static get observedAttributes(): string[] {
    return ['readonly', 'placeholder'];
  }

  set config(value: EditorConfig) {
    this._config = value;
    if (this._initialized) {
      this.initFromConfig();
    }
  }

  get config(): EditorConfig {
    return this._config;
  }

  connectedCallback(): void {
    if (this._initialized) return;
    this._initialized = true;

    const shadow = this.attachShadow({ mode: 'open' });

    // Inject styles
    const style = document.createElement('style');
    style.textContent = editorStyles;
    shadow.appendChild(style);

    // Create container
    this.editorContainer = document.createElement('div');
    this.editorContainer.className = 'bs-editor';
    shadow.appendChild(this.editorContainer);

    // Initialize core systems
    this.eventBus = new EventBus();
    this.commandManager = new CommandManager();
    this.blockRegistry = new BlockRegistry();
    this.aiManager = new AIManager(this.eventBus);
    this.pluginManager = new PluginManager(this.eventBus, () => {
      // Use a getter so plugins always see the *current* editorState,
      // even after setDocument() replaces it with a new instance.
      const self = this;
      const ctx: PluginContext = {
        get editorState() { return self.editorState; },
        eventBus: this.eventBus,
        commandManager: this.commandManager,
      };
      return ctx;
    });

    // Register built-in blocks
    this.blockRegistry.register(paragraphBlock);
    this.blockRegistry.register(headingBlock);
    this.blockRegistry.register(bulletListBlock);
    this.blockRegistry.register(numberedListBlock);
    this.blockRegistry.register(codeBlock);
    this.blockRegistry.register(quoteBlock);
    this.blockRegistry.register(dividerBlock);
    this.blockRegistry.register(imageBlock);
    this.blockRegistry.register(tableBlock);

    // Register built-in AI actions
    this.aiManager.registerAction(writeAction);
    this.aiManager.registerAction(rewriteAction);
    this.aiManager.registerAction(summarizeAction);
    this.aiManager.registerAction(expandAction);
    this.aiManager.registerAction(improveAction);
    this.aiManager.registerAction(proofreadAction);
    this.aiManager.registerAction(explainAction);
    this.aiManager.registerAction(reformatAction);
    this.aiManager.registerAction(editWithAIAction);

    // Initialize menus
    this.slashMenu = new SlashMenuElement(shadow);
    this.toolbar = new ToolbarElement(shadow);
    this.toolbar.setAIManager(this.aiManager);
    this.aiMenu = new AIMenuElement(shadow, this.aiManager);

    this.initFromConfig();
    this.setupEventListeners();
  }

  private initFromConfig(): void {
    const config = this._config;

    // Initialize state
    this.editorState = new EditorState(this.eventBus, config.initialContent);

    // Register custom blocks
    if (config.customBlocks) {
      for (const def of config.customBlocks) {
        this.blockRegistry.register(def);
      }
    }

    // Set AI provider
    if (config.aiProvider) {
      this.aiManager.setProvider(config.aiProvider);
    }

    // Listen for state changes
    this.eventBus.on('state:changed', () => {
      config.onChange?.(this.editorState.toDocument());
    });

    // Render initial content
    this.renderAllBlocks();

    // Add initial block if empty
    if (this.editorState.getBlocks().length === 0) {
      const block = createBlock('paragraph');
      this.editorState.insertBlock(block, 0);
    }

    // Register plugins from config
    if (config.plugins) {
      for (const plugin of config.plugins) {
        this.pluginManager.register(plugin);
      }
    }

    config.onReady?.(this);
  }

  private setupEventListeners(): void {
    // Listen for state events to update DOM
    this.eventBus.on('block:added', (data) => {
      const { block, index } = data as { block: Block; index: number };
      this.renderBlock(block, index);
      if (block.type === 'numbered-list') {
        this.renumberListRun(index);
      }
    });

    this.eventBus.on('block:removed', (data) => {
      const { block, index } = data as { block: Block; index: number };
      this.removeBlockElement(block.id);

      // After any block is removed, check if neighboring blocks are
      // numbered-list items that need renumbering. This handles:
      // 1. A numbered-list item being deleted directly
      // 2. A non-list block between two numbered runs being deleted,
      //    causing the runs to merge
      const blocks = this.editorState.getBlocks();
      // Check the block now at `index` (the one that shifted up)
      if (index < blocks.length && blocks[index].type === 'numbered-list') {
        this.renumberListRun(index);
      }
      // Check the block before the removal point
      if (index > 0 && blocks[index - 1]?.type === 'numbered-list') {
        this.renumberListRun(index - 1);
      }
    });

    this.eventBus.on('block:updated', (data) => {
      if (this.suppressRerender) return;
      const { block } = data as { block: Block };
      this.updateBlockElement(block);

      // Renumber if this block IS a numbered-list item
      if (block.type === 'numbered-list') {
        const idx = this.editorState.getBlockIndex(block.id);
        this.renumberListRun(idx);
      } else {
        // Also renumber if neighboring blocks are numbered-list items,
        // which happens when a numbered-list item was just converted
        // to another type (e.g. paragraph via Backspace or Enter).
        const idx = this.editorState.getBlockIndex(block.id);
        const blocks = this.editorState.getBlocks();
        // Check block after (items that follow the converted block)
        if (idx + 1 < blocks.length && blocks[idx + 1].type === 'numbered-list') {
          this.renumberListRun(idx + 1);
        }
        // Check block before (items that precede the converted block)
        if (idx > 0 && blocks[idx - 1].type === 'numbered-list') {
          this.renumberListRun(idx - 1);
        }
      }
    });

    // Selection change for toolbar
    document.addEventListener('selectionchange', this.handleSelectionChange);

    // Click on empty editor space → focus last block
    this.editorContainer.addEventListener('click', (e) => {
      if (e.target === this.editorContainer) {
        const blocks = this.editorState.getBlocks();
        if (blocks.length > 0) {
          const lastBlock = blocks[blocks.length - 1];
          this.focusBlock(lastBlock.id, 'end');
        }
      }
    });

    // Keyboard shortcuts at editor level
    this.shadowRoot!.addEventListener('keydown', (e) => {
      this.handleGlobalKeyDown(e as KeyboardEvent);
    });

    // Alignment from toolbar
    this.shadowRoot!.addEventListener('bs-align', ((e: CustomEvent) => {
      const { align, blockId } = e.detail as { align: string; blockId: string | null };
      const targetId = blockId || this.focusedBlockId;
      if (!targetId) return;

      const block = this.editorState.getBlock(targetId);
      if (!block) return;

      const existingMeta = block.meta || {};
      this.editorState.updateBlock(targetId, {
        meta: { ...existingMeta, align },
      });
    }) as EventListener);
  }

  disconnectedCallback(): void {
    document.removeEventListener('selectionchange', this.handleSelectionChange);
    this.eventBus.destroy();
    this._initialized = false;
  }

  // ============================================================
  // RENDERING
  // ============================================================

  private renderAllBlocks(): void {
    this.editorContainer.innerHTML = '';
    this.blockElements.clear();

    const blocks = this.editorState.getBlocks();
    for (let i = 0; i < blocks.length; i++) {
      this.renderBlock(blocks[i], i);
    }
  }

  private renderBlock(block: Block, index: number): void {
    const def = this.blockRegistry.get(block.type);
    if (!def) return;

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'bs-block';
    wrapper.setAttribute('data-block-id', block.id);
    wrapper.setAttribute('data-block-type', block.type);

    // Drag handle
    const handle = document.createElement('div');
    handle.className = 'bs-drag-handle';
    handle.textContent = '⠿';
    handle.setAttribute('draggable', 'true');
    handle.addEventListener('dragstart', (e) => this.handleDragStart(e, block.id));
    handle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showBlockContextMenu(handle, block.id);
    });
    wrapper.appendChild(handle);

    // Content
    const content = document.createElement('div');
    content.className = 'bs-block-content';

    const rendered = def.render(block as never, {
      editorState: this.editorState,
      commandManager: this.commandManager,
      requestFocus: (id, pos) => this.focusBlock(id, pos),
      emitChange: (id) => this.saveBlockContent(id),
    });

    content.appendChild(rendered);
    wrapper.appendChild(content);

    // Attach event listeners to editable elements
    const editable = this.getEditableElement(content, block.type);
    if (editable) {
      this.attachBlockListeners(editable, block.id, block.type);
    }

    // Listen for language changes from code blocks
    wrapper.addEventListener('bs-lang-change', ((e: CustomEvent) => {
      this.suppressRerender = true;
      this.editorState.updateBlock(block.id, {
        props: { ...block.props, language: e.detail.language },
      });
      this.suppressRerender = false;
    }) as EventListener);

    // Listen for table updates
    wrapper.addEventListener('bs-table-update', ((e: CustomEvent) => {
      this.suppressRerender = true;
      const { rows, cols, cells, rowStyles, colWidths, colStyles } = e.detail;
      this.editorState.updateBlock(block.id, {
        props: { rows, cols } as unknown as Block['props'],
        meta: { ...block.meta, cells, rowStyles, colWidths, colStyles },
      });
      this.suppressRerender = false;
    }) as EventListener);

    // Listen for block delete (e.g. table delete button)
    wrapper.addEventListener('bs-block-delete', (() => {
      this.editorState.removeBlock(block.id);
    }) as EventListener);

    // Drag target
    wrapper.addEventListener('dragover', (e) => this.handleDragOver(e, wrapper));
    wrapper.addEventListener('dragleave', (e) => this.handleDragLeave(e, wrapper));
    wrapper.addEventListener('drop', (e) => this.handleDrop(e, block.id, wrapper));
    handle.addEventListener('dragend', () => this.clearDrag());

    // Insert at correct position
    const children = this.editorContainer.children;
    if (index >= children.length) {
      this.editorContainer.appendChild(wrapper);
    } else {
      this.editorContainer.insertBefore(wrapper, children[index]);
    }

    this.blockElements.set(block.id, wrapper);
  }

  private removeBlockElement(blockId: string): void {
    this.blockDebouncedSaves.get(blockId)?.cancel();
    this.blockDebouncedSaves.delete(blockId);
    const el = this.blockElements.get(blockId);
    if (el) {
      el.remove();
      this.blockElements.delete(blockId);
    }
  }

  private updateBlockElement(block: Block): void {
    const existing = this.blockElements.get(block.id);
    if (!existing) return;

    const index = this.editorState.getBlockIndex(block.id);
    this.removeBlockElement(block.id);
    this.renderBlock(block, index);

    // Re-focus if this was the focused block
    if (this.focusedBlockId === block.id) {
      requestAnimationFrame(() => this.focusBlock(block.id));
    }
  }

  /**
   * Update the displayed number on all numbered-list items in the
   * same consecutive run as the block at `startIndex`.
   */
  private renumberListRun(startIndex: number): void {
    const blocks = this.editorState.getBlocks();
    if (startIndex < 0 || startIndex >= blocks.length) return;
    if (blocks[startIndex].type !== 'numbered-list') return;

    // Walk back to find the first item in the run
    let runStart = startIndex;
    while (runStart > 0 && blocks[runStart - 1].type === 'numbered-list') {
      runStart--;
    }

    // Walk forward and patch every ol start attribute
    for (let i = runStart; i < blocks.length && blocks[i].type === 'numbered-list'; i++) {
      const wrapper = this.blockElements.get(blocks[i].id);
      if (!wrapper) continue;
      const ol = wrapper.querySelector('ol') as HTMLOListElement;
      if (ol) {
        ol.setAttribute('start', String(i - runStart + 1));
      }
    }
  }

  private getEditableElement(container: HTMLElement, blockType: BlockType): HTMLElement | null {
    if (blockType === 'bullet-list' || blockType === 'numbered-list') {
      return container.querySelector('.bs-list-content');
    }
    if (blockType === 'code') {
      return container.querySelector('code');
    }
    if (blockType === 'table') {
      return null; // Table cells handle their own editing
    }
    return container.querySelector('[contenteditable="true"]');
  }

  // ============================================================
  // BLOCK EVENT HANDLERS
  // ============================================================

  private attachBlockListeners(
    editable: HTMLElement,
    blockId: string,
    blockType: BlockType
  ): void {
    const debouncedSave = debounce(() => this.saveBlockContent(blockId), 300);
    this.blockDebouncedSaves.set(blockId, debouncedSave);

    editable.addEventListener('input', () => {
      debouncedSave();
      if (blockType !== 'code') {
        // Markdown shortcuts only trigger in paragraph blocks
        if (blockType === 'paragraph') {
          if (this.handleMarkdownShortcut(editable, blockId)) return;
        }
        this.handleSlashInput(editable, blockId);
      }
    });

    editable.addEventListener('keydown', (e) => {
      // Let menus handle first
      if (this.slashMenu.isVisible() && this.slashMenu.handleKeyDown(e)) return;
      if (this.aiMenu.isVisible() && this.aiMenu.handleKeyDown(e)) return;

      this.handleBlockKeyDown(e, editable, blockId, blockType);
    });

    editable.addEventListener('focus', () => {
      this.focusedBlockId = blockId;
      this.eventBus.emit('block:focused', { blockId });
    });

    editable.addEventListener('paste', (e) => {
      e.preventDefault();
      const html = e.clipboardData?.getData('text/html');
      const text = e.clipboardData?.getData('text/plain') || '';

      if (html) {
        const sanitized = sanitizeHtml(html);
        document.execCommand('insertHTML', false, sanitized);
      } else {
        document.execCommand('insertText', false, text);
      }

      this.saveBlockContent(blockId);
    });
  }

  private handleBlockKeyDown(
    e: KeyboardEvent,
    editable: HTMLElement,
    blockId: string,
    blockType: BlockType
  ): void {
    const caretPos = getCaretPosition(editable, this.shadowRoot!);
    const textLen = editable.textContent?.length || 0;
    const isCode = blockType === 'code';

    // Code blocks: Tab inserts a tab character, Shift+Tab removes one
    if (e.key === 'Tab' && isCode) {
      e.preventDefault();
      if (e.shiftKey) {
        // Remove leading tab or 2 spaces from current line
        const sel = getShadowSelection(this.shadowRoot!);
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const node = range.startContainer;
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            const offset = range.startOffset;
            // Find start of current line
            const before = text.slice(0, offset);
            const lineStart = before.lastIndexOf('\n') + 1;
            const linePrefix = text.slice(lineStart, offset);
            if (linePrefix.startsWith('\t')) {
              node.textContent = text.slice(0, lineStart) + text.slice(lineStart + 1);
              range.setStart(node, Math.max(offset - 1, lineStart));
              range.collapse(true);
            } else if (linePrefix.startsWith('  ')) {
              node.textContent = text.slice(0, lineStart) + text.slice(lineStart + 2);
              range.setStart(node, Math.max(offset - 2, lineStart));
              range.collapse(true);
            }
          }
        }
      } else {
        document.execCommand('insertText', false, '  ');
      }
      return;
    }

    // Code block: Shift+Enter exits to a new paragraph below
    if (isCode && e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      this.saveBlockContent(blockId);
      const newBlock = createBlock('paragraph');
      const currentIndex = this.editorState.getBlockIndex(blockId);
      this.commandManager.execute(
        new InsertBlockCommand(this.editorState, newBlock, currentIndex + 1)
      );
      requestAnimationFrame(() => this.focusBlock(newBlock.id, 'start'));
      return;
    }

    // Code block: Escape exits to a new paragraph below
    // Escape blurs contenteditable in all browsers, so we use setTimeout
    // to focus the new block after the browser finishes its blur handling
    if (isCode && e.key === 'Escape') {
      e.preventDefault();
      this.saveBlockContent(blockId);
      const newBlock = createBlock('paragraph');
      const currentIndex = this.editorState.getBlockIndex(blockId);
      this.commandManager.execute(
        new InsertBlockCommand(this.editorState, newBlock, currentIndex + 1)
      );
      requestAnimationFrame(() => this.focusBlock(newBlock.id, 'start'));
      return;
    }

    // Code block: Backspace on empty code block deletes it
    if (isCode && e.key === 'Backspace' && textLen === 0) {
      e.preventDefault();
      const blocks = this.editorState.getBlocks();
      if (blocks.length <= 1) return;
      const currentIndex = this.editorState.getBlockIndex(blockId);
      const prevBlock = currentIndex > 0 ? blocks[currentIndex - 1] : null;
      this.commandManager.execute(new DeleteBlockCommand(this.editorState, blockId));
      if (prevBlock) {
        requestAnimationFrame(() => this.focusBlock(prevBlock.id, 'end'));
      }
      return;
    }

    // Code block: Arrow up at very start exits to previous block
    if (isCode && e.key === 'ArrowUp' && caretPos === 0) {
      const currentIndex = this.editorState.getBlockIndex(blockId);
      if (currentIndex > 0) {
        e.preventDefault();
        const prevBlock = this.editorState.getBlocks()[currentIndex - 1];
        this.focusBlock(prevBlock.id, 'end');
      }
      return;
    }

    // Code block: Arrow down at very end exits to next block
    if (isCode && e.key === 'ArrowDown' && caretPos === textLen) {
      const blocks = this.editorState.getBlocks();
      const currentIndex = this.editorState.getBlockIndex(blockId);
      if (currentIndex < blocks.length - 1) {
        e.preventDefault();
        this.focusBlock(blocks[currentIndex + 1].id, 'start');
      }
      return;
    }

    // Code block: Enter inserts a newline (browser default)
    if (isCode && e.key === 'Enter') {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.saveBlockContent(blockId);

      // Determine what block type to create next
      const currentBlock = this.editorState.getBlock(blockId);
      const currentType = currentBlock?.type;
      const isList = currentType === 'bullet-list' || currentType === 'numbered-list';

      if (isList && textLen === 0) {
        // Empty list item: convert to paragraph (exit the list)
        this.blockDebouncedSaves.get(blockId)?.cancel();
        this.editorState.updateBlock(blockId, {
          content: [{ type: 'text', text: '', marks: [] }],
        });
        this.commandManager.execute(
          new ChangeBlockTypeCommand(this.editorState, blockId, 'paragraph', {})
        );
        requestAnimationFrame(() => this.focusBlock(blockId, 'start'));
        return;
      }

      // Continue with same type for lists, paragraph for everything else
      const newBlock = isList
        ? createBlock(currentType as BlockType)
        : createBlock('paragraph');
      const currentIndex = this.editorState.getBlockIndex(blockId);
      this.commandManager.execute(
        new InsertBlockCommand(this.editorState, newBlock, currentIndex + 1)
      );

      requestAnimationFrame(() => this.focusBlock(newBlock.id, 'start'));
    }

    if (e.key === 'Backspace' && caretPos === 0) {
      const block = this.editorState.getBlock(blockId);
      if (!block) return;

      const isNonParagraph = block.type !== 'paragraph' && block.type !== 'code';

      if (isNonParagraph) {
        // Any non-paragraph/code block: Backspace at start converts to paragraph
        e.preventDefault();
        this.blockDebouncedSaves.get(blockId)?.cancel();
        this.commandManager.execute(
          new ChangeBlockTypeCommand(this.editorState, blockId, 'paragraph', {})
        );
        requestAnimationFrame(() => this.focusBlock(blockId, 'start'));
        return;
      }

      if (textLen === 0) {
        // Empty paragraph: delete it and focus previous
        e.preventDefault();
        const blocks = this.editorState.getBlocks();

        if (blocks.length <= 1) return; // Keep at least one block

        const currentIndex = this.editorState.getBlockIndex(blockId);
        const prevBlock = currentIndex > 0 ? blocks[currentIndex - 1] : null;

        this.commandManager.execute(new DeleteBlockCommand(this.editorState, blockId));

        if (prevBlock) {
          requestAnimationFrame(() => this.focusBlock(prevBlock.id, 'end'));
        }
      }
    }

    // Arrow up at start of block -> focus previous
    if (e.key === 'ArrowUp' && caretPos === 0 && !isCode) {
      const currentIndex = this.editorState.getBlockIndex(blockId);
      if (currentIndex > 0) {
        e.preventDefault();
        const prevBlock = this.editorState.getBlocks()[currentIndex - 1];
        this.focusBlock(prevBlock.id, 'end');
      }
    }

    // Arrow down at end of block -> focus next
    if (e.key === 'ArrowDown' && caretPos === textLen && !isCode) {
      const blocks = this.editorState.getBlocks();
      const currentIndex = this.editorState.getBlockIndex(blockId);
      if (currentIndex < blocks.length - 1) {
        e.preventDefault();
        this.focusBlock(blocks[currentIndex + 1].id, 'start');
      }
    }
  }

  // ============================================================
  // MARKDOWN SHORTCUTS (triggered on input, e.g. "# " -> heading)
  // ============================================================

  private handleMarkdownShortcut(editable: HTMLElement, blockId: string): boolean {
    const text = editable.textContent || '';
    const shortcut = matchMarkdownShortcut(text);
    if (!shortcut) return false;

    // Cancel any pending debounced save
    this.blockDebouncedSaves.get(blockId)?.cancel();

    // Clear content first, then change type
    this.editorState.updateBlock(blockId, {
      content: [{ type: 'text', text: '', marks: [] }],
    });
    this.commandManager.execute(
      new ChangeBlockTypeCommand(
        this.editorState,
        blockId,
        shortcut.blockType,
        shortcut.props
      )
    );
    requestAnimationFrame(() => this.focusBlock(blockId, 'start'));
    return true;
  }

  // ============================================================
  // SLASH MENU
  // ============================================================

  private handleSlashInput(editable: HTMLElement, blockId: string): void {
    const text = editable.textContent || '';

    if (text === '/') {
      this.slashFilterStart = 1;
      const rect = editable.getBoundingClientRect();
      this.slashMenu.show(
        this.blockRegistry.getAll(),
        rect.left,
        rect.bottom + 4,
        (def) => {
          this.selectSlashItem(def, blockId, editable);
        },
        () => {
          this.slashMenu.hide();
          this.slashFilterStart = null;
        }
      );
    } else if (this.slashMenu.isVisible() && this.slashFilterStart !== null) {
      if (text.startsWith('/')) {
        const query = text.slice(1);
        this.slashMenu.updateFilter(query);
      } else {
        this.slashMenu.hide();
        this.slashFilterStart = null;
      }
    }
  }

  private selectSlashItem(def: BlockDefinition, blockId: string, _editable: HTMLElement): void {
    this.slashMenu.hide();
    this.slashFilterStart = null;

    // Cancel any pending debounced save so it doesn't restore the slash text
    this.blockDebouncedSaves.get(blockId)?.cancel();

    // Clear the slash command text from state first
    this.editorState.updateBlock(blockId, {
      content: [{ type: 'text', text: '', marks: [] }],
    });

    if (def.type === 'divider' || def.type === 'image' || def.type === 'table') {
      this.commandManager.execute(
        new ChangeBlockTypeCommand(this.editorState, blockId, def.type, def.defaultProps())
      );
    } else {
      // Convert current block to the selected type
      this.commandManager.execute(
        new ChangeBlockTypeCommand(this.editorState, blockId, def.type, def.defaultProps())
      );
    }

    // Focus the newly converted block
    requestAnimationFrame(() => this.focusBlock(blockId, 'start'));
  }

  // ============================================================
  // TOOLBAR (selection-based)
  // ============================================================

  private handleSelectionChange = (): void => {
    // Don't dismiss toolbar while AI edit input or link input is active
    if (this.toolbar.isEditingWithAI() || this.toolbar.isEditingLink()) return;

    const sel = getShadowSelection(this.shadowRoot!);
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      this.toolbar.hide();
      return;
    }

    // Check if selection is within our shadow DOM
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    if (!this.shadowRoot?.contains(container)) {
      this.toolbar.hide();
      return;
    }

    // Build AI context for the toolbar
    const focusedBlock = this.focusedBlockId
      ? this.editorState.getBlock(this.focusedBlockId)
      : null;

    let aiContext: AIActionContext | undefined;
    if (focusedBlock) {
      aiContext = {
        selectedText: getSelectedText(this.shadowRoot!),
        selectedBlocks: [focusedBlock],
        cursorBlockId: focusedBlock.id,
        editorState: this.editorState,
        commandManager: this.commandManager,
      };
    }

    const rect = range.getBoundingClientRect();
    this.toolbar.show(
      rect.left + rect.width / 2 - 120,
      rect.top,
      () => {
        // Format applied — save content of focused block
        if (this.focusedBlockId) {
          this.saveBlockContent(this.focusedBlockId);
        }
      },
      aiContext,
      rect.bottom,
      this.focusedBlockId
    );
  };

  // ============================================================
  // GLOBAL KEYBOARD SHORTCUTS
  // ============================================================

  private handleGlobalKeyDown(e: KeyboardEvent): void {
    const mod = e.metaKey || e.ctrlKey;

    // Undo
    if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    }

    // Redo
    if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      this.redo();
    }

    // Bold
    if (mod && e.key === 'b') {
      e.preventDefault();
      document.execCommand('bold', false);
      if (this.focusedBlockId) this.saveBlockContent(this.focusedBlockId);
    }

    // Italic
    if (mod && e.key === 'i') {
      e.preventDefault();
      document.execCommand('italic', false);
      if (this.focusedBlockId) this.saveBlockContent(this.focusedBlockId);
    }

    // Underline
    if (mod && e.key === 'u') {
      e.preventDefault();
      document.execCommand('underline', false);
      if (this.focusedBlockId) this.saveBlockContent(this.focusedBlockId);
    }

    // AI menu (Ctrl+J)
    if (mod && e.key === 'j') {
      e.preventDefault();
      this.openAIMenu();
    }
  }

  // ============================================================
  // AI MENU
  // ============================================================

  private openAIMenu(): void {
    if (!this.aiManager.getProvider()) return;

    const focusedBlock = this.focusedBlockId
      ? this.editorState.getBlock(this.focusedBlockId)
      : null;

    if (!focusedBlock) return;

    const wrapper = this.blockElements.get(focusedBlock.id);
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();

    const context: AIActionContext = {
      selectedText: getSelectedText(this.shadowRoot!),
      selectedBlocks: focusedBlock ? [focusedBlock] : [],
      cursorBlockId: focusedBlock.id,
      editorState: this.editorState,
      commandManager: this.commandManager,
    };

    this.aiMenu.show(rect.left, rect.bottom + 4, context, () => {
      this.aiMenu.hide();
    });
  }

  // ============================================================
  // DRAG & DROP
  // ============================================================

  private draggedBlockId: string | null = null;
  private dropPosition: 'top' | 'bottom' | null = null;

  /* ── Block context menu (shown on drag handle click) ── */

  private showBlockContextMenu(anchor: HTMLElement, blockId: string): void {
    // Remove any existing context menu
    this.shadowRoot!.querySelector('.bs-block-context-menu')?.remove();

    const wrapper = anchor.closest('.bs-block') as HTMLElement;
    if (!wrapper) return;

    const menu = document.createElement('div');
    menu.className = 'bs-block-context-menu';

    // Position relative to the wrapper (which has position: relative)
    menu.style.position = 'absolute';
    menu.style.left = `${anchor.offsetLeft + anchor.offsetWidth + 4}px`;
    menu.style.top = `${anchor.offsetTop}px`;
    menu.style.zIndex = '1020';

    // Delete option
    const deleteItem = document.createElement('button');
    deleteItem.className = 'bs-block-context-item bs-block-context-delete';
    deleteItem.textContent = '🗑 Delete';
    deleteItem.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      menu.remove();
      this.editorState.removeBlock(blockId);
    });
    menu.appendChild(deleteItem);

    wrapper.appendChild(menu);

    // Dismiss on outside click
    const dismiss = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('mousedown', dismiss);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
  }

  private handleDragStart(e: DragEvent, blockId: string): void {
    this.draggedBlockId = blockId;
    e.dataTransfer!.effectAllowed = 'move';
    const wrapper = this.blockElements.get(blockId);
    if (wrapper) wrapper.classList.add('dragging');
  }

  private handleDragOver(e: DragEvent, wrapper: HTMLElement): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';

    // Don't show indicator on the dragged block itself
    const blockId = wrapper.getAttribute('data-block-id');
    if (blockId === this.draggedBlockId) return;

    // Calculate whether cursor is in top or bottom half
    const rect = wrapper.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const isTopHalf = e.clientY < midpoint;

    // Clear previous indicator on this wrapper
    wrapper.classList.remove('drag-over-top', 'drag-over-bottom');

    if (isTopHalf) {
      wrapper.classList.add('drag-over-top');
      this.dropPosition = 'top';
    } else {
      wrapper.classList.add('drag-over-bottom');
      this.dropPosition = 'bottom';
    }

    // Clear indicators on other blocks
    this.blockElements.forEach((el, id) => {
      if (id !== blockId) {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      }
    });
  }

  private handleDragLeave(e: DragEvent, wrapper: HTMLElement): void {
    // Only remove if we're truly leaving (not entering a child)
    const related = e.relatedTarget as Node | null;
    if (related && wrapper.contains(related)) return;
    wrapper.classList.remove('drag-over-top', 'drag-over-bottom');
  }

  private handleDrop(e: DragEvent, targetBlockId: string, wrapper: HTMLElement): void {
    e.preventDefault();

    if (!this.draggedBlockId || this.draggedBlockId === targetBlockId) {
      this.clearDrag();
      return;
    }

    const targetIndex = this.editorState.getBlockIndex(targetBlockId);
    const draggedIndex = this.editorState.getBlockIndex(this.draggedBlockId);

    // Calculate new index based on drop position (top = before target, bottom = after target)
    let newIndex: number;
    if (this.dropPosition === 'top') {
      newIndex = targetIndex;
    } else {
      newIndex = targetIndex + 1;
    }

    // Adjust if we're moving downward (removing from above shifts indices down)
    if (draggedIndex < newIndex) {
      newIndex--;
    }

    wrapper.classList.remove('drag-over-top', 'drag-over-bottom');

    this.commandManager.execute(
      new MoveBlockCommand(this.editorState, this.draggedBlockId, newIndex)
    );

    this.clearDrag();
    this.renderAllBlocks();
  }

  private clearDrag(): void {
    if (this.draggedBlockId) {
      const wrapper = this.blockElements.get(this.draggedBlockId);
      if (wrapper) wrapper.classList.remove('dragging');
      this.draggedBlockId = null;
    }
    this.dropPosition = null;
    // Remove all drop indicators
    this.blockElements.forEach((el) => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
  }

  // ============================================================
  // CONTENT SYNC
  // ============================================================

  private saveBlockContent(blockId: string): void {
    const wrapper = this.blockElements.get(blockId);
    if (!wrapper) return;

    const block = this.editorState.getBlock(blockId);
    if (!block) return;

    const def = this.blockRegistry.get(block.type);
    if (!def || !def.hasContent) return;

    const contentEl = wrapper.querySelector('.bs-block-content')?.firstElementChild as HTMLElement;
    if (!contentEl) return;

    const content = def.parseContent(contentEl);
    if (content) {
      // Suppress re-render: the DOM is already correct, we're just syncing to state
      this.suppressRerender = true;
      this.editorState.updateBlock(blockId, { content });
      this.suppressRerender = false;
    }
  }

  // ============================================================
  // FOCUS MANAGEMENT
  // ============================================================

  private focusBlock(blockId: string, position?: 'start' | 'end'): void {
    const wrapper = this.blockElements.get(blockId);
    if (!wrapper) return;

    const block = this.editorState.getBlock(blockId);
    if (!block) return;

    const editable = this.getEditableElement(
      wrapper.querySelector('.bs-block-content') as HTMLElement,
      block.type
    );

    if (editable) {
      editable.focus();
      if (position) {
        setCaretPosition(editable, position);
      }
      this.focusedBlockId = blockId;
    }
  }

  // ============================================================
  // PUBLIC API (EditorInstance)
  // ============================================================

  getDocument() {
    return this.editorState.toDocument();
  }

  setDocument(doc: import('../model/types.js').EditorDocument): void {
    this.editorState = new EditorState(this.eventBus, doc);
    this.renderAllBlocks();
  }

  insertBlock(type: BlockType, afterId?: string): Block {
    const block = createBlock(type);
    let index = this.editorState.getBlocks().length;
    if (afterId) {
      const idx = this.editorState.getBlockIndex(afterId);
      if (idx >= 0) index = idx + 1;
    }
    this.commandManager.execute(new InsertBlockCommand(this.editorState, block, index));
    return block;
  }

  removeBlock(id: string): void {
    this.commandManager.execute(new DeleteBlockCommand(this.editorState, id));
  }

  updateBlock(id: string, partial: Partial<Block>): void {
    this.editorState.updateBlock(id, partial);
  }

  getBlock(id: string): Block | undefined {
    return this.editorState.getBlock(id);
  }

  focusEditor(blockId?: string): void {
    if (blockId) {
      this.focusBlock(blockId, 'end');
    } else {
      const blocks = this.editorState.getBlocks();
      if (blocks.length > 0) {
        this.focusBlock(blocks[0].id, 'start');
      }
    }
  }

  undo(): void {
    this.commandManager.undo();
    this.renderAllBlocks();
  }

  redo(): void {
    this.commandManager.redo();
    this.renderAllBlocks();
  }

  registerAIProvider(provider: import('../model/types.js').AIProvider): void {
    this.aiManager.setProvider(provider);
  }

  registerPlugin(plugin: import('../plugins/PluginTypes.js').EditorPlugin): void {
    this.pluginManager.register(plugin);
  }

  getPlugin<T extends import('../plugins/PluginTypes.js').EditorPlugin = import('../plugins/PluginTypes.js').EditorPlugin>(id: string): T | undefined {
    return this.pluginManager.get<T>(id);
  }

  exportHTML(title = 'Blocksmith Document'): string {
    // Use the HTMLExportPlugin if registered
    let plugin = this.pluginManager.get<import('../plugins/builtin/HTMLExportPlugin.js').HTMLExportPlugin>('html-export');

    // If the plugin isn't registered, create a temporary one with the
    // current editor state so we always produce rendered HTML (never raw JSON).
    if (!plugin || typeof plugin.exportHTML !== 'function') {
      const tempPlugin = new HTMLExportPlugin();
      tempPlugin.init({
        editorState: this.editorState,
        eventBus: this.eventBus,
        commandManager: this.commandManager,
      });
      plugin = tempPlugin;
    }

    const html = plugin!.exportHTML(title);

    // Dispatch a DOM CustomEvent so external listeners can grab the content
    this.dispatchEvent(new CustomEvent('bs-export-html', {
      bubbles: true,
      composed: true,
      detail: { html, title },
    }));
    return html;
  }

  destroy(): void {
    this.pluginManager.destroyAll();
    document.removeEventListener('selectionchange', this.handleSelectionChange);
    this.eventBus.destroy();
    this.editorContainer.innerHTML = '';
    this.blockElements.clear();
  }
}
