import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { ToolCall, ToolCallStatus } from '../types'

const PANE = 'tool-calls'
const KEEP = 200
const RESULT_LINES = 6
const RESULT_LINE_CHARS = 300

const calls = atom({ plugin: 'tool-calls', key: 'calls' } as const, [])
const expanded = atom({ plugin: 'tool-calls', key: 'expanded' } as const, null)

const ICON: Record<ToolCallStatus, string> = { run: '…', ok: '✓', err: '✗', deny: '⊘' }
const COLOR: Record<ToolCallStatus, string> = { run: 'yellow', ok: 'green', err: 'red', deny: 'magenta' }

// ツールごとに最もわかりやすい引数を見出しにする
const labelOf = (input: Record<string, unknown>) =>
  String(
    input.command ?? input.file_path ?? input.notebook_path ?? input.pattern ?? input.url ?? input.description ?? '',
  )

const headOf = (text: string | undefined) =>
  (text ?? '')
    .split('\n')
    .filter(line => line.trim() !== '')
    .slice(0, RESULT_LINES)
    .map(line => line.slice(0, RESULT_LINE_CHARS))

const fit = (text: string, width: number) => {
  const line = text.split('\n')[0] ?? ''

  return line.length > width ? `${line.slice(0, Math.max(1, width - 1))}…` : line
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tool-calls',
      description: 'このセッションのツール呼び出しペインを開閉する',
    })

    return next(e)
  })

  on('command.run', { command: 'tool-calls' }, async $ => {
    if ((await $.ui.panes()).some(pane => pane.id === PANE)) {
      await $.ui.close({ id: PANE })

      return { text: 'tool-calls ペインを閉じました' }
    }

    const opened = await $.ui.open({ id: PANE, title: 'Tool calls' })

    return { text: opened.isPlaced ? 'tool-calls ペインを開きました' : 'ターミナルを広げると表示されます' }
  })

  on('tool.call', async ($, e, next) => {
    const call: ToolCall = {
      id: e.tool_use_id ?? crypto.randomUUID(),
      tool: String(e.tool),
      label: labelOf(e as unknown as Record<string, unknown>),
      result: [],
      status: 'run',
      startedAt: await $.clock.now(),
      ms: null,
    }
    await update($, calls, list => [...list, call].slice(-KEEP))

    const ran = await next(e)

    const status: ToolCallStatus = ran.deny !== undefined ? 'deny' : ran.isError ? 'err' : 'ok'
    const ms = (await $.clock.now()) - call.startedAt
    const result = headOf(ran.deny ?? ran.text)
    await update($, calls, list => list.map(one => (one.id === call.id ? { ...one, status, ms, result } : one)))

    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const list = await read($, calls)
    const openId = await read($, expanded)
    const open = list.find(call => call.id === openId)
    const width = Math.max(20, e.props.bodyColumns)
    const extra = open === undefined ? 0 : open.result.length + 1
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 4 - extra)
    const count = (status: ToolCallStatus) => list.filter(call => call.status === status).length

    return (
      <Box flexDirection="column">
        <Box>
          <Text bold>
            {list.length} calls · <Text color="green">✓{count('ok')}</Text> <Text color="red">✗{count('err')}</Text>{' '}
            <Text color="magenta">⊘{count('deny')}</Text>{' '}
          </Text>
          <Button key="clear" label="Clear" onPress={() => update($, calls, () => [])} />
        </Box>
        {list.length === 0 && <Text dimColor>No tool calls yet.</Text>}
        {list.slice(-room).map(call => {
          const meta = call.ms === null ? '' : `${(call.ms / 1000).toFixed(1)}s `
          const head = `${ICON[call.status]} ${call.tool} ${meta}`

          return (
            <Box key={`call:${call.id}`} flexDirection="column">
              <Button
                key={`row:${call.id}`}
                plain
                onPress={() => update($, expanded, id => (id === call.id ? null : call.id))}
              >
                <Text color={COLOR[call.status]}>{ICON[call.status]}</Text> {call.tool}{' '}
                <Text dimColor>
                  {meta}
                  {fit(call.label, width - head.length)}
                </Text>
              </Button>
              {openId === call.id && (
                <Box flexDirection="column" paddingLeft={2}>
                  <Text>{call.label}</Text>
                  {call.result.map(line => (
                    <Text dimColor>{line}</Text>
                  ))}
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
    )
  })
}
