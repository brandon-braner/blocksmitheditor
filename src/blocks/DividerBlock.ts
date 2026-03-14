import type { BlockDefinition } from '../model/types.js';

export const dividerBlock: BlockDefinition<'divider'> = {
  type: 'divider',
  displayName: 'Divider',
  icon: '—',
  hasContent: false,
  slashMenuKeywords: ['divider', 'hr', 'separator', 'line'],

  defaultProps: () => ({}),

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'bs-divider';
    const hr = document.createElement('hr');
    wrapper.appendChild(hr);
    return wrapper;
  },

  parseContent() {
    return undefined;
  },
};
