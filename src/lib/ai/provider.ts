// ==========================================
// AIプロバイダー共通インターフェース & ファクトリー
// ==========================================
import type { AiProviderType } from '@/types';
import { GeminiProvider } from './gemini';
import { GroqQwenProvider } from './groq';
import { DeepSeekProvider } from './deepseek';
import { OpenAIGptProvider } from './openai';
import { OpenRouterProvider } from './openrouter';
import { TemplateProvider } from './template';

export interface AiGenerateOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * 全AIプロバイダーが実装する共通インターフェース
 */
export interface AiProvider {
  /** テキスト生成 */
  generateText(
    prompt: string,
    systemInstruction: string,
    options?: AiGenerateOptions
  ): Promise<string>;

  /** 画像付きテキスト生成 (サポートしないプロバイダーは画像を無視) */
  generateWithImages(
    prompt: string,
    imageUrls: string[],
    systemInstruction: string,
    options?: AiGenerateOptions
  ): Promise<string>;

  /** プロバイダー名 */
  getProviderName(): string;
}

/**
 * 設定に基づいてAIプロバイダーインスタンスを生成
 */
export function createProvider(
  providerType: AiProviderType,
  apiKey: string,
  model: string,
  templates?: { postTemplates: string[]; replyTemplates: string[]; templateIndex: number; mode: 'fixed' | 'random' }
): AiProvider {
  switch (providerType) {
    case 'GEMINI':
      return new GeminiProvider(apiKey, model);
    case 'GROQ_QWEN':
      return new GroqQwenProvider(apiKey, model);
    case 'DEEPSEEK':
      return new DeepSeekProvider(apiKey, model);
    case 'OPENAI_GPT':
      return new OpenAIGptProvider(apiKey, model);
    case 'OPENROUTER':
      return new OpenRouterProvider(apiKey, model);
    case 'NONE':
      if (!templates) {
        throw new Error('Template configuration required for NONE provider');
      }
      return new TemplateProvider(
        templates.postTemplates,
        templates.replyTemplates,
        templates.mode,
        templates.templateIndex
      );
    default:
      throw new Error(`Unknown AI provider: ${providerType}`);
  }
}
