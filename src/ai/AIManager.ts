import type { AIProvider, AIAction, AIActionContext, AIRequest } from '../model/types.js';
import type { EventBus } from '../core/EventBus.js';

export class AIManager {
  private provider: AIProvider | null = null;
  private actions = new Map<string, AIAction>();
  private isProcessing = false;

  constructor(private eventBus: EventBus) {}

  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  getProvider(): AIProvider | null {
    return this.provider;
  }

  registerAction(action: AIAction): void {
    this.actions.set(action.id, action);
  }

  getActions(): AIAction[] {
    return Array.from(this.actions.values());
  }

  getAction(id: string): AIAction | undefined {
    return this.actions.get(id);
  }

  isActive(): boolean {
    return this.isProcessing;
  }

  async executeAction(actionId: string, context: AIActionContext): Promise<void> {
    if (!this.provider) {
      throw new Error('No AI provider configured. Call registerAIProvider() first.');
    }

    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Unknown AI action: ${actionId}`);
    }

    const request = action.buildRequest(context);
    this.isProcessing = true;
    this.eventBus.emit('ai:start', { actionId, request });

    try {
      const fullText = await this.streamResponse(request);
      action.apply(fullText, context);
      this.eventBus.emit('ai:complete', { actionId, text: fullText });
    } catch (error) {
      this.eventBus.emit('ai:error', { actionId, error });
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  private async streamResponse(request: AIRequest): Promise<string> {
    if (!this.provider) throw new Error('No AI provider');

    let fullText = '';

    try {
      for await (const chunk of this.provider.stream(request)) {
        fullText += chunk;
        this.eventBus.emit('ai:chunk', { text: fullText, chunk });
      }
    } catch {
      // Fall back to non-streaming if stream fails
      const response = await this.provider.complete(request);
      fullText = response.text;
    }

    return fullText;
  }
}
