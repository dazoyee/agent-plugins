import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, TurnUsage } from 'claude-code'

import type { CacheClock, CacheTtl, Turn, TurnTotals } from '../types'

const SLOW_TURN_SECONDS = 120

// ヒット率がこの値以上から MISS_HIT 未満へ落ちたらトーストで知らせる
const STEADY_HIT = 0.8
const MISS_HIT = 0.5
const MISS_MIN_INPUT_TOKENS = 20_000

// 1h TTL で残りがこの時間を切ったら、文脈が大きいときだけトーストで知らせる
const EXPIRY_WARN_MS = 5 * 60_000
const EXPIRY_WARN_MIN_INPUT_TOKENS = 50_000

const TICK_MS = 60_000
const TTL_MS: Record<CacheTtl, number> = { '5m': 5 * 60_000, '1h': 60 * 60_000 }

const last = atom({ plugin: 'turn-band', key: 'last' } as const, null)
const totals = atom({ plugin: 'turn-band', key: 'totals' } as const, { turns: 0, tools: 0, outputTokens: 0 })
const isHidden = atom({ plugin: 'turn-band', key: 'isHidden' } as const, false)
const cache = atom({ plugin: 'turn-band', key: 'cache' } as const, { lastActivityAt: null, ttl: '5m', warnedAt: null })
const now = atom({ plugin: 'turn-band', key: 'now' } as const, 0)

const formatTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)

const isEnabled = (value: string | undefined) => value !== undefined && /^(1|true)$/i.test(value)

const asTtl = (value: unknown): CacheTtl | undefined => (value === '5m' || value === '1h' ? value : undefined)

const inputTotalOf = (usage: TurnUsage | undefined) =>
  usage === undefined ? 0 : usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens

const hitOf = (usage: TurnUsage | undefined) => {
  const total = inputTotalOf(usage)

  return usage === undefined || total === 0 ? null : usage.cache_read_input_tokens / total
}

const remainingMs = (clock: CacheClock, at: number) =>
  clock.lastActivityAt === null ? null : clock.lastActivityAt + TTL_MS[clock.ttl] - at

// 失効までの残りは推定値なので ~ を付ける
const formatRemaining = (ms: number) => (ms < 60_000 ? '⏳<1m' : `⏳~${Math.floor(ms / 60_000)}m`)

const cacheText = (turn: Turn, clock: CacheClock, at: number) => {
  const hit = turn.hit === null ? 'キャッシュ —' : `キャッシュ ${Math.round(turn.hit * 100)}%`
  const ms = remainingMs(clock, at)

  if (ms === null) {
    return ` · ${hit}`
  }

  return ms <= 0 ? ` · ${hit} · キャッシュ切れ` : ` · ${hit} · ${formatRemaining(ms)}`
}

const settle = async <T,>(pending: Promise<T>) => {
  try {
    return await pending
  } catch {
    return undefined
  }
}

// Claude Code の TTL の決め方（公式ドキュメントの優先順位）を再現する。取れない値は次の順位へ進む
async function resolveTtl($: EngineInterface): Promise<CacheTtl> {
  if (isEnabled(await settle($.env.get('FORCE_PROMPT_CACHING_5M')))) {
    return '5m'
  }

  const fromEnv = asTtl(await settle($.env.get('CLAUDE_CODE_PROMPT_CACHE_TTL')))
  if (fromEnv !== undefined) {
    return fromEnv
  }

  const fromSettings = asTtl((await settle($.settings.read()))?.promptCacheTtl)
  if (fromSettings !== undefined) {
    return fromSettings
  }

  if (isEnabled(await settle($.env.get('ENABLE_PROMPT_CACHING_1H')))) {
    return '1h'
  }

  // 1h はサブスクリプションの利用枠内だけ。枠を使い切った（利用クレジットに入った）とみなせるときは 5m
  if ((await settle($.session.identity()))?.kind !== 'claude.ai') {
    return '5m'
  }

  const limits = (await settle($.session.usage()))?.rateLimits ?? []

  return limits.some(limit => limit.percentUsed >= 100) ? '5m' : '1h'
}

