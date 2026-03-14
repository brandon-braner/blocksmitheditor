import type { Block, BlockType, EditorDocument, EditorStateInterface } from '../model/types.js';
import type { EventBus } from './EventBus.js';

export class EditorState implements EditorStateInterface {
  private blocks: Block[] = [];

  constructor(
    private eventBus: EventBus,
    initialDoc?: EditorDocument
  ) {
    if (initialDoc) {
      this.blocks = [...initialDoc.blocks];
    }
  }

  getBlocks(): Block[] {
    return [...this.blocks];
  }

  getBlock(id: string): Block | undefined {
    return this.blocks.find((b) => b.id === id);
  }

  getBlockIndex(id: string): number {
    return this.blocks.findIndex((b) => b.id === id);
  }

  getBlockBefore(id: string): Block | undefined {
    const idx = this.getBlockIndex(id);
    return idx > 0 ? this.blocks[idx - 1] : undefined;
  }

  getBlockAfter(id: string): Block | undefined {
    const idx = this.getBlockIndex(id);
    return idx >= 0 && idx < this.blocks.length - 1 ? this.blocks[idx + 1] : undefined;
  }

  insertBlock(block: Block, index: number): void {
    this.blocks.splice(index, 0, block);
    this.eventBus.emit('block:added', { block, index });
    this.eventBus.emit('state:changed');
  }

  removeBlock(id: string): void {
    const idx = this.getBlockIndex(id);
    if (idx === -1) return;
    const block = this.blocks.splice(idx, 1)[0];
    this.eventBus.emit('block:removed', { block, index: idx });
    this.eventBus.emit('state:changed');
  }

  updateBlock(id: string, updates: Partial<Block>): void {
    const idx = this.getBlockIndex(id);
    if (idx === -1) return;
    this.blocks[idx] = { ...this.blocks[idx], ...updates, id } as Block<BlockType>;
    this.eventBus.emit('block:updated', { block: this.blocks[idx], index: idx });
    this.eventBus.emit('state:changed');
  }

  moveBlock(id: string, newIndex: number): void {
    const oldIndex = this.getBlockIndex(id);
    if (oldIndex === -1) return;
    const [block] = this.blocks.splice(oldIndex, 1);
    this.blocks.splice(newIndex, 0, block);
    this.eventBus.emit('block:moved', { block, oldIndex, newIndex });
    this.eventBus.emit('state:changed');
  }

  toDocument(): EditorDocument {
    return {
      blocks: this.getBlocks(),
      version: 1,
    };
  }
}
