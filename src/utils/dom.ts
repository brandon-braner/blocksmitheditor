import type { InlineContent, InlineMark, TextNode } from '../model/types.js';

export function parseInlineContent(element: HTMLElement): InlineContent[] {
  const result: InlineContent[] = [];

  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) {
        result.push({ type: 'text', text, marks: [] });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'a') {
        const href = el.getAttribute('href') || '';
        const children = parseInlineContent(el).filter(
          (n): n is TextNode => n.type === 'text'
        );
        result.push({ type: 'link', href, children });
      } else {
        const marks = collectMarks(el);
        const innerNodes = parseInlineContent(el);
        for (const inner of innerNodes) {
          if (inner.type === 'text') {
            const combined = [...(inner.marks || []), ...marks];
            inner.marks = [...new Set(combined)];
            result.push(inner);
          } else {
            result.push(inner);
          }
        }
      }
    }
  }

  return result;
}

function collectMarks(el: HTMLElement): InlineMark[] {
  const marks: InlineMark[] = [];
  const tag = el.tagName.toLowerCase();

  if (tag === 'b' || tag === 'strong') marks.push('bold');
  if (tag === 'i' || tag === 'em') marks.push('italic');
  if (tag === 'code') marks.push('code');
  if (tag === 's' || tag === 'del' || tag === 'strike') marks.push('strikethrough');

  return marks;
}

export function renderInlineContent(content: InlineContent[]): string {
  return content
    .map((node) => {
      if (node.type === 'link') {
        const inner = node.children.map((c) => wrapWithMarks(c.text, c.marks)).join('');
        return `<a href="${escapeHtml(node.href)}">${inner}</a>`;
      }
      return wrapWithMarks(node.text, node.marks);
    })
    .join('');
}

function wrapWithMarks(text: string, marks?: InlineMark[]): string {
  let html = escapeHtml(text);
  if (!marks) return html;

  for (const mark of marks) {
    switch (mark) {
      case 'bold':
        html = `<strong>${html}</strong>`;
        break;
      case 'italic':
        html = `<em>${html}</em>`;
        break;
      case 'code':
        html = `<code>${html}</code>`;
        break;
      case 'strikethrough':
        html = `<s>${html}</s>`;
        break;
    }
  }

  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function getCaretPosition(element: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;

  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

export function setCaretPosition(element: HTMLElement, position: 'start' | 'end' | number): void {
  const sel = window.getSelection();
  if (!sel) return;

  const range = document.createRange();

  if (position === 'start') {
    range.setStart(element, 0);
    range.collapse(true);
  } else if (position === 'end') {
    range.selectNodeContents(element);
    range.collapse(false);
  } else {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let remaining = position;
    let node: Node | null = null;
    while ((node = walker.nextNode())) {
      const len = node.textContent?.length || 0;
      if (remaining <= len) {
        range.setStart(node, remaining);
        range.collapse(true);
        break;
      }
      remaining -= len;
    }
    if (!node) {
      range.selectNodeContents(element);
      range.collapse(false);
    }
  }

  sel.removeAllRanges();
  sel.addRange(range);
}

export function getSelectedText(): string {
  const sel = window.getSelection();
  return sel ? sel.toString() : '';
}
