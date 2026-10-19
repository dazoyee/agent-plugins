import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const BAND = {
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 115,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

// 人がプロンプトから打ったときと同じ入力
const run = (command: string) =>
  ({
    command,
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  }) as const

type Tokens = { input: number; read: number; creation: number }

const turn = (durationMs: number, extra: { agentId?: string; tokens?: Tokens | null } = {}) => {
  const { tokens = { input: 0, read: 0, creation: 0 }, agentId } = extra

  return {
    answer: 'ok',
    durationMs,
    isAborted: false,
    turnId: `t-${durationMs}`,
    reason: 'answer',
    ...(tokens === null
      ? {}
      : {
          usage: {
            model: 'm',
            input_tokens: tokens.input,
            output_tokens: 1500,
            cache_read_input_tokens: tokens.read,
            cache_creation_input_tokens: tokens.creation,
          },
        }),
    ...(agentId === undefined ? {} : { agentId }),
  } as const
}

const MINUTE = 60_000

// 帯の描画と turn.complete の応答はエンジン本体の代役が返す
const standIn = (on: On) => {
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box key="engine" />
  })
  on('turn.complete', () => ({ text: '' }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('session.start', () => ({ cwd: '/repo' }))
  on('command.register', () => ({ value: {} as never }))
}

// claude.ai サブスクリプションで利用枠内（既定で 1h TTL）のセッション
const subscription = (on: On, percentUsed = 10) => {
  on('session.identity', () => ({ value: { kind: 'claude.ai', isVerified: true } }))
  on('session.usage', () => ({ value: { rateLimits: [{ kind: 'five_hour', percentUsed }] } as never }))
}

const toasts = (on: On) => {
  const texts: string[] = []
  on('ui.toast', ($, e) => {
    texts.push(e.text)
    return { value: undefined }
  })

  return texts
}

const findBand = async ($: Engine, text: RegExp) => {
  const ui = await $.ui.mount({ plugin: 'turn-band', surface: 'terminal', ...BAND })
  const found = await ui.find({ type: 'Text', text })
  await ui.unmount()

  return found
}

const startSession = ($: Engine) =>
  $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true } as never)

test('/turn-band toggles visibility', async $ => {
  expect((await $.command.run(run('turn-band'))).text).toContain('隠しました')
  expect((await $.command.run(run('turn-band'))).text).toContain('表示しました')
})

test('the band appears after a turn, adds up totals and hides on press', async ($, on) => {
  // エンジン本体の代役: プラグインが next(e) したときの描画と turn.complete の応答
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box key="engine" />
  })
  on('turn.complete', () => ({ text: '' }))

  const before = await $.ui.mount({ plugin: 'turn-band', surface: 'terminal', ...BAND })
  expect(await before.find({ type: 'Text', text: /前回/ })).toBeUndefined()
  await before.unmount()

  await $.turn.complete(turn(12_000))
  await $.turn.complete(turn(3_000))
  await $.turn.complete(turn(99_000, { agentId: 'sub-1' }))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'turn-band', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /前回 3s/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /累計 2 ターン .* 出力 3\.0k tok/ })).toBeDefined()

    await ui.press({ key: 'hide' })
    expect(await ui.find({ type: 'Text', text: /前回/ })).toBeUndefined()

    await $.command.run(run('turn-band'))
    await ui.unmount()
  }
})

test('the band shows the cache hit rate, and — when usage is missing or the input is empty', async ($, on) => {
  standIn(on)
  mock.clock(on)

  await $.turn.complete(turn(1_000, { tokens: { input: 1_000, read: 94_000, creation: 5_000 } }))
  expect(await findBand($, /キャッシュ 94%/)).toBeDefined()

  await $.turn.complete(turn(1_000, { tokens: null }))
  expect(await findBand($, /キャッシュ —/)).toBeDefined()

  await $.turn.complete(turn(1_000))
  expect(await findBand($, /キャッシュ —/)).toBeDefined()
})

test('a sharp drop in the hit rate raises a toast, but not on the first turn', async ($, on) => {
  standIn(on)
  mock.clock(on)
  const shown = toasts(on)

  await $.turn.complete(turn(1_000, { tokens: { input: 0, read: 0, creation: 80_000 } }))
  expect(shown.filter(text => text.includes('キャッシュミス'))).toHaveLength(0)

  await $.turn.complete(turn(1_000, { tokens: { input: 1_000, read: 90_000, creation: 1_000 } }))
  await $.turn.complete(turn(1_000, { tokens: { input: 1_000, read: 0, creation: 92_000 } }))
  expect(shown).toContain('キャッシュミス: 約 92.0k トークンを再書き込みしました')
})

