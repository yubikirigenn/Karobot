// ==========================================
// Karotter アクション
// 投稿・いいね・リカロート・リアクション・フォロー
// yudetamagobot.py から移植
// ==========================================
import { KarotterClient } from './client';

/**
 * カロート（投稿）を送信
 */
export async function postKaroto(
  client: KarotterClient,
  text: string,
  options?: { parentId?: string; quoteId?: string }
): Promise<string | null> {
  const payload: Record<string, unknown> = {
    content: text,
    isAiGenerated: false,
    isPromotional: false,
    visibility: 'PUBLIC',
    replyRestriction: 'EVERYONE',
  };

  if (options?.parentId) {
    payload.parentId = options.parentId;
    payload.replyId = options.parentId;
  }

  if (options?.quoteId) {
    payload.quotedPostId = options.quoteId;
    payload.quoteId = options.quoteId;
    payload.renoteId = options.quoteId;
    payload.isQuote = true;
    payload.type = 'QUOTE';
  }

  const res = await client.request<{ id?: string; post?: { id?: string } }>('POST', '/posts', {
    body: payload,
  });

  if (res.ok && res.data) {
    const newId = String(res.data.id || res.data.post?.id || '');
    console.log(`✨ 投稿成功: ${text.slice(0, 30)}...`);
    return newId || null;
  }

  console.error(`❌ 投稿失敗: ${res.status}`);
  return null;
}

/**
 * いいね
 */
export async function likePost(client: KarotterClient, postId: string): Promise<boolean> {
  const res = await client.request('POST', `/posts/${postId}/like`, { timeout: 10000 });
  if (res.ok) {
    console.log(`❤️ いいね成功！`);
    return true;
  }
  // フォールバック
  await client.request('POST', '/reactions', { body: { postId, type: 'LIKE' }, timeout: 10000 });
  return false;
}

/**
 * リカロート
 */
export async function rekarotPost(client: KarotterClient, postId: string): Promise<boolean> {
  const res = await client.request('POST', '/posts', { body: { repostId: postId }, timeout: 10000 });
  if (res.ok) {
    console.log(`🔄 リカロート成功！`);
    return true;
  }
  // フォールバック
  await client.request('POST', '/posts', { body: { renoteId: postId }, timeout: 10000 });
  return false;
}

/**
 * 絵文字リアクション
 */
export async function reactPost(client: KarotterClient, postId: string, emoji: string): Promise<boolean> {
  const res = await client.request('POST', `/posts/${postId}/react`, {
    body: { emoji },
    timeout: 10000,
  });
  if (res.ok) {
    console.log(`😆 リアクション成功！(${emoji})`);
    return true;
  }
  console.warn(`⚠️ リアクション失敗`);
  return false;
}

/**
 * フォロー
 */
export async function followUser(client: KarotterClient, userId: string): Promise<boolean> {
  const res = await client.request('POST', `/users/${userId}/follow`, { timeout: 10000 });
  if (res.ok) {
    console.log(`🤝 フォロー成功！`);
    return true;
  }
  return false;
}
