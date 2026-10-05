---
name: skill-stats
description: "JSONL セッションログを解析してスキル使用統計（頻度ランキング・未使用一覧）を表示する。読み取り専用。トリガー:「スキルの使用状況を見せて」「使われていないスキルは？」「スキル棚卸し」「スキル統計」。期間指定可。"
---

# skill-stats

~/.claude/projects/ 配下の全 JSONL セッションログを解析し、スキル使用頻度をランキング表示する。

## 安全性

読み取り専用スキル。セッションログの参照のみ行い、ファイルの変更は一切行わない。

## 使い方

引数なしで全期間、期間指定で絞り込みが可能。

| 指定例 | 意味 |
|--------|------|
| (なし) | 全期間 |
| `7d` | 直近7日 |
| `30d` | 直近30日 |
| `2026-03` | 2026年3月 |
| `2026-04-01` | 指定日以降 |

## 実行手順

1. 引数 `$ARGUMENTS` を期間パラメータとして使う
2. スクリプトを実行する:

引数がある場合:
```bash
PYTHONIOENCODING=utf-8 python3 ${CLAUDE_SKILL_DIR}/scripts/skill_stats.py --period "$ARGUMENTS"
```

引数がない場合:
```bash
PYTHONIOENCODING=utf-8 python3 ${CLAUDE_SKILL_DIR}/scripts/skill_stats.py
```

3. 出力結果を確認し、使用傾向についてコメントする（上位スキル、未使用が多い場合の整理提案など）
