#!/usr/bin/env node
// 現在のセッションの会話ログから直近の発言・AskUserQuestion の問答・プランを抜き出して標準出力に書く
import fs from 'node:fs';
import path from 'node:path';

const TURNS = 3;
const MAX_CHARS = 40000;

const sessionId = process.argv[2] || process.env.CLAUDE_CODE_SESSION_ID;
if (!sessionId) {
  console.error('セッションIDがありません');
  process.exit(1);
}

const projectsDir = path.join(process.env.HOME, '.claude', 'projects');
const transcript = fs.readdirSync(projectsDir)
  .map((dir) => path.join(projectsDir, dir, `${sessionId}.jsonl`))
  .find((file) => fs.existsSync(file));
if (!transcript) {
  console.error(`会話ログが見つかりません: ${sessionId}`);
  process.exit(1);
}

const injected = /^<(?:system-reminder|task-notification|local-command-caveat|local-command-stdout|command-name|command-message|command-args|user-prompt-submit-hook)\b/i;
const clean = (text) => (typeof text === 'string' && text.trim() && !injected.test(text.trim()) ? text.trim() : '');

const turns = [];
let cwd = '';
const push = (kind, text) => {
  const value = clean(text);
  if (value) {
    if (!turns.length) turns.push([]);
    turns.at(-1).push(`[${kind}]\n${value}`);
  }
};

for (const line of fs.readFileSync(transcript, 'utf8').split('\n')) {
  let row;
  try { row = JSON.parse(line); } catch { continue; }
  if (row.cwd) cwd = row.cwd;
  if (row.isSidechain || row.isMeta) continue;

  if (row.type === 'user') {
    const content = row.message?.content;
    const text = typeof content === 'string'
      ? clean(content)
      : (Array.isArray(content) ? content.filter((b) => b?.type === 'text').map((b) => clean(b.text)).filter(Boolean).join('\n\n') : '');
    if (text) turns.push([`[user]\n${text}`]);
    const ask = row.toolUseResult;
    if (Array.isArray(ask?.questions) && ask.answers) {
      const value = clean(ask.questions.map((q) => {
        const options = (q.options || []).map((o) => `${o.label}${o.description ? ` — ${o.description}` : ''}`).join(' / ');
        return `質問: ${q.question}\n選択肢: ${options || '自由回答'}\n回答: ${ask.answers[q.question] ?? ''}`;
      }).join('\n\n'));
      if (value) turns.push([`[ask]\n${value}`]);
    }
  } else if (row.type === 'assistant' && Array.isArray(row.message?.content)) {
    for (const block of row.message.content) {
      if (block?.type === 'text') push('assistant', block.text);
      if (block?.type === 'tool_use' && block.name === 'ExitPlanMode') push('plan', block.input?.plan);
    }
  }
}

const body = turns.slice(-TURNS).flat().join('\n\n').slice(-MAX_CHARS);
if (!body) {
  console.log('レビュー対象なし');
  process.exit(0);
}
process.stdout.write(`作業ディレクトリ: ${cwd}\n\n<conversation_excerpt>\n${body}\n</conversation_excerpt>\n`);
