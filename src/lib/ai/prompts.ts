// ==========================================
// 共通プロンプトテンプレート
// yudetamagobot.py から移植 + カスタマイズ可能
// ==========================================

/** デフォルトのシステムインストラクション */
export const DEFAULT_SYSTEM_INSTRUCTION = `あなたはSNS（Karotter）のごく普通のユーザーです。

【Karotterの用語と知識】
- カロート: 投稿のこと。略して「カロ」と呼ばれることもある。
- リカロート: 他の人の投稿を再共有（リツイート）すること。
- 引用リカロート: コメントをつけてリカロートすること。
- リアクション: 投稿に対して絵文字で反応すること。「👈」という絵文字はKarotterでは「それな（共感）」という意味で使われます。

【話し方のルール（厳守）】
- 敬語（です・ます等）は絶対に禁止。完全なタメ口で話す。
- 初めての相手との交流であっても「初めまして」などの挨拶は絶対に言わないこと。
- 文章はかなり短めに（1〜2文程度）。長く語らない。
- 過去の自分の投稿と同じような話題や言い回しは避け、常に新しい言葉でつぶやく。
- 画像が送られた場合は、その画像に写っているものを人間のように認識して感想を言う。
- 【重要】出力する文章の全体を「」で囲まないでください。自然なテキストのみを出力すること。

【自己学習システム】
もし今後の自分の活動に活かせる『学び』や『反省点』があれば、返信テキストの一番最後に、改行して [KNOWLEDGE] 学んだ内容 と記載してください。

【動作ルール】
- 相手からの返信が会話の終わりで、返信が不要な場合は「SKIP」という4文字だけを出力する。
- 相手へのメンション（@ユーザー名）はシステムが自動で付与するので書かない。`;

/** 自発カロート生成プロンプト */
export function buildAutoPostPrompt(tlContext: string, recentPosts: string[], timeContext: string): string {
  const myHistory = recentPosts.length > 0
    ? `【あなたの直近の投稿履歴】\n${recentPosts.map(p => `- ${p}`).join('\n')}\n\n`
    : '';

  return `以下は現在のタイムラインの直近の投稿です。

【タイムライン】
${tlContext}

${timeContext}${myHistory}この空気に紛れ込むような、あなたの短い独り言を作成してください。日常のつぶやき、疑問形、クスッと笑えるネタなど、毎回パターンを変えてバリエーション豊かにしてください。`;
}

/** リプライ生成プロンプト */
export function buildReplyPrompt(
  content: string,
  timeContext: string,
  conversationHistory: string,
  quoteChainText: string,
  isQuote: boolean
): string {
  let context = '';

  if (conversationHistory) {
    context += conversationHistory + '\n\n';
  }

  if (quoteChainText) {
    context += `※相手は以下の過去のカロートを引用して発言しています:\n${quoteChainText}\n\n`;
  }

  if (isQuote) {
    return `あなたの投稿が他の人に引用されました。この引用に対して返信（リプライ）する場合は先頭に「[REPLY]」を付け、さらに引用として返す場合は先頭に「[QUOTE]」を付けて文章を書いてください。不要な場合は「SKIP」と出力。

${timeContext}${context}相手の引用コメント: ${content}`;
  }

  return `以下のメッセージに返信して。画像がある場合はそれも見て。返信不要な場合のみ「SKIP」と出力。

${timeContext}${context}メッセージ: ${content}`;
}

/** いいね対象選別プロンプト */
export function buildLikeSelectionPrompt(candidates: Array<{ id: string; author: string; content: string }>, maxCount: number): string {
  const lines = candidates.map(c => `ID: ${c.id} | @${c.author}: ${c.content}`).join('\n');
  return `以下のタイムラインの投稿から、あなたが「いいね」をしたくなる投稿を最大${maxCount}件選び、その『ID』の数字のみをカンマ区切りで出力してください。どれも興味がない場合は「SKIP」と出力。

${lines}`;
}

/** アクション対象選別プロンプト */
export function buildActionSelectionPrompt(candidates: Array<{ id: string; author: string; content: string }>): string {
  const lines = candidates.map(c => `ID: ${c.id} | @${c.author}: ${c.content}`).join('\n');
  return `以下のタイムラインの投稿から、一番興味深い投稿を1つだけ選び、その『ID』の数字のみを出力してください。どれも全く興味がない場合は「SKIP」。

${lines}`;
}

/** 絵文字リアクション選別プロンプト */
export function buildEmojiSelectionPrompt(content: string): string {
  return `以下の投稿に対して、最も適切な絵文字リアクションを1つ選んでください。

【選択可能な絵文字リスト】
👈 (それな/激しく共感) ※乱用注意。
❤️ (いいね/好き/愛/労い)
✨ (キラキラ/素敵/おめでとう)
👀 (見てるよ/気になる/注目)
🤔 (なるほど/考えている/疑問)
🙌 (わーい/万歳/歓喜)
👏 (拍手/素晴らしい/賞賛)
🎉 (お祝い/めでたい)
✌ (ピース/やったね)
😴 (おやすみ/眠い)
☹ (悲しい/残念)
🥺 (ぴえん/切ない)
😱 (びっくり/えーっ)
👋 (バイバイ/挨拶)
🫰 (きゅん/感謝)
👍 (いいね/了解)
🤝 (よろしく/同意)
🙏 (お願い/感謝)
❓ (どういうこと？/不思議)

最後に改行して「最終決定: 〇」という形式で、必ずリストの中から1つだけ絵文字を出力してください。

投稿内容: ${content}`;
}

/** 時間コンテキスト生成 */
export function getTimeContext(): string {
  const now = new Date();
  const weekdays = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];
  return `【参考情報】現在時刻: ${now.getMonth() + 1}月${now.getDate()}日（${weekdays[now.getDay()]}）${now.getHours()}時${now.getMinutes()}分\n`;
}

/** [KNOWLEDGE]タグの抽出とクリーニング */
export function extractKnowledgeAndClean(text: string): { cleanText: string; knowledge: string | null } {
  const knowledgeMatch = text.match(/\[KNOWLEDGE\]([\s\S]*)/i);
  let knowledge: string | null = null;
  let cleanText = text;

  if (knowledgeMatch) {
    knowledge = knowledgeMatch[1].trim();
    cleanText = text.replace(knowledgeMatch[0], '').trim();
  }

  // 「」で囲まれている場合は除去
  if (cleanText.startsWith('「') && cleanText.endsWith('」')) {
    cleanText = cleanText.slice(1, -1).trim();
  }

  return { cleanText, knowledge };
}
