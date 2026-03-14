import type { AIAction, AIActionContext, AIRequest } from '../../model/types.js';
import { createBlock } from '../../model/Block.js';
import { InsertBlockCommand } from '../../core/commands.js';

export const summarizeAction: AIAction = {
  id: 'summarize',
  label: 'Summarize',
  icon: '📝',
  requiresSelection: true,

  buildRequest(context: AIActionContext): AIRequest {
    const text = context.selectedBlocks
      .map((b) => b.content?.map((c) => (c.type === 'text' ? c.text : '')).join('') ?? '')
      .join('\n');

    return {
      systemPrompt:
        'You are a writing assistant. Summarize the provided text concisely. ' +
        'Output only the summary, no extra commentary.',
      prompt: `Summarize the following:\n\n${text}`,
    };
  },

  apply(response: string, context: AIActionContext): void {
    const lastBlock = context.selectedBlocks[context.selectedBlocks.length - 1];
    const insertIndex = context.editorState.getBlockIndex(lastBlock.id) + 1;

    const block = createBlock('paragraph', {}, [
      { type: 'text', text: response.trim(), marks: [] },
    ]);
    context.commandManager.execute(
      new InsertBlockCommand(context.editorState, block, insertIndex)
    );
  },
};
