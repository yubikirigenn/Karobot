// ==========================================
// テンプレートプロバイダー（非AIモード）
// 固定ローテーション / ランダム選択
// ==========================================
import type { AiProvider, AiGenerateOptions } from './provider';

export class TemplateProvider implements AiProvider {
  private postTemplates: string[];
  private replyTemplates: string[];
  private mode: 'fixed' | 'random';
  private currentIndex: number;

  constructor(
    postTemplates: string[],
    replyTemplates: string[],
    mode: 'fixed' | 'random',
    currentIndex: number = 0
  ) {
    this.postTemplates = postTemplates.length > 0 ? postTemplates : ['こんにちは！'];
    this.replyTemplates = replyTemplates.length > 0 ? replyTemplates : ['ありがとう！', 'わかる', 'いいね！'];
    this.mode = mode;
    this.currentIndex = currentIndex;
  }

  async generateText(
    _prompt: string,
    _systemInstruction: string,
    _options?: AiGenerateOptions
  ): Promise<string> {
    return this.selectTemplate(this.postTemplates);
  }

  async generateWithImages(
    _prompt: string,
    _imageUrls: string[],
    _systemInstruction: string,
    _options?: AiGenerateOptions
  ): Promise<string> {
    return this.selectTemplate(this.replyTemplates);
  }

  getProviderName(): string {
    return `テンプレート (${this.mode === 'fixed' ? '固定' : 'ランダム'})`;
  }

  /** 現在のインデックスを取得（DB保存用） */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /** リプライ用テンプレートを取得 */
  getReplyTemplate(): string {
    return this.selectTemplate(this.replyTemplates);
  }

  private selectTemplate(templates: string[]): string {
    if (templates.length === 0) return 'SKIP';

    if (this.mode === 'fixed') {
      const text = templates[this.currentIndex % templates.length];
      this.currentIndex++;
      return this.expandVariables(text);
    } else {
      const randomIdx = Math.floor(Math.random() * templates.length);
      return this.expandVariables(templates[randomIdx]);
    }
  }

  /**
   * テンプレート変数を展開
   * {{time}} → 現在時刻 (HH:MM)
   * {{date}} → 今日の日付 (M月D日)
   * {{weekday}} → 曜日
   * {{random:A,B,C}} → ランダム選択
   */
  private expandVariables(template: string): string {
    const now = new Date();
    const weekdays = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];

    let result = template;
    result = result.replace(/\{\{time\}\}/g, `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
    result = result.replace(/\{\{date\}\}/g, `${now.getMonth() + 1}月${now.getDate()}日`);
    result = result.replace(/\{\{weekday\}\}/g, weekdays[now.getDay()]);

    // {{random:A,B,C}} パターン
    result = result.replace(/\{\{random:([^}]+)\}\}/g, (_, options) => {
      const choices = options.split(',').map((s: string) => s.trim());
      return choices[Math.floor(Math.random() * choices.length)];
    });

    return result;
  }
}
