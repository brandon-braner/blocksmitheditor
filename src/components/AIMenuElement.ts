import type { AIAction, AIActionContext } from '../model/types.js';
import type { AIManager } from '../ai/AIManager.js';

export class AIMenuElement {
  private element: HTMLDivElement;
  private activeIndex = 0;
  private actions: AIAction[] = [];
  private context: AIActionContext | null = null;
  private onClose: (() => void) | null = null;

  constructor(
    private shadowRoot: ShadowRoot,
    private aiManager: AIManager
  ) {
    this.element = document.createElement('div');
    this.element.className = 'bs-ai-menu';
    this.element.style.display = 'none';
  }

  show(
    x: number,
    y: number,
    context: AIActionContext,
    onClose: () => void
  ): void {
    this.context = context;
    this.onClose = onClose;
    this.actions = this.aiManager.getActions().filter((a) =>
      a.requiresSelection ? context.selectedText.length > 0 : true
    );
    this.activeIndex = 0;

    this.element.style.display = 'block';
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;

    this.render();
    this.shadowRoot.appendChild(this.element);
  }

  hide(): void {
    this.element.style.display = 'none';
    this.element.remove();
    this.context = null;
    this.onClose = null;
  }

  isVisible(): boolean {
    return this.element.style.display !== 'none';
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    if (!this.isVisible()) return false;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.activeIndex = (this.activeIndex + 1) % this.getVisibleCount();
        this.render();
        return true;
      case 'ArrowUp':
        e.preventDefault();
        this.activeIndex =
          (this.activeIndex - 1 + this.getVisibleCount()) % this.getVisibleCount();
        this.render();
        return true;
      case 'Enter':
        e.preventDefault();
        this.selectCurrent();
        return true;
      case 'Escape':
        e.preventDefault();
        this.onClose?.();
        return true;
    }
    return false;
  }

  private getVisibleCount(): number {
    // +1 for the write input
    return this.actions.length + 1;
  }

  private async selectCurrent(): Promise<void> {
    if (!this.context) return;

    if (this.activeIndex === 0) {
      // "Write with AI" - show input
      this.showWriteInput();
      return;
    }

    const action = this.actions[this.activeIndex - 1];
    if (action) {
      this.showLoading();
      try {
        await this.aiManager.executeAction(action.id, this.context);
      } catch (err) {
        console.error('AI action failed:', err);
      }
      this.onClose?.();
    }
  }

  private showWriteInput(): void {
    this.element.innerHTML = '';

    const input = document.createElement('input');
    input.className = 'bs-ai-input';
    input.placeholder = 'Tell AI what to write...';
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        e.preventDefault();
        if (!this.context) return;

        // Override the selected text with the user's prompt
        const writeContext: AIActionContext = {
          ...this.context,
          selectedText: input.value.trim(),
        };

        this.showLoading();
        try {
          await this.aiManager.executeAction('write', writeContext);
        } catch (err) {
          console.error('AI write failed:', err);
        }
        this.onClose?.();
      } else if (e.key === 'Escape') {
        this.onClose?.();
      }
    });

    this.element.appendChild(input);
    input.focus();
  }

  private showLoading(): void {
    this.element.innerHTML = '';
    const loading = document.createElement('div');
    loading.className = 'bs-ai-loading';
    loading.textContent = 'AI is writing';
    this.element.appendChild(loading);
  }

  private render(): void {
    this.element.innerHTML = '';

    // Write option (always first)
    const writeItem = document.createElement('div');
    writeItem.className = `bs-ai-menu-item${this.activeIndex === 0 ? ' active' : ''}`;
    writeItem.textContent = '✍ Write with AI...';
    writeItem.addEventListener('click', () => {
      this.activeIndex = 0;
      this.selectCurrent();
    });
    this.element.appendChild(writeItem);

    // Other actions
    this.actions.forEach((action, index) => {
      const item = document.createElement('div');
      item.className = `bs-ai-menu-item${this.activeIndex === index + 1 ? ' active' : ''}`;
      item.textContent = `${action.icon || ''} ${action.label}`;
      item.addEventListener('click', async () => {
        if (!this.context) return;
        this.showLoading();
        try {
          await this.aiManager.executeAction(action.id, this.context);
        } catch (err) {
          console.error('AI action failed:', err);
        }
        this.onClose?.();
      });
      this.element.appendChild(item);
    });
  }
}