export const register: Register = on => {
  let tools = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'turn-band',
      description: 'プロンプト上のターン情報の表示を切り替える',
    })

    const ttl = await resolveTtl($)
    await update($, cache, clock => ({ ...clock, ttl }))
    const startedAt = await $.clock.now()
    await update($, now, () => startedAt)

    $.clock.every(TICK_MS, () => {
      void (async () => {
        const clock = await read($, cache)
        if (clock.lastActivityAt === null || (await read($, isHidden))) {
          return
        }

        const at = await $.clock.now()
        await update($, now, () => at)

        const ms = remainingMs(clock, at)
        const turn = await read($, last)
        if (
          clock.ttl === '1h' &&
          ms !== null &&
          ms > 0 &&
          ms <= EXPIRY_WARN_MS &&
          clock.warnedAt !== clock.lastActivityAt &&
          (turn?.inputTokens ?? 0) >= EXPIRY_WARN_MIN_INPUT_TOKENS
        ) {
          await update($, cache, value => ({ ...value, warnedAt: clock.lastActivityAt }))
          $.ui.toast(`キャッシュの失効まで約 ${Math.ceil(ms / 60_000)} 分です`)
        }
      })()
    })

    return next(e)
  })

  on('command.run', { command: 'turn-band' }, async $ => {
    const hidden = await update($, isHidden, value => !value)

    return { text: hidden ? 'turn-band を隠しました' : 'turn-band を表示しました' }
  })

  on('prompt.submit', ($, e, next) => {
    tools = 0

    return next(e)
  })

  on('tool.call', ($, e, next) => {
    tools += 1

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      const at = await $.clock.now()
      await update($, cache, clock => ({ ...clock, lastActivityAt: at }))
      await update($, now, () => at)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    // サブエージェントのターンは数えない
    if (e.agentId === undefined) {
      const previous = await read($, last)
      const turn: Turn = {
        seconds: Math.round(e.durationMs / 1000),
        tools,
        outputTokens: e.usage?.output_tokens ?? 0,
        hit: hitOf(e.usage),
        inputTokens: inputTotalOf(e.usage),
      }
      await update($, last, () => turn)
      await update(
        $,
        totals,
        (sum): TurnTotals => ({
          turns: sum.turns + 1,
          tools: sum.tools + turn.tools,
          outputTokens: sum.outputTokens + turn.outputTokens,
        }),
      )

      if (turn.seconds > SLOW_TURN_SECONDS) {
        $.ui.toast(`このターンは ${turn.seconds}s かかりました`)
      }

      if (
        previous?.hit != null &&
        previous.hit >= STEADY_HIT &&
        turn.hit !== null &&
        turn.hit < MISS_HIT &&
        turn.inputTokens >= MISS_MIN_INPUT_TOKENS
      ) {
        const written = e.usage?.cache_creation_input_tokens ?? 0
        $.ui.toast(`キャッシュミス: 約 ${formatTokens(written)} トークンを再書き込みしました`)
      }

      // 利用枠の状況で TTL が変わるので、ターンごとに判定し直す
      const ttl = await resolveTtl($)
      const at = await $.clock.now()
      await update($, cache, clock => ({ ...clock, ttl, lastActivityAt: at }))
      await update($, now, () => at)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const turn = await read($, last)

    if (e.props.hasSurvey || turn === null || (await read($, isHidden))) {
      return next(e)
    }

    const sum = await read($, totals)
    const clock = await read($, cache)
    const at = await read($, now)
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text dimColor>
          前回 {turn.seconds}s · ツール {turn.tools} 回 · 出力 {formatTokens(turn.outputTokens)} tok
          {cacheText(turn, clock, at)} ｜ 累計 {sum.turns} ターン · ツール {sum.tools} 回 · 出力{' '}
          {formatTokens(sum.outputTokens)} tok{' '}
        </Text>
        <Button key="hide" label="Hide" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
