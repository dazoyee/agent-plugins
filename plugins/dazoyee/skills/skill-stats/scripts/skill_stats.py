#!/usr/bin/env python3
"""Claude Code スキル使用統計の集計スクリプト。

~/.claude/projects/ 配下の全 JSONL セッションログを解析し、
Skill tool_use とスラッシュコマンドの2パターンからスキル使用回数を集計する。
"""

import argparse
import glob
import json
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

# --- 定数 ---

HOME = os.path.expanduser("~")
SKILLS_DIR = os.path.join(HOME, ".claude", "skills")
PLUGINS_DIR = os.path.join(HOME, ".claude", "plugins", "cache")
PROJECTS_DIR = os.path.join(HOME, ".claude", "projects")

# スキルではないビルトインコマンド
META_COMMANDS = frozenset({
    "clear", "compact", "config", "cost", "doctor", "exit", "fast",
    "help", "init", "login", "logout", "memory", "model", "permissions",
    "plugin", "pr-review", "reload-plugins", "review", "skill-name",
    "status", "terminal-setup", "vim",
})


@dataclass
class SkillRecord:
    """スキルごとの使用記録。"""
    count: int = 0
    last_used: str = ""
    sources: dict = field(default_factory=lambda: {"tool_use": 0, "slash": 0})


def discover_known_skills(skills_dir=SKILLS_DIR):
    """既知のスキル名を ~/.claude/skills/ と plugins/cache/ から収集する。"""
    known = set()

    # ~/.claude/skills/ 配下のディレクトリ名
    if os.path.isdir(skills_dir):
        for entry in os.listdir(skills_dir):
            if os.path.isdir(os.path.join(skills_dir, entry)):
                known.add(entry)

    # plugins/cache/ 配下の SKILL.md の親ディレクトリ名
    if os.path.isdir(PLUGINS_DIR):
        for skill_md in glob.glob(
            os.path.join(PLUGINS_DIR, "**", "SKILL.md"), recursive=True
        ):
            parent = os.path.basename(os.path.dirname(skill_md))
            known.add(parent)

    return known


def parse_period(period_str):
    """期間指定文字列を (start_date, end_date) に変換する。

    対応形式:
      None / ""       → (None, None) 全期間
      "7d"            → 直近7日
      "30d"           → 直近30日
      "2026-03"       → 2026年3月
      "2026-04-01"    → 2026-04-01 以降
    """
    if not period_str:
        return None, None, "all time"

    # Nd パターン（直近N日）
    m = re.match(r"^(\d+)d$", period_str)
    if m:
        days = int(m.group(1))
        start = datetime.now(timezone.utc) - timedelta(days=days)
        return start.isoformat()[:10], None, f"last {days} days"

    # YYYY-MM パターン（月指定）
    m = re.match(r"^(\d{4})-(\d{2})$", period_str)
    if m:
        year, month = int(m.group(1)), int(m.group(2))
        start = f"{year:04d}-{month:02d}-01"
        if month == 12:
            end = f"{year + 1:04d}-01-01"
        else:
            end = f"{year:04d}-{month + 1:02d}-01"
        return start, end, f"{year:04d}-{month:02d}"

    # YYYY-MM-DD パターン（日付以降）
    m = re.match(r"^(\d{4}-\d{2}-\d{2})$", period_str)
    if m:
        return m.group(1), None, f"since {m.group(1)}"

    print(f"Warning: unrecognized period format '{period_str}', using all time",
          file=sys.stderr)
    return None, None, "all time"


def normalize_skill_name(raw):
    """スキル名を正規化する。先頭の / を除去し、namespace を分割する。"""
    name = raw.strip().lstrip("/")
    if ":" in name:
        name = name.split(":")[-1]
    return name.lower()


def in_period(ts_str, start, end):
    """タイムスタンプ文字列が期間内かどうかを判定する。"""
    if not ts_str:
        return start is None  # 期間フィルタなしなら計上
    date_part = ts_str[:10]
    if start and date_part < start:
        return False
    if end and date_part >= end:
        return False
    return True


