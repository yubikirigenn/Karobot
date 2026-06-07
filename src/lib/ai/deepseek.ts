// ==========================================
// DeepSeek V4 Flash プロバイダー
// OpenAI互換APIフォーマット
// ==========================================
import type { AiProvider, AiGenerateOptions } from './provider';

const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';

export class DeepSeekProvider implements AiProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'deepseek-v4-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateText(
    prompt: string,
    systemInstruction: string,
    options: AiGenerateOptions = {}
  ): Promise<string> {
    return this.chatCompletion(prompt, systemInstruction, options);
  }

  async generateWithImages(
    prompt: string,
    _imageUrls: string[],
    systemInstruction: string,
    options: AiGenerateOptions = {}
  ): Promise<string> {
    // DeepSeekは画像入力非対応のためテキストのみ
    return this.chatCompletion(prompt, systemInstruction, options);
  }

  getProviderName(): string {
    return `DeepSeek V4 Flash`;
  }

  private async chatCompletion(
    prompt: string,
    systemInstruction: string,
    options: AiGenerateOptions
  ): Promise<string> {
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 512,
    };

    try {
      const res = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        throw new Error(`DeepSeek API error: ${res.status}`);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      return text || 'SKIP';
    } catch (e) {
      throw new Error(`DeepSeek Exception: ${e}`);
    }
  }
}
