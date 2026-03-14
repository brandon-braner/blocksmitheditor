import type { BlockDefinition } from '../model/types.js';
import { renderInlineContent, parseInlineContent } from '../utils/dom.js';

export const bulletListBlock: BlockDefinition<'bullet-list'> = {
  type: 'bullet-list',
  displayName: 'Bulleted List',
  icon: '•',
  hasContent: true,
  placeholder: 'List item',
  slashMenuKeywords: ['bullet', 'list', 'ul', 'unordered'],

  defaultProps: () => ({}),

  render(block) {
    const wrapper = document.createElement('div');
    wrapper.className = 'bs-bullet-list';

    const bullet = document.createElement('span');
    bullet.className = 'bs-bullet';
    bullet.textContent = '•';
    bullet.setAttribute('contenteditable', 'false');

    const content = document.createElement('div');
    content.className = 'bs-list-content';
    content.setAttribute('contenteditable', 'true');
    content.setAttribute('data-placeholder', this.placeholder || '');
    if (block.content && block.content.length > 0) {
      content.innerHTML = renderInlineContent(block.content);
    }

    wrapper.appendChild(bullet);
    wrapper.appendChild(content);
    return wrapper;
  },

  parseContent(element) {
    const content = element.querySelector('.bs-list-content') as HTMLElement;
    return content ? parseInlineContent(content) : [];
  },
};
