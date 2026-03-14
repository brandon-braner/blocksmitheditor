import type { BlockDefinition } from '../model/types.js';

export const imageBlock: BlockDefinition<'image'> = {
  type: 'image',
  displayName: 'Image',
  icon: '🖼',
  hasContent: false,
  slashMenuKeywords: ['image', 'img', 'picture', 'photo'],

  defaultProps: () => ({ url: '' }),

  render(block) {
    const wrapper = document.createElement('div');
    wrapper.className = 'bs-image';

    if (block.props.url) {
      const img = document.createElement('img');
      img.src = block.props.url;
      if (block.props.alt) img.alt = block.props.alt;
      wrapper.appendChild(img);

      if (block.props.caption) {
        const caption = document.createElement('figcaption');
        caption.className = 'bs-image-caption';
        caption.setAttribute('contenteditable', 'true');
        caption.textContent = block.props.caption;
        wrapper.appendChild(caption);
      }
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'bs-image-placeholder';
      placeholder.textContent = 'Click to add an image URL';
      placeholder.addEventListener('click', () => {
        const url = prompt('Enter image URL:');
        if (url) {
          const img = document.createElement('img');
          img.src = url;
          wrapper.innerHTML = '';
          wrapper.appendChild(img);
          wrapper.dispatchEvent(new CustomEvent('bs-image-set', { detail: { url }, bubbles: true }));
        }
      });
      wrapper.appendChild(placeholder);
    }

    return wrapper;
  },

  parseContent() {
    return undefined;
  },
};
