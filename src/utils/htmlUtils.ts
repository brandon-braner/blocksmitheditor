import type { InlineContent } from '../model/types.js';

/**
 * Shared HTML utility functions used by block toHTML() methods
 * and the HTMLExportPlugin.
 */

export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function applyMarks(text: string, marks?: string[]): string {
  if (!marks || marks.length === 0) return text;

  let result = text;
  for (const mark of marks) {
    switch (mark) {
      case 'bold':
        result = `<strong>${result}</strong>`;
        break;
      case 'italic':
        result = `<em>${result}</em>`;
        break;
      case 'code':
        result = `<code>${result}</code>`;
        break;
      case 'strikethrough':
        result = `<s>${result}</s>`;
        break;
      case 'underline':
        result = `<u>${result}</u>`;
        break;
      case 'highlight':
        result = `<mark>${result}</mark>`;
        break;
    }
  }
  return result;
}

export function renderInlineToHTML(content: InlineContent[] | undefined): string {
  if (!content || content.length === 0) return '';

  return content.map((node) => {
    if (node.type === 'link') {
      const children = node.children
        .map((child) => applyMarks(escapeHTML(child.text), child.marks))
        .join('');
      return `<a href="${escapeHTML(node.href)}">${children}</a>`;
    }

    // TextNode
    return applyMarks(escapeHTML(node.text), node.marks);
  }).join('');
}

export function getPlainText(content: InlineContent[] | undefined): string {
  if (!content) return '';
  return content
    .map((node) => {
      if (node.type === 'link') {
        return node.children.map((c) => c.text).join('');
      }
      return node.text;
    })
    .join('');
}

/**
 * Build the style attribute string for alignment.
 * Returns empty string if no alignment or left-aligned.
 */
export function alignStyle(block: { meta?: Record<string, unknown> }): string {
  const align = (block.meta?.align as string) || '';
  return align && align !== 'left' ? ` style="text-align: ${align}"` : '';
}
