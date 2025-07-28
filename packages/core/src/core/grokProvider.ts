/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

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
} from '@google/genai';

export async function createProvider(
  _config: ContentGeneratorConfig,
  _gcConfig: Config,
  _sessionId?: string,
): Promise<ContentGenerator> {
  const generator: ContentGenerator = {
    async generateContent(_request: GenerateContentParameters) {
      throw new Error('Provider not implemented');
    },
    async generateContentStream(
      _request: GenerateContentParameters,
    ): Promise<AsyncGenerator<GenerateContentResponse>> {
      throw new Error('Provider not implemented');
    },
    async countTokens(
      _req: CountTokensParameters,
    ): Promise<CountTokensResponse> {
      throw new Error('Provider not implemented');
    },
    async embedContent(
      _req: EmbedContentParameters,
    ): Promise<EmbedContentResponse> {
      throw new Error('Provider not implemented');
    },
  };
  return generator;
}
