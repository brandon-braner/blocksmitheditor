import type { AIAction, AIActionContext, AIRequest } from '../../model/types.js';
import { UpdateBlockCommand } from '../../core/commands.js';

export const editWithAIAction: AIAction = {
  id: 'editWithAI',
  label: 'Edit with AI',
  icon: '🤖',
  requiresSelection: true,

  buildRequest(context: AIActionContext): AIRequest {
    // The context.selectedText is expected to be in the format:
    // "userInstruction\n---\noriginalText"
    const separatorIdx = context.selectedText.indexOf('\n---\n');
    let instruction: string;
    let originalText: string;

    if (separatorIdx >= 0) {
      instruction = context.selectedText.substring(0, separatorIdx);
      originalText = context.selectedText.substring(separatorIdx + 5);
    } else {
      instruction = 'Edit and improve this text.';
      originalText = context.selectedText;
    }

    return {
      systemPrompt:
        'Follow the user\'s instruction to edit the provided text. ' +
        'IMPORTANT: Respond with ONLY the edited text. ' +
        'Do NOT include any preamble, explanation, or commentary like "Here is..." or "Sure...". ' +
        'Your entire response must be the edited text and nothing else.',
      prompt: `Instruction: ${instruction}\n\nText:\n${originalText}`,
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
