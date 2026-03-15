import type { AIAction, AIActionContext, AIRequest } from '../../model/types.js';
import { UpdateBlockCommand } from '../../core/commands.js';

export const proofreadAction: AIAction = {
  id: 'proofread',
  label: 'Proofread',
  icon: '✅',
  requiresSelection: true,

  buildRequest(context: AIActionContext): AIRequest {
    return {
      systemPrompt:
        'Fix all grammar, spelling, and punctuation errors in the user\'s text. ' +
        'Do not change the meaning or style — only correct mistakes. ' +
        'IMPORTANT: Respond with ONLY the corrected text. ' +
        'Do NOT include any preamble, explanation, or commentary like "Here is..." or "Sure...". ' +
        'Your entire response must be the corrected text and nothing else.',
      prompt: context.selectedText,
    };
  },

  apply(response: string, context: AIActionContext): void {
    if (context.selectedBlocks.length === 1) {
      context.commandManager.execute(
        new UpdateBlockCommand(
          context.editorState,
          context.selectedBlocks[0].id,
          [{ type: 'text', text: response.trim(), marks: [] }]
        )
      );
    }
  },
};
