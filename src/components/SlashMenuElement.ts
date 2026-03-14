import type { BlockDefinition } from '../model/types.js';

export class SlashMenuElement {
  private element: HTMLDivElement;
  private items: BlockDefinition[] = [];
  private filteredItems: BlockDefinition[] = [];
  private activeIndex = 0;
  private onSelect: ((def: BlockDefinition) => void) | null = null;
  private onClose: (() => void) | null = null;
  private filter = '';

  constructor(private shadowRoot: ShadowRoot) {
    this.element = document.createElement('div');
    this.element.className = 'bs-slash-menu';
    this.element.style.display = 'none';
  }

  show(
    items: BlockDefinition[],
    x: number,
    y: number,
    onSelect: (def: BlockDefinition) => void,
    onClose: () => void
  ): void {
    this.items = items;
    this.filteredItems = items;
    this.activeIndex = 0;
    this.onSelect = onSelect;
    this.onClose = onClose;
    this.filter = '';

    this.element.style.display = 'block';
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;

    this.render();
    this.shadowRoot.appendChild(this.element);
  }

  hide(): void {
    this.element.style.display = 'none';
    this.element.remove();
    this.onSelect = null;
    this.onClose = null;
  }

  isVisible(): boolean {
    return this.element.style.display !== 'none';
  }

  updateFilter(query: string): void {
    this.filter = query.toLowerCase();
    this.filteredItems = this.items.filter((item) => {
      const matchName = item.displayName.toLowerCase().includes(this.filter);
      const matchKeywords = item.slashMenuKeywords?.some((k) =>
        k.toLowerCase().includes(this.filter)
      );
      return matchName || matchKeywords;
    });
    this.activeIndex = 0;

    if (this.filteredItems.length === 0) {
      this.onClose?.();
      return;
    }

    this.render();
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    if (!this.isVisible()) return false;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.activeIndex = (this.activeIndex + 1) % this.filteredItems.length;
        this.render();
        return true;
      case 'ArrowUp':
        e.preventDefault();
        this.activeIndex =
          (this.activeIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
        this.render();
        return true;
      case 'Enter':
        e.preventDefault();
        if (this.filteredItems[this.activeIndex]) {
          this.onSelect?.(this.filteredItems[this.activeIndex]);
        }
        return true;
      case 'Escape':
        e.preventDefault();
        this.onClose?.();
        return true;
    }
    return false;
  }

  private render(): void {
    this.element.innerHTML = '';
    this.filteredItems.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = `bs-slash-menu-item${index === this.activeIndex ? ' active' : ''}`;

      const icon = document.createElement('span');
      icon.className = 'bs-slash-menu-item-icon';
      icon.textContent = item.icon || item.type[0].toUpperCase();

      const label = document.createElement('span');
      label.className = 'bs-slash-menu-item-label';
      label.textContent = item.displayName;

      el.appendChild(icon);
      el.appendChild(label);

      el.addEventListener('click', () => {
        this.onSelect?.(item);
      });

      this.element.appendChild(el);
    });
  }
}
