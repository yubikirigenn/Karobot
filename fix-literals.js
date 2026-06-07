const fs = require('fs');
let c = fs.readFileSync('src/lib/karotter/executor.ts', 'utf8');

c = c.replace(/`AI生成エラー \\(@\\$\\{classified\\.authorUsername\\}への返信\\): \\$\\{e\\}`/g, 
  "'AI生成エラー (@' + classified.authorUsername + 'への返信): ' + e");

c = c.replace(/`@\\$\\{classified\\.authorUsername\\}に返信: \\$\\{replyText\\.slice\\(0, 200\\)\\}`/g, 
  "'@' + classified.authorUsername + 'に返信: ' + replyText.slice(0, 200)");

c = c.replace(/`\\$\\{actionType\\}: @\\$\\{classified\\.authorUsername\\} → \\$\\{replyText\\.slice\\(0, 50\\)\\}`/g, 
  "actionType + ': @' + classified.authorUsername + ' → ' + replyText.slice(0, 50)");

c = c.replace(/`テンプレート返信: \\$\\{replyText\\.slice\\(0, 200\\)\\}`/g, 
  "'テンプレート返信: ' + replyText.slice(0, 200)");

fs.writeFileSync('src/lib/karotter/executor.ts', c);
