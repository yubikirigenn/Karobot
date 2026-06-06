// ==========================================
// Gemini 3.1 Flash Lite プロバイダー
// ==========================================
import type { AiProvider, AiGenerateOptions } from './provider';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiProvider implements AiProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-3.1-flash-lite') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateText(
    prompt: string,
    systemInstruction: string,
    options: AiGenerateOptions = {}
  ): Promise<string> {
    return this.generate(prompt, [], systemInstruction, options);
  }

  async generateWithImages(
    prompt: string,
    imageUrls: string[],
    systemInstruction: string,
    options: AiGenerateOptions = {}
  ): Promise<string> {
    return this.generate(prompt, imageUrls, systemInstruction, options);
  }

  getProviderName(): string {
    return `Gemini (${this.model})`;
  }

  private async generate(
    prompt: string,
    imageUrls: string[],
    systemInstruction: string,
    options: AiGenerateOptions
  ): Promise<string> {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // 画像をBase64でインライン化
    for (const url of imageUrls) {
      try {
        const fullUrl = url.startsWith('/') ? `https://karotter.com${url}` : url;
        const res = await fetch(fullUrl, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const mimeType = res.headers.get('content-type') || 'image/jpeg';
          parts.push({ inlineData: { mimeType, data: base64 } });
        }
      } catch (e) {
        console.warn(`⚠️ Gemini画像取得エラー: ${e}`);
      }
    }

    parts.push({ text: prompt });

    const body = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts }],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 512,
      },
    };

    try {
      const res = await fetch(
        `${GEMINI_API_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!res.ok) {
        console.error(`Gemini API error: ${res.status} ${await res.text()}`);
        return 'SKIP';
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return text || 'SKIP';
    } catch (e) {
      console.error(`Gemini Exception: ${e}`);
      return 'SKIP';
    }
  }
}
