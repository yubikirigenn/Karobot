const fs = require('fs');

let c = fs.readFileSync('src/lib/karotter/executor.ts', 'utf8');

// botを含むユーザー名を弾く処理を削除
c = c.replace(/if \\(classified\\.authorUsername\\.toLowerCase\\(\\)\\.includes\\('bot'\\)\\) continue;\\r?\\n\\s*/, '');

// AIモード側のマーク済み処理修正
const aiTarget = "await markSeen(botId, newId, 'AI_POSTED');\\n              await logAction(botId, actionType, `@${classified.authorUsername}に返信: ${replyText.slice(0, 200)}`, true, classified.postId, newId);";
const aiReplace = "await markSeen(botId, newId, 'AI_POSTED');\\n              await markSeen(botId, classified.postId, 'SEEN');\\n              await logAction(botId, actionType, `@${classified.authorUsername}に返信: ${replyText.slice(0, 200)}`, true, classified.postId, newId);";
c = c.replace(aiTarget, aiReplace);

// テンプレートモード側のマーク済み処理修正
const tplTarget = "await markSeen(botId, newId, 'AI_POSTED');\\n              await logAction(botId, 'REPLY', `@${classified.authorUsername}に返信: ${replyText.slice(0, 200)}`, true, classified.postId, newId);";
const tplReplace = "await markSeen(botId, newId, 'AI_POSTED');\\n              await markSeen(botId, classified.postId, 'SEEN');\\n              await logAction(botId, 'REPLY', `@${classified.authorUsername}に返信: ${replyText.slice(0, 200)}`, true, classified.postId, newId);";
c = c.replace(tplTarget, tplReplace);

fs.writeFileSync('src/lib/karotter/executor.ts', c);
