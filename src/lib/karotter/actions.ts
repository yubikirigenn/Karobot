// ==========================================
// Karotter アクション
// 投稿・いいね・リカロート・リアクション・フォロー
// yudetamagobot.py から移植
// ==========================================
import { KarotterClient } from './client';
import fs from 'fs/promises';
import path from 'path';

/**
 * カロート（投稿）を送信
 */
export async function postKaroto(
  client: KarotterClient,
  text: string,
  options?: { parentId?: string; quoteId?: string; mediaUrls?: string[] }
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

  let finalBody: unknown | FormData = payload;

  if (options?.mediaUrls && options.mediaUrls.length > 0) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    for (const url of options.mediaUrls) {
      if (url.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), 'public', url.replace(/\//g, path.sep));
        try {
          const buffer = await fs.readFile(filePath);
          const ext = path.extname(filePath).toLowerCase();
          let mimeType = 'image/jpeg';
          if (ext === '.png') mimeType = 'image/png';
          else if (ext === '.gif') mimeType = 'image/gif';
          else if (ext === '.mp4') mimeType = 'video/mp4';
          else if (ext === '.mov') mimeType = 'video/quicktime';
          else if (ext === '.webp') mimeType = 'image/webp';
          
          const blob = new Blob([buffer], { type: mimeType });
          formData.append('media', blob, path.basename(filePath));
        } catch (err) {
          console.error(`Failed to read media file ${filePath}`, err);
        }
      }
    }
    finalBody = formData;
  }

  const res = await client.request<{ id?: string; post?: { id?: string } }>('POST', '/posts', {
    body: finalBody,
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
