import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';
import { LLMProvider, LLMProviderOptions, AuthenticationError, RateLimitError, InvalidRequestError } from './llm_provider';
import { Message } from './types';
import { getCredentials } from '../credentials';


export const DEFAULT_MAX_TOKENS = 1024;


export class AnthropicProvider implements LLMProvider {

  constructor(private awsProfile: string, private awsRegion: string, private model: string) {
  }

  async getClient() {
    let credentials = await getCredentials(this.awsProfile, this.awsRegion);
    const client = new AnthropicBedrock({
      awsSessionToken: credentials.sessionToken,
      awsRegion: this.awsRegion,
      awsAccessKey: credentials.accessKeyId,
      awsSecretKey: credentials.secretAccessKey,
    });
    return client;
  }

  async generateMessage(messages: Message[], options: LLMProviderOptions): Promise<string> {
    try {
      console.log('Generating response...');
      console.log(JSON.stringify(messages));
      console.log(JSON.stringify(options));
      const model = options.model || this.model;
      const client = await this.getClient();
      const response = await client.messages.create({
        model: model,
        max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        temperature: options.temperature,
        top_p: options.topP,
        top_k: options.topK,
        system: options.system,
        messages: messages.map(msg => ({ role: msg.role as "user" | "assistant", content: msg.content })),
      });

      return response.content && response.content.length > 0 && response.content[0].type === 'text'
        ? response.content[0].text
        : '';
    } catch (error) {
      this.handleError(error);
    }
  }

  async *streamMessage(messages: Message[], options: LLMProviderOptions): AsyncIterableIterator<string> {
    try {
      const client = await this.getClient();
      const stream = client.messages.stream({
        model: options.model || this.model,
        max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        temperature: options.temperature,
        top_p: options.topP,
        top_k: options.topK,
        system: options.system,
        messages: messages.map(msg => ({ role: msg.role as "user" | "assistant", content: msg.content })),
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          const contentBlockDelta = chunk as { type: 'content_block_delta', delta: { text: string } };
          yield contentBlockDelta.delta.text || '';
        }
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: any): never {
    if (error.status === 401) {
      throw new AuthenticationError('Authentication failed with Anthropic', 'Anthropic');
    } else if (error.status === 429) {
      throw new RateLimitError('Rate limit exceeded for Anthropic', 'Anthropic');
    } else {
      throw new InvalidRequestError(`Anthropic request failed: ${error.message}`, 'Anthropic');
    }
  }
}