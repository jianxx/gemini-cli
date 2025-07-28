/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
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
  Content,
} from '@google/genai';

function toOpenAIMessages(contents: Content[]) {
  return contents.map((c) => ({
    role: c.role,
    content: c.parts?.map((p: { text?: string }) => p.text || '').join('') ?? '',
  }));
}

export async function createProvider(
  config: ContentGeneratorConfig,
  _gcConfig: Config,
  _sessionId?: string,
): Promise<ContentGenerator> {
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for OpenAI provider');
  }
  const client = new OpenAI({ apiKey });

  const generator: ContentGenerator = {
    async generateContent(request: GenerateContentParameters) {
      const messages = toOpenAIMessages(request.contents || []);
      const completion = await client.chat.completions.create({
        model: request.model,
        messages,
        temperature: request.config?.temperature,
        top_p: request.config?.topP,
      });
      const text = completion.choices[0]?.message?.content || '';
      return {
        candidates: [
          { content: { role: 'model', parts: [{ text }] } },
        ],
        usageMetadata: {
          totalTokens: completion.usage?.total_tokens,
        },
      } as GenerateContentResponse;
    },

    async generateContentStream(
      request: GenerateContentParameters,
    ): Promise<AsyncGenerator<GenerateContentResponse>> {
      const messages = toOpenAIMessages(request.contents || []);
      const stream = await client.chat.completions.create({
        model: request.model,
        messages,
        temperature: request.config?.temperature,
        top_p: request.config?.topP,
        stream: true,
      });
      async function* iterator() {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          yield {
            candidates: [
              { content: { role: 'model', parts: [{ text }] } },
            ],
          } as GenerateContentResponse;
        }
      }
      return iterator();
    },

    async countTokens(_req: CountTokensParameters): Promise<CountTokensResponse> {
      throw new Error('countTokens is not implemented for OpenAI provider');
    },

    async embedContent(
      request: EmbedContentParameters,
    ): Promise<EmbedContentResponse> {
      const res = await client.embeddings.create({
        model: request.model,
        input: request.contents as unknown as string | string[],
      });
      return {
        embeddings: res.data.map((e: { embedding: number[] }) => ({
          values: e.embedding,
        })),
      } as EmbedContentResponse;
    },
  };

  return generator;
}

