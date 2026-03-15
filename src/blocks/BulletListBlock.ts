import type { BlockDefinition } from '../model/types.js';
import { renderInlineContent, parseInlineContent } from '../utils/dom.js';
import { renderInlineToHTML } from '../utils/htmlUtils.js';

export const bulletListBlock: BlockDefinition<'bullet-list'> = {
  type: 'bullet-list',
  displayName: 'Bulleted List',
  icon: '•',
  hasContent: true,
  placeholder: 'List item',
  slashMenuKeywords: ['bullet', 'list', 'ul', 'unordered'],

  defaultProps: () => ({}),

  render(block) {
    const ul = document.createElement('ul');
    ul.className = 'bs-bullet-list';

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
    ul.appendChild(li);
    return ul;
  },

  parseContent(element) {
    const content = element.querySelector('.bs-list-content') as HTMLElement;
    return content ? parseInlineContent(content) : [];
  },

  toHTML(block) {
    return `  <li>${renderInlineToHTML(block.content)}</li>`;
  },
};
