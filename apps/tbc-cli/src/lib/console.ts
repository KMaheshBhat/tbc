// Minimal local copies to avoid @hami-frameworx and @tbc-frameworx/tbc-system imports

export type TBCLevel = 'debug' | 'info' | 'warn' | 'error';

export type TBCMessageKind = 'structured' | 'raw';

export const TBC_LEVEL_ICON_MAP = {
  debug: '»',
  info: 'i',
  warn: '!',
  error: '✗',
} as const;

export interface TBCMessage {
  level: TBCLevel;
  kind?: TBCMessageKind;
  source: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface MintedOutput {
  keys: Record<string, string>;
  batch: string[];
}

export function formatMintedIds(minted: MintedOutput, source = ''): TBCMessage[] {
  const messages: TBCMessage[] = [];

  messages.push({
    level: 'info',
    kind: 'raw',
    source: '',
    code: '',
    message: ' ┌┤ Minted IDs ├──────────────────────────────────────────────',
  });

  if (minted.keys && Object.keys(minted.keys).length > 0) {
    messages.push({
      level: 'info',
      kind: 'raw',
      source: '',
      code: '',
      message: ' ├┤ Keyed ├───────────────────────────────────────────────────',
    });
    for (const [k, v] of Object.entries(minted.keys)) {
      messages.push({
        level: 'info',
        kind: 'structured',
        source,
        code: 'KEY-MINTED-IDS',
        message: `${k}: ${v}`,
      });
    }
  }

  if (minted.batch && minted.batch.length > 0) {
    messages.push({
      level: 'info',
      kind: 'raw',
      source: '',
      code: '',
      message: ' ├┤ Batch ├───────────────────────────────────────────────────',
    });
    for (const id of minted.batch) {
      messages.push({
        level: 'info',
        kind: 'structured',
        source,
        code: 'MINTED-BATCH',
        message: `${id}`,
      });
    }
  }

  messages.push({
    level: 'info',
    kind: 'raw',
    source: '',
    code: '',
    message: ' └┼───────────────────────────────────────────────────────────',
  });

  return messages;
}

export function formatMessages(messages: TBCMessage[], verbose = false): string {
  const lines: string[] = [];
  for (const m of messages) {
    lines.push(...composeMessage(m, verbose));
  }
  return lines.join('\n');
}

function composeMessage(m: TBCMessage, verbose: boolean): string[] {
  const lines: string[] = [];
  if (!verbose && m.level === 'debug') {
    return lines;
  }
  if (m.kind === 'raw') {
    lines.push(m.message);
    return lines;
  }
  const icon = TBC_LEVEL_ICON_MAP[m.level];
  const connector = m.suggestion ? '┬─' : '──';
  const level = m.level ?? 'info';
  const sourcePart = m.source ? ` | ${m.source}` : '';
  lines.push(`[${icon}] ${connector} ${level.padEnd(5)}${sourcePart} | ${m.message}`);
  if (m.suggestion) {
    lines.push(`    └─ Suggestion: ${m.suggestion}`);
  }
  return lines;
}
