// ==========================================
// OpenRouter プロバイダー (OpenRouter API)
// ==========================================
import type { AiProvider, AiGenerateOptions } from './provider';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

export class OpenRouterProvider implements AiProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'google/gemma-2-9b-it:free') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateText(
    prompt: string,
    systemInstruction: string,
    options: AiGenerateOptions = {}
  ): Promise<string> {
    return this.chatCompletion(prompt, [], systemInstruction, options);
  }

  async generateWithImages(
    prompt: string,
    imageUrls: string[],
    systemInstruction: string,
    options: AiGenerateOptions = {}
  ): Promise<string> {
    return this.chatCompletion(prompt, imageUrls, systemInstruction, options);
  }

  getProviderName(): string {
    return `OpenRouter (${this.model})`;
  }

  private async chatCompletion(
    prompt: string,
    imageUrls: string[],
    systemInstruction: string,
    options: AiGenerateOptions
  ): Promise<string> {
    // ユーザーメッセージにテキストと画像を含める
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    for (const url of imageUrls) {
      const fullUrl = url.startsWith('/') ? `https://karotter.com${url}` : url;
      userContent.push({ type: 'image_url', image_url: { url: fullUrl } });
    }

    userContent.push({ type: 'text', text: prompt });

    const messages = [
      { role: 'system', content: systemInstruction },
      {
        role: 'user',
        content: imageUrls.length > 0 ? userContent : prompt,
      },
    ];

    const body = {
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 512,
    };

    try {
      const res = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://karobot-manager.onrender.com/',
          'X-Title': 'KaroBot',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        throw new Error(`OpenRouter API error: ${res.status}`);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      return text || 'SKIP';
    } catch (e) {
      throw new Error(`OpenRouter Exception: ${e}`);
    }
  }
}
