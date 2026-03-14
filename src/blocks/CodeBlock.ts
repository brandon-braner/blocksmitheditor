import type { BlockDefinition } from '../model/types.js';
import hljs from 'highlight.js/lib/core';

import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import cssLang from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import java from 'highlight.js/lib/languages/java';
import csharp from 'highlight.js/lib/languages/csharp';
import ruby from 'highlight.js/lib/languages/ruby';
import php from 'highlight.js/lib/languages/php';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('css', cssLang);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('java', java);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('cs', csharp);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('rb', ruby);
hljs.registerLanguage('php', php);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);

function getHighlightedHtml(text: string, language?: string): string {
  if (!text) return '';
  try {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(text, { language }).value;
    }
    return hljs.highlightAuto(text).value;
  } catch {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Apply syntax highlighting to a code element.
 * Only safe to call when the element does NOT have focus (i.e. on blur),
 * because replacing innerHTML destroys the cursor position and
 * Shadow DOM prevents reliable cursor save/restore via getSelection().
 */
function applyHighlight(codeEl: HTMLElement, language?: string): void {
  const text = codeEl.textContent || '';
  if (!text) {
    codeEl.innerHTML = '';
    return;
  }
  codeEl.innerHTML = getHighlightedHtml(text, language);
}

export const codeBlock: BlockDefinition<'code'> = {
  type: 'code',
  displayName: 'Code',
  icon: '</>',
  hasContent: true,
  placeholder: 'Write code...',
  slashMenuKeywords: ['code', 'pre', 'snippet'],

  defaultProps: () => ({ language: '' }),

  render(block) {
    const wrapper = document.createElement('div');
    wrapper.className = 'bs-code-block';

    // Language dropdown
    const header = document.createElement('div');
    header.className = 'bs-code-header';
    const langSelect = document.createElement('select');
    langSelect.className = 'bs-code-lang';

    const languages: [string, string][] = [
      ['', 'Auto-detect'],
      ['javascript', 'JavaScript'],
      ['typescript', 'TypeScript'],
      ['python', 'Python'],
      ['html', 'HTML'],
      ['css', 'CSS'],
      ['json', 'JSON'],
      ['bash', 'Bash'],
      ['sql', 'SQL'],
      ['go', 'Go'],
      ['rust', 'Rust'],
      ['java', 'Java'],
      ['csharp', 'C#'],
      ['ruby', 'Ruby'],
      ['php', 'PHP'],
      ['yaml', 'YAML'],
      ['xml', 'XML'],
      ['markdown', 'Markdown'],
    ];

    for (const [value, label] of languages) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      if (value === (block.props.language || '')) {
        option.selected = true;
      }
      langSelect.appendChild(option);
    }

    header.appendChild(langSelect);
    wrapper.appendChild(header);

    // Single code element — highlighted directly
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.className = 'hljs';
    codeEl.setAttribute('contenteditable', 'true');
    codeEl.setAttribute('data-placeholder', this.placeholder || '');
    codeEl.setAttribute('spellcheck', 'false');
    pre.appendChild(codeEl);
    wrapper.appendChild(pre);

    const rawText = block.content
      ?.map((node) => (node.type === 'text' ? node.text : ''))
      .join('') || '';

    // Initial render: set highlighted HTML
    if (rawText) {
      codeEl.innerHTML = getHighlightedHtml(rawText, block.props.language);
    }

    // Rehighlight immediately when language changes
    // The language select steals focus, so this is safe for the cursor
    langSelect.addEventListener('change', () => {
      applyHighlight(codeEl, langSelect.value || undefined);
      wrapper.dispatchEvent(
        new CustomEvent('bs-lang-change', {
          detail: { language: langSelect.value },
          bubbles: true,
          composed: true,
        })
      );
    });

    // Rehighlight on blur (when user clicks/tabs away from code).
    // This is the only time we replace innerHTML — cursor doesn't matter
    // because the element is losing focus anyway.
    codeEl.addEventListener('blur', () => {
      applyHighlight(codeEl, langSelect.value || undefined);
    });

    return wrapper;
  },

  parseContent(element) {
    // Read plain text from the code element (ignore highlight spans)
    const codeEl = element.querySelector('code') as HTMLElement;
    if (!codeEl) return [];
    const text = codeEl.textContent || '';
    return text ? [{ type: 'text' as const, text, marks: [] }] : [];
  },
};

export { hljs };
