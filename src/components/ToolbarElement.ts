import type { InlineMark, AIActionContext } from '../model/types.js';
import type { AIManager } from '../ai/AIManager.js';
import { getShadowSelection } from '../utils/dom.js';

// ============================================================
// TEXT COLORS
// ============================================================

const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#e03e3e' },
  { label: 'Orange', value: '#d9730d' },
  { label: 'Yellow', value: '#cb8a00' },
  { label: 'Green', value: '#0f7b6c' },
  { label: 'Blue', value: '#0b6e99' },
  { label: 'Purple', value: '#6940a5' },
  { label: 'Pink', value: '#ad1a72' },
  { label: 'Gray', value: '#9b9a97' },
];

// ============================================================
// FORMATTING BUTTONS
// ============================================================

interface FormatButton {
  id: string;
  label: string;
  icon: string;
  title: string;
  action: 'command' | 'mark' | 'custom';
  command?: string;
  mark?: InlineMark;
}

const FORMAT_BUTTONS: FormatButton[] = [
  { id: 'bold', label: 'B', icon: 'B', title: 'Bold (Ctrl+B)', action: 'command', command: 'bold' },
  { id: 'italic', label: 'I', icon: 'I', title: 'Italic (Ctrl+I)', action: 'command', command: 'italic' },
  { id: 'underline', label: 'U', icon: 'U', title: 'Underline (Ctrl+U)', action: 'command', command: 'underline' },
  { id: 'link', label: '🔗', icon: '🔗', title: 'Create link', action: 'custom' },
  { id: 'strikethrough', label: 'S', icon: 'S', title: 'Strikethrough', action: 'command', command: 'strikeThrough' },
  { id: 'code', label: '</>', icon: '</>', title: 'Inline code', action: 'mark', mark: 'code' },
  { id: 'highlight', label: '✨', icon: '✨', title: 'Highlight', action: 'custom' },
];

// ============================================================
// AI ACTIONS
// ============================================================

interface AIMenuItem {
  id: string;
  label: string;
  icon: string;
  requiresSelection: boolean;
}

const AI_MENU_ITEMS: AIMenuItem[] = [
  { id: 'improve', label: 'Improve writing', icon: '✍️', requiresSelection: true },
  { id: 'proofread', label: 'Proofread', icon: '✅', requiresSelection: true },
  { id: 'explain', label: 'Explain', icon: '💡', requiresSelection: true },
  { id: 'reformat', label: 'Reformat', icon: '✨', requiresSelection: true },
  { id: 'editWithAI', label: 'Edit with AI', icon: '🤖', requiresSelection: true },
];

// ============================================================
// TOOLBAR ELEMENT
// ============================================================

export class ToolbarElement {
  private element: HTMLDivElement;
  private colorPopover: HTMLDivElement | null = null;
  private linkInput: HTMLDivElement | null = null;
  private onFormat: (() => void) | null = null;
  private aiManager: AIManager | null = null;
  private aiContext: AIActionContext | null = null;
  private savedRange: Range | null = null;

  constructor(private shadowRoot: ShadowRoot) {
    this.element = document.createElement('div');
    this.element.className = 'bs-toolbar';
    this.element.style.display = 'none';
  }

  setAIManager(aiManager: AIManager): void {
    this.aiManager = aiManager;
  }

  // ============================================================
  // BUILD UI
  // ============================================================

