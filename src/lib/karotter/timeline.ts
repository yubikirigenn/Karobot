// ==========================================
// タイムライン取得・解析
// yudetamagobot.py から移植
// ==========================================
import { KarotterClient } from './client';
import type { KarotterPost } from '@/types';

/**
 * グローバルタイムライン取得（リプライ除外済み）
 */
export async function getGlobalPosts(client: KarotterClient, limit: number = 60): Promise<KarotterPost[]> {
  const urls = [
    `/posts/recommended?limit=${limit}&mode=latest`,
    `/timeline?limit=${limit}`,
    `/posts?limit=${limit}`,
  ];

  for (const url of urls) {
    const res = await client.request<{ posts?: KarotterPost[] } | KarotterPost[]>('GET', url);
    if (res.ok && res.data) {
      let rawPosts: KarotterPost[] = [];
      if (Array.isArray(res.data)) {
        rawPosts = res.data;
      } else if (res.data.posts) {
        rawPosts = res.data.posts;
      }

      // リプライを除外
      return rawPosts.filter(p => {
        const actual = p.post || p;
        return !actual.parentId && !actual.replyToId && !actual.replyId;
      }).map(p => p.post || p);
    }
  }

  return [];
}

/**
 * 投稿の詳細を取得
 */
export async function getPostDetail(client: KarotterClient, postId: string): Promise<KarotterPost | null> {
  const res = await client.request<{ post?: KarotterPost } | KarotterPost>('GET', `/posts/${postId}`, { timeout: 10000 });
  if (res.ok && res.data) {
    const data = res.data;
    if ('post' in data && data.post) return data.post;
    return data as KarotterPost;
  }
  return null;
}

/**
 * 大元の投稿IDを遡って取得
 */
export async function getRootId(client: KarotterClient, postData: KarotterPost): Promise<string> {
  let current = postData;
  for (let i = 0; i < 10; i++) {
    const parentId = String(current.parentId || current.replyToId || current.replyId || '');
    if (!parentId) return String(current.id);

    const parent = await getPostDetail(client, parentId);
    if (parent) {
      current = parent;
    } else {
      return parentId;
    }
  }
  return String(current.id || '');
}

/**
 * 引用チェーンを遡ってテキスト化
 */
export async function resolveQuoteChain(
  client: KarotterClient,
  postData: KarotterPost,
  depth: number = 0,
  maxDepth: number = 5
): Promise<string> {
  if (!postData || depth >= maxDepth) return '';

  const actual = postData.post || postData;
  const quoteId = String(actual.quotedPostId || actual.quoteId || actual.renoteId || '');

  if (!quoteId) {
    const parentId = String(actual.parentId || actual.replyToId || actual.replyId || '');
    if (parentId) {
      const parent = await getPostDetail(client, parentId);
      if (parent) return resolveQuoteChain(client, parent, depth + 1, maxDepth);
    }
    return '';
  }

  let quotePost = actual.quote || actual.quotedPost || null;
  if (!quotePost) {
    quotePost = await getPostDetail(client, quoteId);
  }

  if (quotePost) {
    const actualQuote = quotePost.post || quotePost;
    const author = actualQuote.author?.username || actualQuote.user?.username || 'unknown';
    const content = actualQuote.content || '';
    const chainText = `【引用元(@${author})】: ${content}\n`;
    const parentChain = await resolveQuoteChain(client, actualQuote, depth + 1, maxDepth);
    return parentChain ? parentChain + chainText : chainText;
  }

  return '';
}

/**
 * TLコンテキスト構築（AI用）
 */
export function buildTlContext(posts: KarotterPost[], botUsername: string, blockedUsers: string[]): string {
  const lines: string[] = [];
  const blocked = blockedUsers.map(u => u.toLowerCase());

  for (const p of posts.slice(0, 20)) {
    const actual = p.post || p;
    const author = actual.author?.username || actual.user?.username || 'unknown';
    if (author.toLowerCase() === botUsername.toLowerCase()) continue;
    if (author.toLowerCase().includes('bot')) continue;
    if (blocked.includes(author.toLowerCase())) continue;

    const content = actual.content || '';
    if (content) lines.push(`@${author}: ${content}`);
  }

  return lines.join('\n');
}

/**
 * TLのペースから次回投稿間隔を計算
 */
export function calculateTlPace(
  posts: KarotterPost[],
  actMult: number,
  botUsername: string,
  config: { minInterval: number; maxInterval: number; paceMultiplier: number }
): number {
  const times: number[] = [];

  for (const p of posts) {
    const actual = p.post || p;
    const author = actual.author?.username || actual.user?.username || '';
    if (author.toLowerCase().includes('bot') || author.toLowerCase() === botUsername.toLowerCase()) continue;
    if (actual.createdAt) {
      const t = new Date(actual.createdAt).getTime();
      if (!isNaN(t)) times.push(t);
    }
  }

  if (times.length < 2) return config.maxInterval / 2;

  times.sort((a, b) => a - b);
  const diff = (times[times.length - 1] - times[0]) / 1000;
  const avg = diff / Math.max(1, times.length - 1);

  const randomMult = 2.0 + Math.random() * 2.0;
  let pace = avg * randomMult * config.paceMultiplier;
  pace = pace / Math.max(0.01, actMult);

  return Math.max(config.minInterval, Math.min(pace, config.maxInterval));
}

/**
 * アクティビティ倍率（深夜は低く）
 */
export function getActivityMultiplier(nightModeEnabled: boolean = true): number {
  if (!nightModeEnabled) return 1.0;

  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const h = jstNow.getUTCHours();
  const m = jstNow.getUTCMinutes();

  if (h >= 23 || h < 3) return 0.1;
  if (h >= 3 && h < 6) {
    const minutesPast3 = (h - 3) * 60 + m;
    return 0.1 + (0.9 * (minutesPast3 / 180.0));
  }
  return 1.0;
}