def scan_jsonl_files(projects_dir, start, end):
    """全 JSONL ファイルを走査し、スキル使用記録を返す。"""
    records = {}
    file_count = 0
    subagent_count = 0

    pattern = os.path.join(projects_dir, "**", "*.jsonl")
    for fpath in glob.glob(pattern, recursive=True):
        file_count += 1
        if "/subagents/" in fpath or "\\subagents\\" in fpath:
            subagent_count += 1

        try:
            with open(fpath, encoding="utf-8", errors="replace") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    ts = obj.get("timestamp", "")
                    if not in_period(ts, start, end):
                        continue
                    date_part = ts[:10] if ts else ""

                    msg_type = obj.get("type", "")

                    # パターン1: Skill tool_use
                    if msg_type == "assistant":
                        content = obj.get("message", {}).get("content", [])
                        if isinstance(content, list):
                            for item in content:
                                if (isinstance(item, dict)
                                        and item.get("type") == "tool_use"
                                        and item.get("name") == "Skill"):
                                    raw = (item.get("input", {})
                                           .get("skill", ""))
                                    if raw:
                                        name = normalize_skill_name(raw)
                                        _record(records, name, date_part,
                                                "tool_use")

                    # パターン2: スラッシュコマンド
                    elif msg_type == "user":
                        content = (obj.get("message", {}).get("content", "")
                                   or obj.get("content", ""))
                        if isinstance(content, list):
                            text = " ".join(
                                c.get("text", "")
                                for c in content
                                if isinstance(c, dict)
                            )
                        else:
                            text = str(content)

                        for m in re.finditer(
                            r"<command-name>/([^<]+)</command-name>", text
                        ):
                            name = normalize_skill_name(m.group(1))
                            if name not in META_COMMANDS:
                                _record(records, name, date_part, "slash")

        except (OSError, IOError):
            continue

    return records, file_count, subagent_count


def _record(records, name, date_part, source):
    """スキル使用記録を追加する。"""
    if name not in records:
        records[name] = SkillRecord()
    records[name].count += 1
    records[name].sources[source] += 1
    if date_part and date_part > records[name].last_used:
        records[name].last_used = date_part


def format_report(records, known_skills, file_count, subagent_count,
                  period_label):
    """使用統計レポートを整形出力する。"""
    sep = "=" * 60
    print(sep)
    print(f"  Skill Usage Statistics")
    print(f"  Period: {period_label}  |  "
          f"Scanned: {file_count} files ({subagent_count} subagent)")
    print(sep)
    print()

    # ランキング（使用回数降順、同数なら名前昇順）
    ranked = sorted(records.items(), key=lambda x: (-x[1].count, x[0]))

    if ranked:
        # カラムヘッダー
        print(f"{'Rank':>4}  {'Skill':<25} {'Count':>5}  "
              f"{'Last Used':<10}  {'Tool':>4}  {'Slash':>5}")
        print(f"{'----':>4}  {'-' * 25:<25} {'-----':>5}  "
              f"{'-' * 10:<10}  {'----':>4}  {'-----':>5}")

        for i, (name, rec) in enumerate(ranked, 1):
            marker = " (*)" if name not in known_skills else ""
            display_name = f"{name}{marker}"
            print(f"{i:>4}  {display_name:<25} {rec.count:>5}  "
                  f"{rec.last_used or 'N/A':<10}  "
                  f"{rec.sources['tool_use']:>4}  "
                  f"{rec.sources['slash']:>5}")
    else:
        print("  No skill usage found in this period.")

    print()

    # 未使用スキル
    used_names = set(records.keys())
    unused = sorted(known_skills - used_names)
    if unused:
        print(f"--- Unused Skills ({len(unused)} / {len(known_skills)}) ---")
        # 1行80文字程度で折り返し
        line = ""
        for name in unused:
            if line and len(line) + len(name) + 2 > 76:
                print(f"  {line}")
                line = name
            else:
                line = f"{line}, {name}" if line else name
        if line:
            print(f"  {line}")
    print()

    # サマリー
    total = sum(r.count for r in records.values())
    active = len(used_names & known_skills)
    unknown = len(used_names - known_skills)
    print(sep)
    print(f"  Total: {total} invocations  |  "
          f"Active: {active}  |  Unused: {len(unused)}  |  "
          f"Unknown: {unknown}")
    if unknown > 0:
        unknown_names = sorted(used_names - known_skills)
        print(f"  (*) Unknown: {', '.join(unknown_names)}")
    print(sep)


def main():
    parser = argparse.ArgumentParser(
        description="Claude Code スキル使用統計")
    parser.add_argument(
        "--period", default="",
        help="集計期間 (7d, 30d, 2026-03, 2026-04-01)")
    parser.add_argument(
        "--skills-dir", default=SKILLS_DIR,
        help="スキルディレクトリのパス")
    parser.add_argument(
        "--projects-dir", default=PROJECTS_DIR,
        help="プロジェクトディレクトリのパス")
    args = parser.parse_args()

    skills_dir = args.skills_dir
    projects_dir = args.projects_dir

    known = discover_known_skills(skills_dir)
    start, end, period_label = parse_period(args.period)
    records, file_count, subagent_count = scan_jsonl_files(
        projects_dir, start, end)
    format_report(records, known, file_count, subagent_count, period_label)


if __name__ == "__main__":
    main()
