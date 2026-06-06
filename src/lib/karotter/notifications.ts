// ==========================================
// 通知取得・処理
// yudetamagobot.py から移植
// ==========================================
import { KarotterClient } from './client';
import type { KarotterNotification } from '@/types';

/**
 * 通知一覧を取得
 */
export async function getNotifications(client: KarotterClient): Promise<KarotterNotification[]> {
  const res = await client.request<{ notifications?: KarotterNotification[] } | KarotterNotification[]>(
    'GET',
    '/notifications?limit=20'
  );

  if (res.ok && res.data) {
    if (Array.isArray(res.data)) return res.data;
    if (res.data.notifications) return res.data.notifications;
  }

  return [];
}

/**
 * 通知の種別を判定
 */
export function classifyNotification(
  notification: KarotterNotification,
  botUsername: string,
  aiPostedIds: Set<string>
): {
  type: 'mention' | 'reply' | 'quote' | 'follow' | 'ignore';
  postId: string;
  content: string;
  authorUsername: string;
  authorId: string;
  mediaUrls: string[];
  isQuote: boolean;
} {
  const notifType = String(notification.type || '').toUpperCase();
  const post = (notification.post || {}) as import('@/types').KarotterPost;
  const content = post.content || '';
  const postId = String(notification.postId || post.id || '');
  const mediaUrls = post.mediaUrls || [];

  const authorData = post.author || post.user || {};
  const authorUsername = String(authorData.username || 'unknown');
  const authorId = String(authorData.id || notification.actorId || notification.actor?.id || notification.user?.id || '');

  // いいね・リアクション・ブックマーク → 無視
  if (['LIKE', 'REACTION', 'BOOKMARK'].includes(notifType)) {
    return { type: 'ignore', postId, content, authorUsername, authorId, mediaUrls, isQuote: false };
  }

  // リカロート（コメントなし） → 無視
  if (notifType === 'REKAROT' && !content.trim()) {
    return { type: 'ignore', postId, content, authorUsername, authorId, mediaUrls, isQuote: false };
  }

  // フォロー
  if (notifType === 'FOLLOW') {
    return { type: 'follow', postId: String(notification.id), content: '', authorUsername, authorId, mediaUrls, isQuote: false };
  }

  // 引用チェック
  const quoteId = String(post.quotedPostId || post.quoteId || '');
  const isQuote = quoteId !== '' && (aiPostedIds.has(quoteId) || notifType === 'QUOTE' || (notifType === 'REKAROT' && !!content.trim()));

  // リプライチェック
  const parentId = String(post.parentId || post.replyToId || post.replyId || '');
  const isReply = aiPostedIds.has(parentId) || notifType === 'REPLY';

  // replyToUsersチェック
  const replyToUsers = post.replyToUsers || [];
  const isReplyToBot = replyToUsers.some(
    u => typeof u === 'object' && String(u.username).toLowerCase() === botUsername.toLowerCase()
  );

  // メンションチェック
  const isMention = notifType === 'MENTION' || content.includes(`@${botUsername}`);

  if (isQuote) {
    return { type: 'quote', postId, content, authorUsername, authorId, mediaUrls, isQuote: true };
  }

  if (isMention || isReply || isReplyToBot) {
    return { type: isMention ? 'mention' : 'reply', postId, content, authorUsername, authorId, mediaUrls, isQuote: false };
  }

  return { type: 'ignore', postId, content, authorUsername, authorId, mediaUrls, isQuote: false };
}
