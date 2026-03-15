import type { AIAction, AIActionContext, AIRequest } from '../../model/types.js';
import { createBlock } from '../../model/Block.js';
import { InsertBlockCommand } from '../../core/commands.js';

export const explainAction: AIAction = {
  id: 'explain',
  label: 'Explain',
  icon: '💡',
  requiresSelection: true,

  buildRequest(context: AIActionContext): AIRequest {
    return {
      systemPrompt:
        'You are a helpful assistant. Explain the provided text in simpler, clearer terms ' +
        'so that anyone can understand it. Output only the explanation, no extra commentary.',
      prompt: `Explain the following:\n\n${context.selectedText}`,
    };
  },

  apply(response: string, context: AIActionContext): void {
    const lastBlock = context.selectedBlocks[context.selectedBlocks.length - 1];
    const insertIndex = context.editorState.getBlockIndex(lastBlock.id) + 1;

    const paragraphs = response.split('\n\n').filter((p) => p.trim());
    let idx = insertIndex;
    for (const text of paragraphs) {
      const block = createBlock('paragraph', {}, [
        { type: 'text', text: text.trim(), marks: [] },
      ]);
      context.commandManager.execute(
        new InsertBlockCommand(context.editorState, block, idx)
      );
      idx++;
    }
  },
};
