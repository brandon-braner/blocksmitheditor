import type { BlockType } from '../model/types.js';

interface ShortcutMatch {
  pattern: RegExp;
  blockType: BlockType;
  props: Record<string, unknown>;
}

const SHORTCUTS: ShortcutMatch[] = [
  { pattern: /^###\s/, blockType: 'heading', props: { level: 3 } },
  { pattern: /^##\s/, blockType: 'heading', props: { level: 2 } },
  { pattern: /^#\s/, blockType: 'heading', props: { level: 1 } },
  { pattern: /^[-*]\s/, blockType: 'bullet-list', props: {} },
  { pattern: /^1\.\s/, blockType: 'numbered-list', props: {} },
  { pattern: /^>\s/, blockType: 'quote', props: {} },
  { pattern: /^---$/, blockType: 'divider', props: {} },
  { pattern: /^```$/, blockType: 'code', props: { language: '' } },
];

export interface ShortcutResult {
  blockType: BlockType;
  props: Record<string, unknown>;
}

export function matchMarkdownShortcut(text: string): ShortcutResult | null {
  for (const shortcut of SHORTCUTS) {
    if (shortcut.pattern.test(text)) {
      return {
        blockType: shortcut.blockType,
        props: shortcut.props,
      };
    }
  }
  return null;
}
