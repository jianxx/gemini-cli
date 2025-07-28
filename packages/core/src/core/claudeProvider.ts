/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ContentGenerator,
  ContentGeneratorConfig,
} from './contentGenerator.js';
import type { Config } from '../config/config.js';
import type {
  GenerateContentParameters,
  GenerateContentResponse,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  ContentListUnion,
} from '@google/genai';

function toAnthropicMessages(contents: ContentListUnion | undefined) {
  const list = Array.isArray(contents) ? contents : contents ? [contents] : [];
  return list.map((item) => {
    if (typeof item === 'string') {
      return { role: 'user', content: item };
    }
    const parts = (item.parts ?? [])
      .map((p: unknown) => (typeof p === 'string' ? p : (p as { text?: string }).text || ''))
      .join('');
    return { role: item.role, content: String(parts) };
  });
}

export async function createProvider(
  config: ContentGeneratorConfig,
  _gcConfig: Config,
  _sessionId?: string,
): Promise<ContentGenerator> {
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required for Claude provider');
  }
  const client = new Anthropic({ apiKey });

  const generator: ContentGenerator = {
    async generateContent(request: GenerateContentParameters) {
      const messages = toAnthropicMessages(request.contents);
      const completion = await client.messages.create({
        model: request.model,
        messages: messages as unknown as Array<{ role: string; content: string }>,
        max_tokens: request.config?.maxOutputTokens ?? 1024,
        temperature: request.config?.temperature,
      });
      const text = completion.content?.[0]?.text || '';
      return {
        candidates: [
          { content: { role: 'model', parts: [{ text }] } },
        ],
      } as unknown as GenerateContentResponse;
    },

    async generateContentStream(
      _request: GenerateContentParameters,
    ): Promise<AsyncGenerator<GenerateContentResponse>> {
      throw new Error('Streaming not implemented for Claude provider');
    },

    async countTokens(
      _req: CountTokensParameters,
    ): Promise<CountTokensResponse> {
      throw new Error('countTokens is not implemented for Claude provider');
    },

    async embedContent(
      _req: EmbedContentParameters,
    ): Promise<EmbedContentResponse> {
      throw new Error('embedContent is not implemented for Claude provider');
    },
  };

  return generator;
}
