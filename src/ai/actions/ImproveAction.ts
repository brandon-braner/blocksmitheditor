import type { AIAction, AIActionContext, AIRequest } from '../../model/types.js';
import { UpdateBlockCommand } from '../../core/commands.js';

export const improveAction: AIAction = {
  id: 'improve',
  label: 'Improve writing',
  icon: '💎',
  requiresSelection: true,

  buildRequest(context: AIActionContext): AIRequest {
    return {
      systemPrompt:
        'Rewrite the user\'s text to improve clarity, conciseness, and engagement. ' +
        'Preserve the original meaning. ' +
        'IMPORTANT: Respond with ONLY the rewritten text. ' +
        'Do NOT include any preamble, explanation, or commentary like "Here is..." or "Sure...". ' +
        'Your entire response must be the improved text and nothing else.',
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
