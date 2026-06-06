// ==========================================
// Karotter クライアント
// ログイン・API通信・401自動リカバリ
// yudetamagobot.py の login_and_get_token / internal_api_request を移植
// ==========================================

const KAROTTER_INTERNAL_URL = 'https://api.karotter.com/api';
const KAROTTER_IMAGE_BASE = 'https://karotter.com';

export interface KarotterClientConfig {
  username: string;
  password: string;
  accessToken?: string | null;
}

export class KarotterClient {
  private username: string;
  private password: string;
  private accessToken: string | null;

  constructor(config: KarotterClientConfig) {
    this.username = config.username;
    this.password = config.password;
    this.accessToken = config.accessToken || null;
  }

  /** ログインしてアクセストークンを取得 */
  async login(): Promise<string> {
    const payload = {
      identifier: this.username,
      password: this.password,
      gender: 'other',
    };

    let res: Response;
    try {
      res = await fetch(`${KAROTTER_INTERNAL_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KaroBot/1.0'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
    } catch (e) {
      throw new Error(`ネットワークエラー: ${e}`);
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    this.accessToken = data.accessToken;
    return this.accessToken!;
  }

  /** 現在のアクセストークンを取得 */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /** トークンを設定（キャッシュ復元用） */
  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  /**
   * 内部API リクエスト (401自動リカバリ付き)
   */
  async request<T = unknown>(
    method: string,
    endpoint: string,
    options?: { body?: unknown; timeout?: number }
  ): Promise<{ ok: boolean; status: number; data: T | null }> {
    const url = `${KAROTTER_INTERNAL_URL}${endpoint}`;
    const timeout = options?.timeout ?? 20000;

    const doRequest = async (): Promise<Response> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KaroBot/1.0',
      };
      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      return fetch(url, {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(timeout),
      });
    };

    try {
      let res = await doRequest();

      // 401 → 自動再ログイン & リトライ
      if (res.status === 401) {
        console.log(`⚠️ 401検知(${endpoint})。自動で再ログインしてリトライします...`);
        const token = await this.login();
        if (token) {
          res = await doRequest();
        }
      }

      if (res.ok) {
        const data = await res.json().catch(() => null);
        return { ok: true, status: res.status, data: data as T };
      }

      return { ok: false, status: res.status, data: null };
    } catch (e) {
      console.error(`❌ 内部API通信エラー (${endpoint}): ${e}`);
      return { ok: false, status: 0, data: null };
    }
  }

  /** 画像URLのフルパスを取得 */
  static resolveImageUrl(url: string): string {
    if (url.startsWith('/')) return `${KAROTTER_IMAGE_BASE}${url}`;
    return url;
  }
}
