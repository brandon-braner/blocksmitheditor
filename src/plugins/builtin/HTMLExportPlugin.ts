import type { EditorPlugin, PluginContext } from '../PluginTypes.js';
import type { Block, EditorDocument, BlockType, BlockDefinition } from '../../model/types.js';
import { renderInlineToHTML, alignStyle } from '../../utils/htmlUtils.js';

// Import all block definitions so we can look up their toHTML methods
import { paragraphBlock } from '../../blocks/ParagraphBlock.js';
import { headingBlock } from '../../blocks/HeadingBlock.js';
import { bulletListBlock } from '../../blocks/BulletListBlock.js';
import { numberedListBlock } from '../../blocks/NumberedListBlock.js';
import { codeBlock } from '../../blocks/CodeBlock.js';
import { quoteBlock } from '../../blocks/QuoteBlock.js';
import { dividerBlock } from '../../blocks/DividerBlock.js';
import { imageBlock } from '../../blocks/ImageBlock.js';
import { tableBlock } from '../../blocks/TableBlock.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BLOCK_DEFS: Record<BlockType, BlockDefinition<any>> = {
  paragraph: paragraphBlock,
  heading: headingBlock,
  'bullet-list': bulletListBlock,
  'numbered-list': numberedListBlock,
  code: codeBlock,
  quote: quoteBlock,
  divider: dividerBlock,
  image: imageBlock,
  table: tableBlock,
};

/**
 * Exports the editor document to clean, semantic HTML.
 * Delegates HTML conversion to each block's own `toHTML()` method.
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
  exportHTML(_title = 'Blocksmith Document'): string {
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
          items.push(this.renderBlock(doc.blocks[i]));
          i++;
        }
        parts.push(`<ul>\n${items.join('\n')}\n</ul>`);
        continue;
      }

      if (block.type === 'numbered-list') {
        const items: string[] = [];
        while (i < doc.blocks.length && doc.blocks[i].type === 'numbered-list') {
          items.push(this.renderBlock(doc.blocks[i]));
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

  /**
   * Render a single block to HTML by delegating to its block definition's toHTML method.
   * Falls back to a paragraph if the block type has no toHTML implementation.
   */
  private renderBlock(block: Block): string {
    const def = BLOCK_DEFS[block.type];
    if (def?.toHTML) {
      return def.toHTML(block);
    }

    // Fallback for unknown/custom block types without toHTML
    const style = alignStyle(block);
    return `<p${style}>${renderInlineToHTML(block.content)}</p>`;
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