test('a small miss below the input floor raises no toast', async ($, on) => {
  standIn(on)
  mock.clock(on)
  const shown = toasts(on)

  await $.turn.complete(turn(1_000, { tokens: { input: 100, read: 9_000, creation: 100 } }))
  await $.turn.complete(turn(1_000, { tokens: { input: 100, read: 0, creation: 9_000 } }))
  expect(shown.filter(text => text.includes('キャッシュミス'))).toHaveLength(0)
})

test('the remaining cache time counts down on a subscription and turns into expired', async ($, on) => {
  standIn(on)
  subscription(on)
  const clock = mock.clock(on, { now: 1_000_000 })
  mock.env(on, {})
  const shown = toasts(on)
  await startSession($)

  await $.turn.start({ text: 'go', turnId: 'u-1' })
  await $.turn.complete(turn(1_000, { tokens: { input: 1_000, read: 60_000, creation: 1_000 } }))
  expect(await findBand($, /⏳~60m/)).toBeDefined()

  await clock.advance(56 * MINUTE)
  expect(await findBand($, /⏳~4m/)).toBeDefined()
  expect(shown.filter(text => text.includes('失効まで'))).toHaveLength(1)

  await clock.advance(MINUTE)
  expect(shown.filter(text => text.includes('失効まで'))).toHaveLength(1)

  await clock.advance(4 * MINUTE)
  expect(await findBand($, /キャッシュ切れ/)).toBeDefined()
})

test('the TTL falls back to five minutes off a subscription', async ($, on) => {
  standIn(on)
  const clock = mock.clock(on, { now: 1_000_000 })

  on('session.identity', () => ({ value: { kind: 'api-key', isVerified: false } }))
  mock.env(on, {})
  await startSession($)
  await $.turn.complete(turn(1_000, { tokens: { input: 1_000, read: 60_000, creation: 1_000 } }))
  expect(await findBand($, /⏳~5m/)).toBeDefined()

  await clock.advance(6 * MINUTE)
  expect(await findBand($, /キャッシュ切れ/)).toBeDefined()
})

test('a usage-credit session is treated as five minutes', async ($, on) => {
  standIn(on)
  subscription(on, 100)
  mock.clock(on, { now: 1_000_000 })
  mock.env(on, {})

  await $.turn.complete(turn(1_000, { tokens: { input: 1_000, read: 60_000, creation: 1_000 } }))
  expect(await findBand($, /⏳~5m/)).toBeDefined()
})

test('FORCE_PROMPT_CACHING_5M wins over a one-hour setting', async ($, on) => {
  standIn(on)
  subscription(on)
  mock.clock(on, { now: 1_000_000 })
  mock.env(on, { FORCE_PROMPT_CACHING_5M: '1', CLAUDE_CODE_PROMPT_CACHE_TTL: '1h' })

  await $.turn.complete(turn(1_000, { tokens: { input: 1_000, read: 60_000, creation: 1_000 } }))
  expect(await findBand($, /⏳~5m/)).toBeDefined()
})

test('CLAUDE_CODE_PROMPT_CACHE_TTL picks one hour off a subscription', async ($, on) => {
  standIn(on)
  on('session.identity', () => ({ value: { kind: 'api-key', isVerified: false } }))
  mock.clock(on, { now: 1_000_000 })
  mock.env(on, { CLAUDE_CODE_PROMPT_CACHE_TTL: '1h' })

  await $.turn.complete(turn(1_000, { tokens: { input: 1_000, read: 60_000, creation: 1_000 } }))
  expect(await findBand($, /⏳~60m/)).toBeDefined()
})

test('the promptCacheTtl setting picks the TTL when no variable does', async ($, on) => {
  standIn(on)
  on('session.identity', () => ({ value: { kind: 'api-key', isVerified: false } }))
  on('settings.read', () => ({ value: { promptCacheTtl: '1h' } }))
  mock.clock(on, { now: 1_000_000 })
  mock.env(on, {})

  await $.turn.complete(turn(1_000, { tokens: { input: 1_000, read: 60_000, creation: 1_000 } }))
  expect(await findBand($, /⏳~60m/)).toBeDefined()
})
