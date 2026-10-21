#!/usr/bin/env node
// AskUserQuestion の回答または ExitPlanMode の完了後に devil-advocate の起動判断を促す。

import process from "node:process";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });
}

function main(raw) {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const toolName = payload.tool_name;
  if (toolName !== "AskUserQuestion" && toolName !== "ExitPlanMode") {
    process.exit(0);
  }

  if (toolName === "AskUserQuestion") {
    const answers = payload.tool_response?.answers;
    if (answers === null || typeof answers !== "object" || Array.isArray(answers) || Object.keys(answers).length === 0) {
      process.exit(0);
    }
  }

  const output = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: "ユーザーの決定が確定した。自明な決定（単純な実行指示・既存ルールの当てはめ・命名などの瑣末な選択）でなく、ユーザーが「レビュー不要」と言っていなければ、dazoyee:devil-advocate スキルを起動せよ。認識合わせの質問がまだ残っているなら、全問解決後に 1 回だけ起動せよ。devil-advocate サブエージェントが実行中なら新たに起動しない。",
    },
  };
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

const raw = await readStdin();
main(raw);
