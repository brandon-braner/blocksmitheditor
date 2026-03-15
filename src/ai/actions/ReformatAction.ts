import type { AIAction, AIActionContext, AIRequest } from '../../model/types.js';
import { UpdateBlockCommand } from '../../core/commands.js';

export const reformatAction: AIAction = {
  id: 'reformat',
  label: 'Reformat',
  icon: '✨',
  requiresSelection: true,

  buildRequest(context: AIActionContext): AIRequest {
    return {
      systemPrompt:
        'Reformat and restructure the user\'s text for better readability. ' +
        'Improve paragraph structure, sentence flow, and organization while keeping the same meaning. ' +
        'IMPORTANT: Respond with ONLY the reformatted text. ' +
        'Do NOT include any preamble, explanation, or commentary like "Here is..." or "Sure...". ' +
        'Your entire response must be the reformatted text and nothing else.',
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
