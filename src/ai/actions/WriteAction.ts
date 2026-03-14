import type { AIAction, AIActionContext, AIRequest } from '../../model/types.js';
import { createBlock } from '../../model/Block.js';
import { InsertBlockCommand } from '../../core/commands.js';

export const writeAction: AIAction = {
  id: 'write',
  label: 'Write with AI',
  icon: '✍',
  requiresSelection: false,

  buildRequest(context: AIActionContext): AIRequest {
    return {
      systemPrompt:
        'You are a writing assistant. Write content based on the user\'s prompt. ' +
        'Output only the content, no extra commentary. Use plain text without markdown formatting.',
      prompt: context.selectedText,
      context: context.selectedBlocks.length > 0
        ? context.selectedBlocks
            .map((b) => b.content?.map((c) => (c.type === 'text' ? c.text : '')).join('') ?? '')
            .join('\n')
        : undefined,
    };
  },

  apply(response: string, context: AIActionContext): void {
    const paragraphs = response.split('\n\n').filter((p) => p.trim());
    const cursorIndex = context.editorState.getBlockIndex(context.cursorBlockId);
    let insertIndex = cursorIndex + 1;

    for (const text of paragraphs) {
      const block = createBlock('paragraph', {}, [
        { type: 'text', text: text.trim(), marks: [] },
      ]);
      context.commandManager.execute(
        new InsertBlockCommand(context.editorState, block, insertIndex)
      );
      insertIndex++;
    }
  },
};
