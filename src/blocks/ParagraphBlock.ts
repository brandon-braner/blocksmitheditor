import type { BlockDefinition } from '../model/types.js';
import { renderInlineContent, parseInlineContent } from '../utils/dom.js';

export const paragraphBlock: BlockDefinition<'paragraph'> = {
  type: 'paragraph',
  displayName: 'Text',
  icon: '¶',
  hasContent: true,
  placeholder: "Type '/' for commands...",
  slashMenuKeywords: ['text', 'paragraph'],

  defaultProps: () => ({}),

  render(block) {
    const el = document.createElement('div');
    el.className = 'bs-paragraph';
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-placeholder', this.placeholder || '');
    if (block.content && block.content.length > 0) {
      el.innerHTML = renderInlineContent(block.content);
    }
    return el;
  },

  parseContent(element) {
    return parseInlineContent(element);
  },
};
