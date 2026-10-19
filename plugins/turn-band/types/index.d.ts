export type Turn = {
  seconds: number
  tools: number
  outputTokens: number
  // 入力合計のうちキャッシュから読んだ割合。usage が無いか入力が 0 のときは null
  hit: number | null
  inputTokens: number
}

export type TurnTotals = { turns: number; tools: number; outputTokens: number }

export type CacheTtl = '5m' | '1h'

export type CacheClock = {
  // メインスレッドが最後にリクエストを送った、または応答を受けた時刻
  lastActivityAt: number | null
  ttl: CacheTtl
  // 失効直前のトーストを出した待機の lastActivityAt
  warnedAt: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'turn-band': { last: Turn | null; totals: TurnTotals; isHidden: boolean; cache: CacheClock; now: number }
  }
}
