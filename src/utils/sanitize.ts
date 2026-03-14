const ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'code', 's', 'del', 'a',
  'br', 'p', 'div', 'span',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href']),
};

export function sanitizeHtml(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  sanitizeNode(template.content);
  return template.innerHTML;
}

function sanitizeNode(node: Node): void {
  const toRemove: Node[] = [];

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        // Unwrap: keep children, remove the element
        while (el.firstChild) {
          node.insertBefore(el.firstChild, el);
        }
        toRemove.push(el);
      } else {
        // Remove disallowed attributes
        const allowedAttrs = ALLOWED_ATTRS[tag] || new Set();
        for (const attr of Array.from(el.attributes)) {
          if (!allowedAttrs.has(attr.name)) {
            el.removeAttribute(attr.name);
          }
        }
        // Sanitize href to prevent javascript: URLs
        if (tag === 'a') {
          const href = el.getAttribute('href') || '';
          if (href.trim().toLowerCase().startsWith('javascript:')) {
            el.setAttribute('href', '#');
          }
        }
        sanitizeNode(el);
      }
    } else if (child.nodeType === Node.COMMENT_NODE) {
      toRemove.push(child);
    }
  }

  for (const node of toRemove) {
    node.parentNode?.removeChild(node);
  }
}
