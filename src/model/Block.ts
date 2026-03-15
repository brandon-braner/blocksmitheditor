import type { Block, BlockType, BlockPropsMap, InlineContent } from './types.js';
import { generateId } from '../utils/id.js';

export function createBlock<T extends BlockType>(
  type: T,
  props?: Partial<BlockPropsMap[T]>,
  content?: InlineContent[]
): Block<T> {
  const defaultPropsMap: Record<BlockType, () => BlockPropsMap[BlockType]> = {
    paragraph: () => ({}),
    heading: () => ({ level: 1 }),
    'bullet-list': () => ({}),
    'numbered-list': () => ({}),
    code: () => ({ language: '' }),
    quote: () => ({}),
    divider: () => ({}),
    image: () => ({ url: '' }),
    table: () => ({ rows: 3, cols: 3 }),
  };

  const defaults = defaultPropsMap[type]() as BlockPropsMap[T];
  const noContent = type === 'divider' || type === 'table';

  return {
    id: generateId(),
    type,
    props: { ...defaults, ...props } as BlockPropsMap[T],
    content: noContent ? undefined : (content ?? [{ type: 'text', text: '', marks: [] }]),
  };
}
