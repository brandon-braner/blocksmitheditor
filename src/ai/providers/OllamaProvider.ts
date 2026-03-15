import { Ollama } from 'ollama/browser';
import type { AIProvider, AIRequest, AIResponse } from '../../model/types.js';

export interface OllamaProviderConfig {
  /** Ollama server URL (default: http://localhost:11434) */
  host?: string;
  /** Model name (default: llama3) */
  model?: string;
  /** Default temperature (default: 0.7) */
  defaultTemperature?: number;
}

export class OllamaProvider implements AIProvider {
  readonly id = 'ollama';
  readonly name: string;

  private client: Ollama;
  private model: string;
  private defaultTemperature: number;

  constructor(config: OllamaProviderConfig = {}) {
    this.model = config.model || 'llama3';
    this.defaultTemperature = config.defaultTemperature ?? 0.7;
    this.name = `Ollama (${this.model})`;
    this.client = new Ollama({ host: config.host || 'http://localhost:11434' });
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const messages = this.buildMessages(request);
    console.log('[Ollama Request]', { model: this.model, messages });

    const response = await this.client.chat({
      model: this.model,
      messages,
      options: {
        temperature: request.temperature ?? this.defaultTemperature,
      },
    });

    console.log('[Ollama Response]', response);

    return {
      text: response.message?.content || '',
    };
  }

  async *stream(request: AIRequest): AsyncIterable<string> {
    const messages = this.buildMessages(request);
    console.log('[Ollama Stream Request]', { model: this.model, messages });

    const stream = await this.client.chat({
      model: this.model,
      messages,
      stream: true,
      options: {
        temperature: request.temperature ?? this.defaultTemperature,
      },
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      const content = chunk.message?.content;
      if (content) {
        fullResponse += content;
        yield content;
      }
    }

    console.log('[Ollama Stream Complete]', fullResponse || '(empty)');
  }

  private buildMessages(
    request: AIRequest
  ): Array<{ role: 'system' | 'user'; content: string }> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    if (request.context) {
      messages.push({ role: 'system', content: `Context:\n${request.context}` });
    }

    messages.push({ role: 'user', content: request.prompt });

    return messages;
  }
}
