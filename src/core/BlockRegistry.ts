import type { BlockDefinition, BlockType } from '../model/types.js';

export class BlockRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private definitions = new Map<BlockType, BlockDefinition<any>>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(definition: BlockDefinition<any>): void {
    this.definitions.set(definition.type, definition);
  }

  get<T extends BlockType>(type: T): BlockDefinition<T> | undefined {
    return this.definitions.get(type) as BlockDefinition<T> | undefined;
  }

  getAll(): BlockDefinition[] {
    return Array.from(this.definitions.values());
  }

  has(type: BlockType): boolean {
    return this.definitions.has(type);
  }
}
