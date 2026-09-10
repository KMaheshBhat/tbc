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
    const cMessages = composeMessage(m, verbose);
      for (const cm of cMessages) {
          cm && cm !== "" && lines.push(cm);
    }
  }
  return lines.join('\n');
}

function composeMessage(m: TBCMessage, verbose: boolean): string[] {
  const lines: string[] = [];
  if (!verbose && m.level === 'debug') {
    return lines;
  }
  // Check for raw message: prefer 'kind' field
  if (m.kind === 'raw') {
    lines.push(m.message);
    return lines;
  }
  const icon = TBC_LEVEL_ICON_MAP[m.level];
  const connector = ('suggestion' in m && m.suggestion) ? '┬─' : '──';
  const level = m.level ?? 'info';
  lines.push(`[${icon}] ${connector} ${level.padEnd(5)} | ${m.source} | ${m.message}`);
  if ('suggestion' in m && m.suggestion) {
    lines.push(`    └─ Suggestion: ${m.suggestion}`);
  }
  return lines;
}

export interface ProtocolDiscoveryOutput {
  sysCollection: string;
  skillsCollection: string;
  memCollection: string;
  dexCollection: string;
  actCollection: string;
  hasSqlite: boolean;
}

export function formatProtocolDiscovery(
  output: ProtocolDiscoveryOutput,
  source = ''
): TBCMessage[] {
  const messages: TBCMessage[] = [];
  messages.push({
    level: 'info',
    kind: 'raw',
    source: '',
    code: '',
    message: ' ┌┤ Protocol Discovery (Dynamic) ├──────────────────────────────',
  });
  messages.push({
    level: 'info',
    kind: 'structured',
    source,
    code: 'PROTOCOL',
    message: `Resolved protocol collections from ${output.sysCollection}/root.md`,
  });
  messages.push({
    level: 'info',
    kind: 'structured',
    source,
    code: 'PROTOCOL',
    message: `Sniffed records.db. Hybrid SQLite [storer,querier] active for ${output.memCollection}.`,
  });
  messages.push({
    level: 'info',
    kind: 'raw',
    source: '',
    code: '',
    message: ' └───────────────────────────────────────────────────────────',
  });
  return messages;
}

export interface ManifestEntry {
  collection: string;
  count: number;
  records: string[];
}

