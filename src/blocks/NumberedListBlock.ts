import type { BlockDefinition } from '../model/types.js';
import { renderInlineContent, parseInlineContent } from '../utils/dom.js';

export const numberedListBlock: BlockDefinition<'numbered-list'> = {
  type: 'numbered-list',
  displayName: 'Numbered List',
  icon: '1.',
  hasContent: true,
  placeholder: 'List item',
  slashMenuKeywords: ['numbered', 'ordered', 'ol', 'number'],

  defaultProps: () => ({}),

  render(block, context) {
    const wrapper = document.createElement('div');
    wrapper.className = 'bs-numbered-list';

    // Compute number from position in consecutive numbered-list run
    const blocks = context.editorState.getBlocks();
    const idx = blocks.findIndex((b) => b.id === block.id);
    let num = 1;
    for (let i = idx - 1; i >= 0; i--) {
      if (blocks[i].type === 'numbered-list') {
        num++;
      } else {
        break;
      }
    }

    const number = document.createElement('span');
    number.className = 'bs-number';
    number.textContent = `${num}.`;
    number.setAttribute('contenteditable', 'false');

    const content = document.createElement('div');
    content.className = 'bs-list-content';
    content.setAttribute('contenteditable', 'true');
    content.setAttribute('data-placeholder', this.placeholder || '');
    if (block.content && block.content.length > 0) {
      content.innerHTML = renderInlineContent(block.content);
    }

    wrapper.appendChild(number);
    wrapper.appendChild(content);
    return wrapper;
  },

  parseContent(element) {
    const content = element.querySelector('.bs-list-content') as HTMLElement;
    return content ? parseInlineContent(content) : [];
  },
};
