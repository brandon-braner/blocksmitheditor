import type { AIAction, AIActionContext, AIRequest } from '../../model/types.js';
import { UpdateBlockCommand } from '../../core/commands.js';

export const rewriteAction: AIAction = {
  id: 'rewrite',
  label: 'Rewrite',
  icon: '🔄',
  requiresSelection: true,

  buildRequest(context: AIActionContext): AIRequest {
    return {
      systemPrompt:
        'You are a writing assistant. Rewrite the provided text to improve clarity and style. ' +
        'Keep the same meaning. Output only the rewritten text, no commentary.',
      prompt: `Rewrite the following:\n\n${context.selectedText}`,
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
