import type { BlockDefinition } from '../model/types.js';
import { renderInlineContent, parseInlineContent } from '../utils/dom.js';
import { renderInlineToHTML } from '../utils/htmlUtils.js';

export const numberedListBlock: BlockDefinition<'numbered-list'> = {
  type: 'numbered-list',
  displayName: 'Numbered List',
  icon: '1.',
  hasContent: true,
  placeholder: 'List item',
  slashMenuKeywords: ['numbered', 'ordered', 'ol', 'number'],

  defaultProps: () => ({}),

  render(block, context) {
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

    const ol = document.createElement('ol');
    ol.className = 'bs-numbered-list';
    ol.setAttribute('start', String(num));

    const li = document.createElement('li');

    const content = document.createElement('div');
    content.className = 'bs-list-content';
    content.setAttribute('contenteditable', 'true');
    content.setAttribute('data-placeholder', this.placeholder || '');
    const align = (block.meta?.align as string) || '';
    if (align && align !== 'left') {
      content.style.textAlign = align;
    }
    if (block.content && block.content.length > 0) {
      content.innerHTML = renderInlineContent(block.content);
    }

    li.appendChild(content);
    ol.appendChild(li);
    return ol;
  },

  parseContent(element) {
    const content = element.querySelector('.bs-list-content') as HTMLElement;
    return content ? parseInlineContent(content) : [];
  },

  toHTML(block) {
    return `  <li>${renderInlineToHTML(block.content)}</li>`;
  },
};