export function formatStagedManifest(
  entries: ManifestEntry[],
  source = ''
): TBCMessage[] {
  const messages: TBCMessage[] = [];
  messages.push({
    level: 'info',
    kind: 'raw',
    source: '',
    code: '',
    message: ' ┌┤ Staged Records Manifest ├──────────────────────────────────',
  });
  for (const entry of entries) {
    const preview = entry.records.slice(0, 3).join(', ') + (entry.records.length > 3 ? '...' : '');
    messages.push({
      level: 'info',
      kind: 'raw',
      source,
      code: 'MANIFEST',
      message: ` │ [${entry.collection.padEnd(12)}] | ${entry.count} record(s) | ${preview}`,
    });
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

export function formatIdentitySummary(
  companionName: string,
  companionID: string,
  primeName: string,
  primeID: string,
  memoryMapID: string,
  version: string,
  profile: string,
  source = ''
): TBCMessage[] {
  const messages: TBCMessage[] = [];
  messages.push({
    level: 'info',
    kind: 'raw',
    source: '',
    code: '',
    message: ' ┌┼───────────────────────────────────────────────────────────',
  });
  messages.push({
    level: 'info',
    kind: 'structured',
    source,
    code: 'IDENTITY',
    message: `Companion: ${companionName} [${companionID}]`,
  });
  messages.push({
    level: 'info',
    kind: 'structured',
    source,
    code: 'IDENTITY',
    message: `Prime: ${primeName} [${primeID}]`,
  });
  messages.push({
    level: 'info',
    kind: 'structured',
    source,
    code: 'IDENTITY',
    message: `Map of Memories [${memoryMapID}] initialized.`,
  });
  messages.push({
    level: 'info',
    kind: 'raw',
    source: '',
    code: '',
    message: `[✓] Third Brain Companion ${version} initialized. (PROFILE: ${profile})`,
  });
  messages.push({
    level: 'info',
    kind: 'raw',
    source: '',
    code: '',
    message: ' └┼───────────────────────────────────────────────────────────',
  });
  return messages;
}

export function formatUpgradeComplete(
  version: string,
  companionName: string,
  companionID: string,
  primeName: string,
  primeID: string,
  memoryMapID: string,
  source = ''
): TBCMessage[] {
  const messages: TBCMessage[] = [];
  messages.push({
    level: 'info',
    kind: 'raw',
    source: '',
    code: '',
    message: ' ┌┼───────────────────────────────────────────────────────────',
  });
  messages.push({
    level: 'info',
    kind: 'structured',
    source,
    code: 'IDENTITY',
    message: `Companion: ${companionName} [${companionID}]`,
  });
  messages.push({
    level: 'info',
    kind: 'structured',
    source,
    code: 'IDENTITY',
    message: `Prime: ${primeName} [${primeID}]`,
  });
  messages.push({
    level: 'info',
    kind: 'structured',
    source,
    code: 'IDENTITY',
    message: `Map of Memories: [${memoryMapID}]`,
  });
  messages.push({
    level: 'info',
    kind: 'raw',
    source: '',
    code: '',
    message: `[✓] Third Brain Companion upgraded to ${version}.`,
  });
  messages.push({
    level: 'info',
    kind: 'raw',
    source: '',
    code: '',
    message: ' └┼───────────────────────────────────────────────────────────',
  });
  return messages;
}

export function formatNextSteps(suggestion: string, source = ''): TBCMessage[] {
  return [
    {
      level: 'info',
      kind: 'raw',
      source: '',
      code: '',
      message: ' ┌┤ Next Steps ' + source + ' ├──────────────────────────────',
    },
    {
      level: 'info',
      kind: 'structured',
      source,
      code: 'NEXT-STEPS',
      message: suggestion,
      suggestion: suggestion,
    },
  ];
}

export function formatLoadSpecsDebug(source = ''): TBCMessage[] {
  return [
    {
      level: 'debug',
      kind: 'structured',
      source: 'load-specifications-flow',
      code: 'DEBUG',
      message: 'Query ({"type":"list-all-ids"}) and load from sys using tbc-record-fs:query-records and tbc-record-fs:fetch-records',
    },
    {
      level: 'debug',
      kind: 'structured',
      source: 'load-specifications-flow',
      code: 'DEBUG',
      message: 'Query ({"type":"list-all-ids"}) and load from sys/core using tbc-record-fs:query-records and tbc-record-fs:fetch-records',
    },
    {
      level: 'debug',
      kind: 'structured',
      source: 'load-specifications-flow',
      code: 'DEBUG',
      message: 'Query ({"type":"list-all-ids"}) and load from sys/ext using tbc-record-fs:query-records and tbc-record-fs:fetch-records',
    },
    {
      level: 'debug',
      kind: 'structured',
      source: 'load-specifications-flow',
      code: 'DEBUG',
      message: 'Query ({"type":"list-all-ids","recursive":true}) and load from skills using tbc-record-fs:query-records and tbc-record-fs:fetch-records',
    },
  ];
}

export function formatLoadCoreMemoriesDebug(source = ''): TBCMessage[] {
  return [
    {
      level: 'debug',
      kind: 'structured',
      source: 'load-core-memories',
      code: 'DEBUG',
      message: 'Identifying companionID',
    },
    {
      level: 'debug',
      kind: 'structured',
      source: 'load-core-memories',
      code: 'DEBUG',
      message: 'Identifying primeID',
    },
    {
      level: 'debug',
      kind: 'structured',
      source: 'load-core-memories',
      code: 'DEBUG',
      message: 'Identifying memoryMapID',
    },
  ];
}
