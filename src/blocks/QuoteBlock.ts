import type { BlockDefinition } from '../model/types.js';
import { renderInlineContent, parseInlineContent } from '../utils/dom.js';

export const quoteBlock: BlockDefinition<'quote'> = {
  type: 'quote',
  displayName: 'Quote',
  icon: '"',
  hasContent: true,
  placeholder: 'Quote...',
  slashMenuKeywords: ['quote', 'blockquote'],

  defaultProps: () => ({}),

  render(block) {
    const el = document.createElement('blockquote');
    el.className = 'bs-quote';
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-placeholder', this.placeholder || '');
    const align = (block.meta?.align as string) || '';
    if (align && align !== 'left') {
      el.style.textAlign = align;
    }
    if (block.content && block.content.length > 0) {
      el.innerHTML = renderInlineContent(block.content);
    }
    return el;
  },

  parseContent(element) {
    return parseInlineContent(element);
  },
};
