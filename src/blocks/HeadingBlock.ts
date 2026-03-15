import type { BlockDefinition } from '../model/types.js';
import { renderInlineContent, parseInlineContent } from '../utils/dom.js';

export const headingBlock: BlockDefinition<'heading'> = {
  type: 'heading',
  displayName: 'Heading',
  icon: 'H',
  hasContent: true,
  placeholder: 'Heading',
  slashMenuKeywords: ['heading', 'h1', 'h2', 'h3', 'title'],

  defaultProps: () => ({ level: 1 }),

  render(block) {
    const tag = `h${block.props.level}` as 'h1' | 'h2' | 'h3';
    const el = document.createElement(tag);
    el.className = `bs-heading bs-heading-${block.props.level}`;
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-placeholder', `Heading ${block.props.level}`);
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
