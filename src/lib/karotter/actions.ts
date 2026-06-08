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
  const res = await client.request('POST', `/follow/${userId}`, { timeout: 10000 });
  if (res.ok) {
    console.log(`🤝 フォロー成功！(内部API)`);
    return true;
  }
  
  return false;
}

/**
 * DM機能
 */
export async function getDmGroups(client: KarotterClient): Promise<any[]> {
  const res = await client.request('GET', `/dm/groups`, { timeout: 10000 });
  if (res.ok && res.data) {
    if (Array.isArray(res.data)) return res.data;
    if (typeof res.data === 'object' && Array.isArray((res.data as any).groups)) return (res.data as any).groups;
  }
  return [];
}

export async function getDmMessages(client: KarotterClient, groupId: string, limit: number = 20): Promise<any[]> {
  const res = await client.request('GET', `/dm/groups/${groupId}/messages?limit=${limit}`, { timeout: 10000 });
  if (res.ok && res.data) {
    if (Array.isArray(res.data)) return res.data;
    if (typeof res.data === 'object' && Array.isArray((res.data as any).messages)) return (res.data as any).messages;
  }
  return [];
}

export async function markDmAsRead(client: KarotterClient, groupId: string): Promise<boolean> {
  const res = await client.request('POST', `/dm/groups/${groupId}/read`, { timeout: 10000 });
  return res.ok;
}

export async function sendDm(client: KarotterClient, groupId: string, content: string, mediaUrls?: string[]): Promise<boolean> {
  const payload: Record<string, unknown> = {
    groupId,
    content,
  };

  let finalBody: unknown | FormData = payload;

  if (mediaUrls && mediaUrls.length > 0) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    for (const url of mediaUrls) {
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

  // DM送信は /dm/groups/{groupId}/messages か /dm/messages かもしれない。
  // 画像から /dm/groups/{groupId}/messages と推測されるが、テストしておく
  const res = await client.request('POST', `/dm/groups/${groupId}/messages`, { body: finalBody, timeout: 10000 });
  if (res.ok) {
    console.log(`✉️ DM送信成功: ${content.slice(0, 30)}...`);
    return true;
  }
  return false;
}
