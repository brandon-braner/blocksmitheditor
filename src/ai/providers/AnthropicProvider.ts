import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIRequest, AIResponse } from '../../model/types.js';

export interface AnthropicProviderConfig {
  /** API key for Anthropic */
  apiKey: string;
  /** Model name (default: claude-sonnet-4-20250514) */
  model?: string;
  /** Default temperature (default: 0.7) */
  defaultTemperature?: number;
  /** Default max tokens (default: 1024) */
  defaultMaxTokens?: number;
}

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';
  readonly name: string;

  private client: Anthropic;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: AnthropicProviderConfig) {
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.defaultTemperature = config.defaultTemperature ?? 0.7;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 1024;
    this.name = `Anthropic (${this.model})`;

    this.client = new Anthropic({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const { system, messages } = this.buildMessages(request);
    console.log('[Anthropic Request]', { model: this.model, system, messages });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens ?? this.defaultMaxTokens,
      temperature: request.temperature ?? this.defaultTemperature,
      ...(system ? { system } : {}),
      messages,
    });

    console.log('[Anthropic Response]', response);

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      text,
      usage: response.usage
        ? {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
          }
        : undefined,
    };
  }

  async *stream(request: AIRequest): AsyncIterable<string> {
    const { system, messages } = this.buildMessages(request);
    console.log('[Anthropic Stream Request]', { model: this.model, system, messages });

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: request.maxTokens ?? this.defaultMaxTokens,
      temperature: request.temperature ?? this.defaultTemperature,
      ...(system ? { system } : {}),
      messages,
    });

    let fullResponse = '';

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        fullResponse += event.delta.text;
        yield event.delta.text;
      }
    }

    console.log('[Anthropic Stream Complete]', fullResponse || '(empty)');
  }

  private buildMessages(request: AIRequest): {
    system: string | undefined;
    messages: Array<{ role: 'user'; content: string }>;
  } {
    const systemParts: string[] = [];

    if (request.systemPrompt) {
      systemParts.push(request.systemPrompt);
    }
    if (request.context) {
      systemParts.push(`Context:\n${request.context}`);
    }

    return {
      system: systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
      messages: [{ role: 'user', content: request.prompt }],
    };
  }
}
