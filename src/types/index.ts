// ==========================================
// KaroBot Manager — 型定義
// ==========================================

// --- Bot動作モード ---
export type PostMode = 'AI' | 'FIXED_TEMPLATE' | 'RANDOM_TEMPLATE';

// --- AIプロバイダー ---
export type AiProviderType = 'GEMINI' | 'GROQ_QWEN' | 'DEEPSEEK' | 'OPENAI_GPT' | 'OPENROUTER' | 'NONE';

// --- Bot稼働状態 ---
export type BotStatus = 'ACTIVE' | 'PAUSED';

// --- 確率設定 ---
export interface Probabilities {
  like: number;
  rekarot: number;
  quote: number;
  reply: number;
  react: number;
}

// --- 機能フラグ ---
export interface BotFeatures {
  autoPost: boolean;
  like: boolean;
  rekarot: boolean;
  quoteRekarot: boolean;
  reply: boolean;
  reaction: boolean;
  followBack: boolean;
  notificationReply: boolean;
  mentionReaction: boolean;
  selfLearning: boolean;
  nightMode: boolean;
}

// --- Bot作成/更新リクエスト ---
export interface BotCreateRequest {
  name: string;
  karotterUsername: string;
  karotterPassword: string;
  postMode: PostMode;
  aiProvider: AiProviderType;
  aiApiKey?: string;
  aiModel?: string;
  systemInstruction?: string;
  postTemplates?: string[];
  replyTemplates?: string[];
  mentionSystemInstruction?: string;
  mentionReplyTemplates?: string[];
  probabilities?: Probabilities;
  features?: BotFeatures;
  blockedUsers?: string[];
  autoPostMinInterval?: number;
  autoPostPaceMultiplier?: number;
  autoPostMaxInterval?: number;
}

// --- Bot一覧表示用 ---
export interface BotSummary {
  id: string;
  name: string;
  karotterUsername: string;
  postMode: PostMode;
  aiProvider: AiProviderType;
  status: BotStatus;
  lastExecutedAt: string | null;
  createdAt: string;
}

// --- Bot詳細 ---
export interface BotDetail extends BotSummary {
  aiModel: string;
  systemInstruction: string;
  postTemplates: string[];
  replyTemplates: string[];
  mentionSystemInstruction: string;
  mentionReplyTemplates: string[];
  probabilities: Probabilities;
  features: BotFeatures;
  blockedUsers: string[];
  autoPostMinInterval: number;
  autoPostPaceMultiplier: number;
  autoPostMaxInterval: number;
}

// --- 実行ログ ---
export interface BotLogEntry {
  id: string;
  action: string;
  detail: string;
  targetPostId: string | null;
  resultPostId: string | null;
  success: boolean;
  createdAt: string;
}

// --- AIプロバイダー設定 ---
export interface AiProviderConfig {
  provider: AiProviderType;
  apiKey: string;
  model: string;
  systemInstruction: string;
}

// --- AIプロバイダー情報（UI表示用） ---
export interface AiProviderInfo {
  id: AiProviderType;
  name: string;
  description: string;
  defaultModel: string;
  endpoint: string;
}

export const AI_PROVIDERS: AiProviderInfo[] = [
  {
    id: 'GEMINI',
    name: 'Gemini 3.1 Flash Lite',
    description: '軽量・高速・無料枠あり (Google AI)',
    defaultModel: 'gemini-3.1-flash-lite',
    endpoint: 'generativelanguage.googleapis.com',
  },
  {
    id: 'GROQ_QWEN',
    name: 'Qwen 3 32B (Groq)',
    description: '超高速推論 (Groq API)',
    defaultModel: 'qwen3-32b',
    endpoint: 'api.groq.com',
  },
  {
    id: 'DEEPSEEK',
    name: 'DeepSeek V4 Flash',
    description: 'コスパ良好 (DeepSeek API)',
    defaultModel: 'deepseek-v4-flash',
    endpoint: 'api.deepseek.com',
  },
  {
    id: 'OPENAI_GPT',
    name: 'GPT 5.4 Nano',
    description: '高品質 (OpenAI API)',
    defaultModel: 'gpt-5.4-nano',
    endpoint: 'api.openai.com',
  },
  {
    id: 'OPENROUTER',
    name: 'Gemma 4 31B (OpenRouter Free)',
    description: 'OpenRouter (無料モデル)',
    defaultModel: 'google/gemma-4-31b-it:free',
    endpoint: 'openrouter.ai',
  },
  {
    id: 'NONE',
    name: 'なし',
    description: 'AIを使用しない',
    defaultModel: '',
    endpoint: '',
  },
];

// --- Karotter API レスポンス型 ---
export interface KarotterPost {
  id: string | number;
  content: string;
  author?: { username?: string; id?: string | number; isFollower?: boolean };
  user?: { username?: string; id?: string | number };
  createdAt?: string;
  parentId?: string | number | null;
  replyToId?: string | number | null;
  replyId?: string | number | null;
  quotedPostId?: string | number | null;
  quoteId?: string | number | null;
  renoteId?: string | number | null;
  quote?: KarotterPost;
  quotedPost?: KarotterPost;
  post?: KarotterPost;
  mediaUrls?: string[];
  replyToUsers?: Array<{ username?: string }>;
}

export interface KarotterNotification {
  id: string | number;
  type: string;
  postId?: string | number;
  post?: KarotterPost;
  actorId?: string | number;
  actor?: { id?: string | number; username?: string };
  user?: { id?: string | number; username?: string };
}