  private buildUI(): void {
    this.element.innerHTML = '';

    // === Top row: Formatting buttons ===
    const formatRow = document.createElement('div');
    formatRow.className = 'bs-toolbar-row';

    // Text color button
    const colorBtn = document.createElement('button');
    colorBtn.className = 'bs-toolbar-btn bs-toolbar-btn-color';
    colorBtn.innerHTML = '<span style="border-bottom: 2px solid currentColor;">A</span>';
    colorBtn.title = 'Text color';
    colorBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleColorPopover();
    });
    formatRow.appendChild(colorBtn);

    // Separator
    formatRow.appendChild(this.createSeparator());

    // Format buttons
    for (const btn of FORMAT_BUTTONS) {
      const button = document.createElement('button');
      button.className = 'bs-toolbar-btn';
      if (btn.id === 'bold') button.style.fontWeight = '700';
      if (btn.id === 'italic') button.style.fontStyle = 'italic';
      if (btn.id === 'underline') button.style.textDecoration = 'underline';
      if (btn.id === 'strikethrough') button.style.textDecoration = 'line-through';
      button.textContent = btn.icon;
      button.title = btn.title;
      button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.handleFormatClick(btn);
      });
      formatRow.appendChild(button);
    }

    this.element.appendChild(formatRow);

    // === Divider ===
    const divider = document.createElement('div');
    divider.className = 'bs-toolbar-divider';
    this.element.appendChild(divider);

    // === Bottom row: AI actions ===
    const aiRow = document.createElement('div');
    aiRow.className = 'bs-toolbar-row bs-toolbar-ai-row';

    for (const item of AI_MENU_ITEMS) {
      const aiBtn = document.createElement('button');
      aiBtn.className = 'bs-toolbar-ai-item';
      aiBtn.innerHTML = `<span class="bs-toolbar-ai-icon">${item.icon}</span> ${item.label}`;
      aiBtn.title = item.label;
      aiBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.handleAIClick(item);
      });
      aiRow.appendChild(aiBtn);
    }

    this.element.appendChild(aiRow);
  }

  private createSeparator(): HTMLDivElement {
    const sep = document.createElement('div');
    sep.className = 'bs-toolbar-separator';
    return sep;
  }

  // ============================================================
  // FORMAT ACTIONS
  // ============================================================

  private handleFormatClick(btn: FormatButton): void {
    this.restoreSelection();

    if (btn.action === 'command' && btn.command) {
      document.execCommand(btn.command, false);
    } else if (btn.action === 'mark' && btn.mark === 'code') {
      // Code inline: wrap selection in <code> tag
      const sel = getShadowSelection(this.shadowRoot);
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const code = document.createElement('code');
        try {
          range.surroundContents(code);
        } catch {
          // If the selection spans multiple elements, fall back
          const fragment = range.extractContents();
          code.appendChild(fragment);
          range.insertNode(code);
        }
      }
    } else if (btn.id === 'link') {
      this.showLinkInput();
      return; // Don't call onFormat yet
    } else if (btn.id === 'highlight') {
      this.applyHighlight();
    }
    this.onFormat?.();
  }

  private applyHighlight(): void {
    const sel = getShadowSelection(this.shadowRoot);
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // Check if already highlighted
      const parent = range.commonAncestorContainer.parentElement;
      if (parent?.tagName.toLowerCase() === 'mark') {
        // Remove highlight: unwrap the mark
        const text = document.createTextNode(parent.textContent || '');
        parent.replaceWith(text);
      } else {
        const mark = document.createElement('mark');
        try {
          range.surroundContents(mark);
        } catch {
          const fragment = range.extractContents();
          mark.appendChild(fragment);
          range.insertNode(mark);
        }
      }
    }
  }

  // ============================================================
  // TEXT COLOR POPOVER
  // ============================================================

  private toggleColorPopover(): void {
    if (this.colorPopover) {
      this.hideColorPopover();
      return;
    }

    this.saveSelection();

    this.colorPopover = document.createElement('div');
    this.colorPopover.className = 'bs-color-popover';

    const label = document.createElement('div');
    label.className = 'bs-color-popover-label';
    label.textContent = 'Text color';
    this.colorPopover.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'bs-color-grid';

    for (const color of TEXT_COLORS) {
      const swatch = document.createElement('button');
      swatch.className = 'bs-color-swatch';
      swatch.title = color.label;
      if (color.value) {
        swatch.style.background = color.value;
      } else {
        swatch.style.background = '#1a1a1a';
        swatch.innerHTML = '⊘';
        swatch.style.fontSize = '14px';
        swatch.style.color = '#9ca3af';
      }
      swatch.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.applyTextColor(color.value);
        this.hideColorPopover();
      });
      grid.appendChild(swatch);
    }

    this.colorPopover.appendChild(grid);
    this.element.appendChild(this.colorPopover);
  }

  private hideColorPopover(): void {
    if (this.colorPopover) {
      this.colorPopover.remove();
      this.colorPopover = null;
    }
  }

  private applyTextColor(color: string): void {
    this.restoreSelection();

    if (!color) {
      // Remove color (default)
      document.execCommand('removeFormat', false);
    } else {
      document.execCommand('foreColor', false, color);
    }
    this.onFormat?.();
  }

  // ============================================================
  // LINK INPUT
  // ============================================================

  private showLinkInput(): void {
    this.saveSelection();
    this.hideLinkInput();

    this.linkInput = document.createElement('div');
    this.linkInput.className = 'bs-toolbar-link-row';

    const input = document.createElement('input');
    input.className = 'bs-toolbar-link-input';
    input.type = 'url';
    input.placeholder = 'Paste or type a link...';
    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // Don't let editor intercept keys
      if (e.key === 'Enter') {
        e.preventDefault();
        const url = input.value.trim();
        if (url) {
          this.applyLink(url);
        }
        this.hideLinkInput();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.hideLinkInput();
      }
    });

    // Prevent mousedown from dismissing toolbar
    input.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    this.linkInput.appendChild(input);
    this.element.appendChild(this.linkInput);

    // Focus the input AFTER appending
    requestAnimationFrame(() => input.focus());
  }

  private hideLinkInput(): void {
    if (this.linkInput) {
      this.linkInput.remove();
      this.linkInput = null;
    }
  }

  private applyLink(url: string): void {
    this.restoreSelection();
    document.execCommand('createLink', false, url);
    this.onFormat?.();
  }

  // ============================================================
  // AI ACTIONS
  // ============================================================

  private aiEditInput: HTMLDivElement | null = null;

  private async handleAIClick(item: AIMenuItem): Promise<void> {
    if (!this.aiManager || !this.aiContext) return;

    const provider = this.aiManager.getProvider();
    if (!provider) {
      console.warn('No AI provider configured');
      return;
    }

    // "Edit with AI" shows a text input for custom instructions
    if (item.id === 'editWithAI') {
      this.showEditInput();
      return;
    }

    // All other actions map directly to their action ID
    const actionId = item.id;
    const action = this.aiManager.getAction(actionId);
    if (!action) {
      console.warn(`AI action "${actionId}" not registered`);
      return;
    }

    await this.executeAIAction(actionId, this.aiContext);
  }

  private async executeAIAction(
    actionId: string,
    context: AIActionContext
  ): Promise<void> {
    if (!this.aiManager) return;

    this.showAILoading();

    try {
      await this.aiManager.executeAction(actionId, context);
    } catch (err) {
      console.error('AI action failed:', err);
    } finally {
      this.hideAILoading();
      this.hide();
    }
  }

  // --- Loading indicator ---

  private showAILoading(): void {
    // Disable all buttons and show loading text
    const buttons = this.element.querySelectorAll('button');
    buttons.forEach((btn) => {
      (btn as HTMLButtonElement).disabled = true;
      (btn as HTMLButtonElement).style.opacity = '0.5';
      (btn as HTMLButtonElement).style.pointerEvents = 'none';
    });

    const loadingBar = document.createElement('div');
    loadingBar.className = 'bs-toolbar-loading';
    loadingBar.innerHTML = '<span class="bs-toolbar-spinner"></span> Thinking...';
    loadingBar.style.cssText =
      'display: flex; align-items: center; gap: 8px; padding: 6px 12px; ' +
      'color: #a78bfa; font-size: 13px; border-top: 1px solid rgba(255,255,255,0.1);';
    this.element.appendChild(loadingBar);
  }

  private hideAILoading(): void {
    const loading = this.element.querySelector('.bs-toolbar-loading');
    loading?.remove();

    const buttons = this.element.querySelectorAll('button');
    buttons.forEach((btn) => {
      (btn as HTMLButtonElement).disabled = false;
      (btn as HTMLButtonElement).style.opacity = '';
      (btn as HTMLButtonElement).style.pointerEvents = '';
    });
  }

  // --- Edit with AI text input ---

  private showEditInput(): void {
    this.saveSelection();
    this.hideEditInput();

    this.aiEditInput = document.createElement('div');
    this.aiEditInput.className = 'bs-toolbar-link-row';

    const input = document.createElement('input');
    input.className = 'bs-toolbar-link-input';
    input.type = 'text';
    input.placeholder = 'Tell AI how to edit this text...';
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        const instruction = input.value.trim();
        if (instruction && this.aiContext) {
          // Pack instruction + original text with separator
          const editContext: AIActionContext = {
            ...this.aiContext,
            selectedText: instruction + '\n---\n' + this.aiContext.selectedText,
          };
          this.hideEditInput();
          this.executeAIAction('editWithAI', editContext);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.hideEditInput();
      }
    });

    input.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    this.aiEditInput.appendChild(input);
    this.element.appendChild(this.aiEditInput);
    requestAnimationFrame(() => input.focus());
  }

  private hideEditInput(): void {
    if (this.aiEditInput) {
      this.aiEditInput.remove();
      this.aiEditInput = null;
    }
  }

  // ============================================================
  // SELECTION MANAGEMENT
  // ============================================================

  private saveSelection(): void {
    const sel = getShadowSelection(this.shadowRoot);
    if (sel && sel.rangeCount > 0) {
      this.savedRange = sel.getRangeAt(0).cloneRange();
    }
  }

  private restoreSelection(): void {
    if (this.savedRange) {
      const sel = getShadowSelection(this.shadowRoot);
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(this.savedRange);
      }
    }
  }

  // ============================================================
  // SHOW / HIDE
  // ============================================================

  show(
    x: number,
    y: number,
    onFormat: () => void,
    aiContext?: AIActionContext,
    selectionBottom?: number
  ): void {
    this.onFormat = onFormat;
    this.aiContext = aiContext || null;
    this.saveSelection();

    this.buildUI();

    // Append off-screen to measure actual height
    this.element.style.display = 'flex';
    this.element.style.visibility = 'hidden';
    this.element.style.top = '0px';
    this.element.style.left = '0px';
    this.element.style.transform = '';
    this.shadowRoot.appendChild(this.element);

    const toolbarHeight = this.element.offsetHeight;
    const showAbove = y > toolbarHeight + 16;

    this.element.style.visibility = '';
    this.element.style.left = `${Math.max(8, x)}px`;
    if (showAbove) {
      this.element.style.top = `${y - 8}px`;
      this.element.style.transform = 'translateY(-100%)';
    } else {
      // Show below the selection
      this.element.style.top = `${(selectionBottom ?? y) + 8}px`;
      this.element.style.transform = '';
    }
  }

  hide(): void {
    this.element.style.display = 'none';
    this.element.style.transform = '';
    this.element.remove();
    this.hideColorPopover();
    this.hideLinkInput();
    this.hideEditInput();
    this.onFormat = null;
    this.aiContext = null;
    this.savedRange = null;
  }

  isEditingWithAI(): boolean {
    return this.aiEditInput !== null;
  }

  isVisible(): boolean {
    return this.element.style.display !== 'none';
  }
}
