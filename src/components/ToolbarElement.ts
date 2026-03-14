import type { InlineMark } from '../model/types.js';

interface ToolbarButton {
  mark: InlineMark;
  label: string;
  command: string;
  shortcut: string;
}

const BUTTONS: ToolbarButton[] = [
  { mark: 'bold', label: 'B', command: 'bold', shortcut: 'Ctrl+B' },
  { mark: 'italic', label: 'I', command: 'italic', shortcut: 'Ctrl+I' },
  { mark: 'code', label: '<>', command: '', shortcut: 'Ctrl+E' },
  { mark: 'strikethrough', label: 'S', command: 'strikeThrough', shortcut: 'Ctrl+Shift+S' },
];

export class ToolbarElement {
  private element: HTMLDivElement;
  private onFormat: ((mark: InlineMark) => void) | null = null;

  constructor(private shadowRoot: ShadowRoot) {
    this.element = document.createElement('div');
    this.element.className = 'bs-toolbar';
    this.element.style.display = 'none';
    this.buildUI();
  }

  private buildUI(): void {
    for (const btn of BUTTONS) {
      const button = document.createElement('button');
      button.className = 'bs-toolbar-btn';
      button.textContent = btn.label;
      button.title = `${btn.mark} (${btn.shortcut})`;
      button.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent losing selection
        this.applyFormat(btn);
      });
      this.element.appendChild(button);
    }
  }

  private applyFormat(btn: ToolbarButton): void {
    if (btn.command) {
      document.execCommand(btn.command, false);
    } else if (btn.mark === 'code') {
      // Code inline: wrap selection in <code> tag
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const code = document.createElement('code');
        range.surroundContents(code);
      }
    }
    this.onFormat?.(btn.mark);
  }

  show(x: number, y: number, onFormat: (mark: InlineMark) => void): void {
    this.onFormat = onFormat;
    this.element.style.display = 'flex';
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y - 40}px`;
    this.shadowRoot.appendChild(this.element);
  }

  hide(): void {
    this.element.style.display = 'none';
    this.element.remove();
    this.onFormat = null;
  }

  isVisible(): boolean {
    return this.element.style.display !== 'none';
  }
}
