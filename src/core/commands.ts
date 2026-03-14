import type { Block, Command, EditorStateInterface, InlineContent } from '../model/types.js';

export class InsertBlockCommand implements Command {
  constructor(
    private state: EditorStateInterface,
    private block: Block,
    private index: number
  ) {}

  execute(): void {
    this.state.insertBlock(this.block, this.index);
  }

  undo(): void {
    this.state.removeBlock(this.block.id);
  }
}

export class DeleteBlockCommand implements Command {
  private deletedBlock: Block | undefined;
  private index: number = -1;

  constructor(
    private state: EditorStateInterface,
    private blockId: string
  ) {}

  execute(): void {
    this.deletedBlock = this.state.getBlock(this.blockId);
    this.index = this.state.getBlockIndex(this.blockId);
    this.state.removeBlock(this.blockId);
  }

  undo(): void {
    if (this.deletedBlock && this.index >= 0) {
      this.state.insertBlock(this.deletedBlock, this.index);
    }
  }
}

export class UpdateBlockCommand implements Command {
  private previousContent: InlineContent[] | undefined;
  private previousProps: Record<string, unknown> | undefined;

  constructor(
    private state: EditorStateInterface,
    private blockId: string,
    private newContent?: InlineContent[],
    private newProps?: Record<string, unknown>
  ) {}

  execute(): void {
    const block = this.state.getBlock(this.blockId);
    if (!block) return;
    this.previousContent = block.content ? [...block.content] : undefined;
    this.previousProps = { ...block.props };

    const updates: Partial<Block> = {};
    if (this.newContent !== undefined) updates.content = this.newContent;
    if (this.newProps !== undefined) updates.props = this.newProps as Block['props'];
    this.state.updateBlock(this.blockId, updates);
  }

  undo(): void {
    const updates: Partial<Block> = {};
    if (this.previousContent !== undefined) updates.content = this.previousContent;
    if (this.previousProps !== undefined) updates.props = this.previousProps as Block['props'];
    this.state.updateBlock(this.blockId, updates);
  }
}

export class MoveBlockCommand implements Command {
  private oldIndex: number = -1;

  constructor(
    private state: EditorStateInterface,
    private blockId: string,
    private newIndex: number
  ) {}

  execute(): void {
    this.oldIndex = this.state.getBlockIndex(this.blockId);
    this.state.moveBlock(this.blockId, this.newIndex);
  }

  undo(): void {
    this.state.moveBlock(this.blockId, this.oldIndex);
  }
}

export class ChangeBlockTypeCommand implements Command {
  private previousType: string = '';
  private previousProps: Record<string, unknown> = {};

  constructor(
    private state: EditorStateInterface,
    private blockId: string,
    private newType: string,
    private newProps: Record<string, unknown>
  ) {}

  execute(): void {
    const block = this.state.getBlock(this.blockId);
    if (!block) return;
    this.previousType = block.type;
    this.previousProps = { ...block.props };
    this.state.updateBlock(this.blockId, {
      type: this.newType as Block['type'],
      props: this.newProps as Block['props'],
    });
  }

  undo(): void {
    this.state.updateBlock(this.blockId, {
      type: this.previousType as Block['type'],
      props: this.previousProps as Block['props'],
    });
  }
}
