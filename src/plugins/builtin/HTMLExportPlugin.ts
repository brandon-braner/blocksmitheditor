import type { EditorPlugin, PluginContext } from '../PluginTypes.js';
import type { Block, InlineContent, EditorDocument } from '../../model/types.js';

/**
 * Exports the editor document to clean, semantic HTML.
 * Supports all built-in block types and inline marks.
 */
export class HTMLExportPlugin implements EditorPlugin {
  readonly id = 'html-export';
  readonly name = 'HTML Export';

  private context: PluginContext | null = null;

  init(context: PluginContext): void {
    this.context = context;
  }

  destroy(): void {
    this.context = null;
  }

  /**
   * Export the current document as an HTML string.
   * Returns a complete HTML document with embedded styles.
   */
  exportHTML(title = 'Blocksmith Document'): string {
    if (!this.context) throw new Error('HTMLExportPlugin is not initialized');

    const doc = this.context.editorState.toDocument();
    const bodyHTML = this.renderDocument(doc);

    const html = `
<style>
${DEFAULT_STYLES}
</style>
</head>
<body>
<article class="blocksmith-export">
${bodyHTML}
</article>
`;

    this.context.eventBus.emit('document:exported', { format: 'html' });
    return html;
  }

  /**
   * Trigger a browser download of the HTML document.
   */
  downloadHTML(filename = 'document.html', title?: string): void {
    const html = this.exportHTML(title);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ============================================================
  // RENDERING
  // ============================================================

  private renderDocument(doc: EditorDocument): string {
    const parts: string[] = [];
    let i = 0;

    while (i < doc.blocks.length) {
      const block = doc.blocks[i];

      // Group consecutive list items into a single <ul> or <ol>
      if (block.type === 'bullet-list') {
        const items: string[] = [];
        while (i < doc.blocks.length && doc.blocks[i].type === 'bullet-list') {
          items.push(`  <li>${this.renderInline(doc.blocks[i].content)}</li>`);
          i++;
        }
        parts.push(`<ul>\n${items.join('\n')}\n</ul>`);
        continue;
      }

      if (block.type === 'numbered-list') {
        const items: string[] = [];
        while (i < doc.blocks.length && doc.blocks[i].type === 'numbered-list') {
          items.push(`  <li>${this.renderInline(doc.blocks[i].content)}</li>`);
          i++;
        }
        parts.push(`<ol>\n${items.join('\n')}\n</ol>`);
        continue;
      }

      parts.push(this.renderBlock(block));
      i++;
    }

    return parts.join('\n');
  }

  private renderBlock(block: Block): string {
    const align = (block.meta?.align as string) || '';
    const style = align && align !== 'left' ? ` style="text-align: ${align}"` : '';

    switch (block.type) {
      case 'paragraph':
        return `<p${style}>${this.renderInline(block.content)}</p>`;

      case 'heading': {
        const level = (block.props as { level: number }).level || 1;
        const tag = `h${level}`;
        return `<${tag}${style}>${this.renderInline(block.content)}</${tag}>`;
      }

      case 'code': {
        const lang = (block.props as { language?: string }).language;
        const text = this.getPlainText(block.content);
        const langAttr = lang ? ` class="language-${this.escapeHTML(lang)}"` : '';
        return `<pre${style}><code${langAttr}>${this.escapeHTML(text)}</code></pre>`;
      }

      case 'quote':
        return `<blockquote${style}>${this.renderInline(block.content)}</blockquote>`;

      case 'divider':
        return '<hr>';

      case 'image': {
        const props = block.props as { url: string; alt?: string; caption?: string };
        const altAttr = props.alt ? ` alt="${this.escapeHTML(props.alt)}"` : '';
        const img = `<img src="${this.escapeHTML(props.url)}"${altAttr}>`;
        if (props.caption) {
          return `<figure${style}>${img}<figcaption>${this.escapeHTML(props.caption)}</figcaption></figure>`;
        }
        return `<figure${style}>${img}</figure>`;
      }

      case 'table': {
        const tableCells = (block.meta?.cells as string[][] | undefined) || [];
        const tableRowStyles = (block.meta?.rowStyles as Array<{ color?: string; background?: string }> | undefined) || [];
        const allRows = tableCells.map((row, ri) => {
          const rs = tableRowStyles[ri] || {};
          const rowStyle = [
            rs.color ? `color:${rs.color}` : '',
            rs.background ? `background:${rs.background}` : '',
          ].filter(Boolean).join(';');
          const trStyle = rowStyle ? ` style="${rowStyle}"` : '';
          const cellsHtml = row.map((cell) => `    <td>${this.escapeHTML(cell)}</td>`).join('\n');
          return `  <tr${trStyle}>\n${cellsHtml}\n  </tr>`;
        }).join('\n');
        return `<table${style}>\n<tbody>\n${allRows}\n</tbody>\n</table>`;
      }

      // bullet-list and numbered-list are handled by grouping in renderDocument
      default:
        return `<p${style}>${this.renderInline(block.content)}</p>`;
    }
  }

  private renderInline(content: InlineContent[] | undefined): string {
    if (!content || content.length === 0) return '';

    return content.map((node) => {
      if (node.type === 'link') {
        const children = node.children
          .map((child) => this.applyMarks(this.escapeHTML(child.text), child.marks))
          .join('');
        return `<a href="${this.escapeHTML(node.href)}">${children}</a>`;
      }

      // TextNode
      return this.applyMarks(this.escapeHTML(node.text), node.marks);
    }).join('');
  }

  private applyMarks(text: string, marks?: string[]): string {
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

  private getPlainText(content: InlineContent[] | undefined): string {
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

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// ============================================================
// DEFAULT STYLESHEET
// ============================================================

const DEFAULT_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.7;
    color: #1a1a1a;
    background: #fff;
    max-width: 720px;
    margin: 40px auto;
    padding: 0 24px;
  }
  .blocksmith-export > * + * { margin-top: 0.75em; }
  h1 { font-size: 2em; font-weight: 700; margin-top: 1.2em; }
  h2 { font-size: 1.5em; font-weight: 600; margin-top: 1.1em; }
  h3 { font-size: 1.25em; font-weight: 600; margin-top: 1em; }
  p { font-size: 1em; }
  ul, ol { padding-left: 1.5em; }
  li + li { margin-top: 0.25em; }
  blockquote {
    border-left: 3px solid #d1d5db;
    padding-left: 1em;
    color: #4b5563;
    font-style: italic;
  }
  pre {
    background: #1e1e2e;
    color: #cdd6f4;
    padding: 16px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 0.9em;
  }
  code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
  p code, li code {
    background: #f3f4f6;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 0.88em;
  }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }
  figure { margin: 1em 0; }
  figure img { max-width: 100%; height: auto; border-radius: 6px; }
  figcaption { font-size: 0.85em; color: #6b7280; text-align: center; margin-top: 8px; }
  a { color: #2563eb; text-decoration: underline; }
  mark { background: #fef08a; padding: 1px 3px; border-radius: 2px; }
  strong { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 1em 0; }
  table td, table th { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
  table tr:first-child td { font-weight: 600; background: #f9fafb; }
`.trim();
