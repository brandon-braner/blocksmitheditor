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
    console.log(`[AIManager] Starting action "${actionId}"`, request);

    try {
      const fullText = await this.streamResponse(request);
      console.log(`[AIManager] Action "${actionId}" response (${fullText.length} chars):`, fullText);

      if (!fullText.trim()) {
        console.warn(`[AIManager] Action "${actionId}" returned empty response — skipping apply`);
        this.eventBus.emit('ai:error', { actionId, error: new Error('AI returned empty response') });
        return;
      }

      action.apply(fullText, context);
      this.eventBus.emit('ai:complete', { actionId, text: fullText });
    } catch (error) {
      console.error(`[AIManager] Action "${actionId}" failed:`, error);
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
      console.log('[AIManager] Attempting streaming response...');
      for await (const chunk of this.provider.stream(request)) {
        fullText += chunk;
        this.eventBus.emit('ai:chunk', { text: fullText, chunk });
      }
      console.log(`[AIManager] Stream completed (${fullText.length} chars)`);
    } catch (streamError) {
      console.warn('[AIManager] Stream failed, falling back to complete():', streamError);
      // Fall back to non-streaming if stream fails
      const response = await this.provider.complete(request);
      fullText = response.text;
      console.log(`[AIManager] Fallback complete() returned (${fullText.length} chars)`);
    }

    return fullText;
  }
}
