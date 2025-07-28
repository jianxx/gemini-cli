/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import { createProvider as createGoogleGenaiProvider } from './googleGenaiProvider.js';
import { createProvider as createOpenaiProvider } from './openaiProvider.js';
import { createProvider as createClaudeProvider } from './claudeProvider.js';
import { createProvider as createGrokProvider } from './grokProvider.js';
import { createProvider as createDoubaoProvider } from './doubaoProvider.js';
import { createProvider as createQwenProvider } from './qwenProvider.js';
import { createProvider as createKimiProvider } from './kimiProvider.js';
import { createProvider as createDeepseekProvider } from './deepseekProvider.js';
import { DEFAULT_GEMINI_MODEL } from '../config/models.js';
import { Config } from '../config/config.js';
import { getEffectiveModel } from './modelCheck.js';
import { UserTierId } from '../code_assist/types.js';

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;

  userTier?: UserTierId;
}

export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  USE_OPENAI = 'openai',
  USE_CLAUDE = 'claude',
  USE_GROK = 'grok',
  USE_DOUBAO = 'doubao',
  USE_QWEN = 'qwen',
  USE_KIMI = 'kimi',
  USE_DEEPSEEK = 'deepseek',
  CLOUD_SHELL = 'cloud-shell',
}

export enum Provider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  CLAUDE = 'claude',
  GROK = 'grok',
  DOUBAO = 'doubao',
  QWEN = 'qwen',
  KIMI = 'kimi',
  DEEPSEEK = 'deepseek',
}

export type ContentGeneratorConfig = {
  model: string;
  provider?: Provider;
  apiKey?: string;
  vertexai?: boolean;
  authType?: AuthType | undefined;
  proxy?: string | undefined;
};

export function createContentGeneratorConfig(
  config: Config,
  authType: AuthType | undefined,
): ContentGeneratorConfig {
  const geminiApiKey = process.env.GEMINI_API_KEY || undefined;
  const googleApiKey = process.env.GOOGLE_API_KEY || undefined;
  const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT || undefined;
  const googleCloudLocation = process.env.GOOGLE_CLOUD_LOCATION || undefined;
  const openaiApiKey = process.env.OPENAI_API_KEY || undefined;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY || undefined;
  const grokApiKey = process.env.GROK_API_KEY || undefined;
  const doubaoApiKey = process.env.DOUBAO_API_KEY || undefined;
  const qwenApiKey = process.env.QWEN_API_KEY || undefined;
  const kimiApiKey = process.env.KIMI_API_KEY || undefined;
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY || undefined;

  // Use runtime model from config if available; otherwise, fall back to parameter or default
  const effectiveModel = config.getModel() || DEFAULT_GEMINI_MODEL;

  const contentGeneratorConfig: ContentGeneratorConfig = {
    model: effectiveModel,
    authType,
    proxy: config?.getProxy(),
  };

  // If we are using Google auth or we are in Cloud Shell, there is nothing else to validate for now
  if (
    authType === AuthType.LOGIN_WITH_GOOGLE ||
    authType === AuthType.CLOUD_SHELL
  ) {
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_GEMINI && geminiApiKey) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    contentGeneratorConfig.vertexai = false;
    getEffectiveModel(
      contentGeneratorConfig.apiKey,
      contentGeneratorConfig.model,
      contentGeneratorConfig.proxy,
    );

    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_OPENAI && openaiApiKey) {
    contentGeneratorConfig.apiKey = openaiApiKey;
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_CLAUDE && anthropicApiKey) {
    contentGeneratorConfig.apiKey = anthropicApiKey;
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_GROK && grokApiKey) {
    contentGeneratorConfig.apiKey = grokApiKey;
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_DOUBAO && doubaoApiKey) {
    contentGeneratorConfig.apiKey = doubaoApiKey;
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_QWEN && qwenApiKey) {
    contentGeneratorConfig.apiKey = qwenApiKey;
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_KIMI && kimiApiKey) {
    contentGeneratorConfig.apiKey = kimiApiKey;
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_DEEPSEEK && deepseekApiKey) {
    contentGeneratorConfig.apiKey = deepseekApiKey;
    return contentGeneratorConfig;
  }

  if (
    authType === AuthType.USE_VERTEX_AI &&
    (googleApiKey || (googleCloudProject && googleCloudLocation))
  ) {
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.vertexai = true;

    return contentGeneratorConfig;
  }

  return contentGeneratorConfig;
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  const version = process.env.CLI_VERSION || process.version;
  const httpOptions = {
    headers: {
      'User-Agent': `GeminiCLI/${version} (${process.platform}; ${process.arch})`,
    },
  };
  const provider = config.provider ?? Provider.GEMINI;

  switch (provider) {
    case Provider.GEMINI:
      if (
        config.authType === AuthType.LOGIN_WITH_GOOGLE ||
        config.authType === AuthType.CLOUD_SHELL
      ) {
        return createCodeAssistContentGenerator(
          httpOptions,
          config.authType,
          gcConfig,
          sessionId,
        );
      }
      return createGoogleGenaiProvider(config, gcConfig, sessionId);
    case Provider.OPENAI:
      return createOpenaiProvider(config, gcConfig, sessionId);
    case Provider.CLAUDE:
      return createClaudeProvider(config, gcConfig, sessionId);
    case Provider.GROK:
      return createGrokProvider(config, gcConfig, sessionId);
    case Provider.DOUBAO:
      return createDoubaoProvider(config, gcConfig, sessionId);
    case Provider.QWEN:
      return createQwenProvider(config, gcConfig, sessionId);
    case Provider.KIMI:
      return createKimiProvider(config, gcConfig, sessionId);
    case Provider.DEEPSEEK:
      return createDeepseekProvider(config, gcConfig, sessionId);
    default:
      throw new Error(
        `Error creating contentGenerator: Unsupported provider: ${provider}`,
      );
  }
}
