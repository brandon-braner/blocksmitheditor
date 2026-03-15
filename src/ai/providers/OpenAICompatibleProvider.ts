import OpenAI from 'openai';
import type { AIProvider, AIRequest, AIResponse } from '../../model/types.js';

export interface OpenAIProviderConfig {
  /** Base URL of the OpenAI-compatible API (e.g., https://api.openai.com/v1, http://localhost:11434/v1) */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Model name (default: gpt-4o-mini) */
  model?: string;
  /** Default temperature (default: 0.7) */
  defaultTemperature?: number;
  /** Default max tokens (default: 1024) */
  defaultMaxTokens?: number;
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly id: string;
  readonly name: string;

  private client: OpenAI;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: OpenAIProviderConfig = {}) {
    this.model = config.model || 'gpt-4o-mini';
    this.defaultTemperature = config.defaultTemperature ?? 0.7;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 1024;
    this.id = 'openai-compatible';
    this.name = `OpenAI Compatible (${this.model})`;

    this.client = new OpenAI({
      ...(config.baseUrl ? { baseURL: config.baseUrl.replace(/\/$/, '') } : {}),
      apiKey: config.apiKey || 'not-needed',
      dangerouslyAllowBrowser: true,
    });
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const messages = this.buildMessages(request);
    console.log('[AI Request]', { model: this.model, messages });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: request.temperature ?? this.defaultTemperature,
      max_tokens: request.maxTokens ?? this.defaultMaxTokens,
    });

    console.log('[AI Response]', response);

    const text = response.choices?.[0]?.message?.content || '';

    return {
      text,
      usage: response.usage
        ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
        }
        : undefined,
    };
  }

  async *stream(request: AIRequest): AsyncIterable<string> {
    const messages = this.buildMessages(request);
    console.log('[AI Stream Request]', { model: this.model, messages });

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: request.temperature ?? this.defaultTemperature,
      max_tokens: request.maxTokens ?? this.defaultMaxTokens,
      stream: true,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        yield content;
      }
    }

    console.log('[AI Stream Complete]', fullResponse || '(empty)');
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
