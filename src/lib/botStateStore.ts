// ==========================================
// BotStateStore — インメモリ状態管理
// Bot実行時の Supabase DB クエリをゼロにするための
// シングルトンストア。起動時にDBからロードし、
// 以降はメモリ上で完結する。
// ==========================================

export interface PendingLog {
  botId: string;
  action: string;
  detail: string;
  success: boolean;
  targetPostId: string | null;
  resultPostId: string | null;
  createdAt: Date;
}

export interface PendingSeenPost {
  botId: string;
  postId: string;
  type: string;
  createdAt: Date;
}

class BotStateStore {
  private bots = new Map<string, Record<string, any>>();
  private seenPosts = new Map<string, Map<string, string>>();
  private pendingLogs: PendingLog[] = [];
  private pendingSeenPosts: PendingSeenPost[] = [];
  private dirtyBotUpdates = new Map<string, Record<string, any>>();
  private _loaded = false;

  get isLoaded(): boolean {
    return this._loaded;
  }

  // --- 起動時: DB から全データをメモリにロード ---

  async loadFromDb(): Promise<void> {
    const { prisma } = await import('./prisma');

    // 全Bot設定をロード
    const allBots = await prisma.bot.findMany();
    this.bots.clear();
    for (const bot of allBots) {
      this.bots.set(bot.id, { ...bot });
    }

    // 3日分の seenPosts をロード (postId + type のみ)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const allSeenPosts = await prisma.seenPost.findMany({
      where: { createdAt: { gte: threeDaysAgo } },
      select: { botId: true, postId: true, type: true },
    });

    this.seenPosts.clear();
    for (const sp of allSeenPosts) {
      if (!this.seenPosts.has(sp.botId)) {
        this.seenPosts.set(sp.botId, new Map());
      }
      this.seenPosts.get(sp.botId)!.set(sp.postId, sp.type);
    }

    this._loaded = true;
    console.log(
      `[Store] ✅ Loaded ${allBots.length} bots, ${allSeenPosts.length} seenPosts into memory`
    );
  }

  // --- Bot データアクセス ---

  getBotData(botId: string): Record<string, any> | null {
    return this.bots.get(botId) ?? null;
  }

  getAllActiveBots(): { id: string; name: string }[] {
    const result: { id: string; name: string }[] = [];
    for (const bot of this.bots.values()) {
      if (bot.status === 'ACTIVE') {
        result.push({ id: bot.id, name: bot.name });
      }
    }
    return result;
  }

  getAllBotIds(): string[] {
    return Array.from(this.bots.keys());
  }

  getBotsForUser(userId: string): any[] {
    const result: any[] = [];
    for (const bot of this.bots.values()) {
      if (bot.userId === userId) {
        result.push({
          id: bot.id,
          name: bot.name,
          karotterUsername: bot.karotterUsername,
          postMode: bot.postMode,
          aiProvider: bot.aiProvider,
          status: bot.status,
          lastExecutedAt: bot.lastExecutedAt,
          createdAt: bot.createdAt,
        });
      }
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Bot のフィールドを更新する
   * @param markDirty true=次回sync時にDBに書き戻す, false=APIルートで既にDB書き込み済み
   */
  updateBotFields(
    botId: string,
    data: Record<string, any>,
    markDirty: boolean = true
  ): void {
    const bot = this.bots.get(botId);
    if (!bot) return;

    // インメモリ更新
    Object.assign(bot, data);

    // ダーティフラグ追加
    if (markDirty) {
      const existing = this.dirtyBotUpdates.get(botId) || {};
      this.dirtyBotUpdates.set(botId, { ...existing, ...data });
    }
  }

  // --- SeenPosts ---

  getSeenPostSets(botId: string): {
    seenIds: Set<string>;
    aiPostedIds: Set<string>;
  } {
    const seenIds = new Set<string>();
    const aiPostedIds = new Set<string>();
    const botSeen = this.seenPosts.get(botId);
    if (botSeen) {
      for (const [postId, type] of botSeen) {
        if (type === 'SEEN') seenIds.add(postId);
        else if (type === 'AI_POSTED') aiPostedIds.add(postId);
      }
    }
    return { seenIds, aiPostedIds };
  }

  markSeen(botId: string, postId: string, type: 'SEEN' | 'AI_POSTED'): void {
    if (!this.seenPosts.has(botId)) {
      this.seenPosts.set(botId, new Map());
    }
    const isNew = !this.seenPosts.get(botId)!.has(postId);
    this.seenPosts.get(botId)!.set(postId, type);
    if (isNew) {
      this.pendingSeenPosts.push({
        botId,
        postId,
        type,
        createdAt: new Date(),
      });
    }
  }

  // --- ログ ---

  addLog(
    botId: string,
    action: string,
    detail: string,
    success: boolean,
    targetPostId?: string | null,
    resultPostId?: string | null
  ): void {
    this.pendingLogs.push({
      botId,
      action,
      detail,
      success,
      targetPostId: targetPostId ?? null,
      resultPostId: resultPostId ?? null,
      createdAt: new Date(),
    });
  }

  /** 指定Botの未同期ログを取得（新しい順） */
  getRecentLogs(botId: string, limit: number = 100): PendingLog[] {
    return this.pendingLogs
      .filter((l) => l.botId === botId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // --- 統計 ---

  getActiveCount(): number {
    let count = 0;
    for (const bot of this.bots.values()) {
      if (bot.status === 'ACTIVE') count++;
    }
    return count;
  }

  getTotalCount(): number {
    return this.bots.size;
  }

  // --- API Route からの通知 ---

  addBotToStore(bot: Record<string, any>): void {
    this.bots.set(bot.id, { ...bot });
  }

  removeBotFromStore(botId: string): void {
    this.bots.delete(botId);
    this.seenPosts.delete(botId);
    this.pendingLogs = this.pendingLogs.filter((l) => l.botId !== botId);
    this.pendingSeenPosts = this.pendingSeenPosts.filter(
      (sp) => sp.botId !== botId
    );
    this.dirtyBotUpdates.delete(botId);
  }

  // --- Sync 用: 保留データの取り出し ---

  flushPendingData(): {
    logs: PendingLog[];
    seenPosts: PendingSeenPost[];
    botUpdates: Map<string, Record<string, any>>;
  } {
    const data = {
      logs: [...this.pendingLogs],
      seenPosts: [...this.pendingSeenPosts],
      botUpdates: new Map(this.dirtyBotUpdates),
    };
    this.pendingLogs = [];
    this.pendingSeenPosts = [];
    this.dirtyBotUpdates.clear();
    return data;
  }

  /** メモリ上の古い seenPosts をクリーンアップ（肥大化防止） */
  cleanupOldSeenPosts(): void {
    for (const [, posts] of this.seenPosts) {
      if (posts.size > 5000) {
        const entries = [...posts.entries()];
        const toKeep = entries.slice(-3000);
        posts.clear();
        for (const [k, v] of toKeep) {
          posts.set(k, v);
        }
      }
    }
  }
}

export const store = new BotStateStore();
