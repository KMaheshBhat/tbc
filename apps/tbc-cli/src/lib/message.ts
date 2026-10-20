import type { DexArtifact } from './dex.js';
import type { TBCProtocol } from './protocol.js';
import type { TBCValidationResult } from './validator.js';

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

/**
 * Render the validation audit of a root validation.
 *
 * The block is shared by the dex and the mem services so that the two
 * commands report a root validation identically (D9).
 */
export function formatValidationAudit(
  result: TBCValidationResult,
  source: string,
): TBCMessage[] {
  return [
    { level: 'info', kind: 'raw', source: '', code: '', message: ' ┌┤ Validation Audit ├────────────────────────────────────────' },
    ...result.messages,
    { level: 'info', kind: 'raw', source: '', code: '', message: ' └┼───────────────────────────────────────────────────────────' },
    { level: 'info', kind: 'raw', source, code: '', message: result.success
      ? '[✓] STABLE   | 0 error(s) detected.'
      : `[✗] DEGRADED   | ${result.messages.filter((message) => message.level === 'error').length} error(s) detected.` },
  ];
}

/**
 * Render the report of an inDEX rebuild.
 *
 * The block is shared by the dex and the mem services so that the assimilate
 * flow can report the rebuild in its own voice without duplicating it (D15).
 */
export function formatDexRebuildReport(
  artifacts: DexArtifact[],
  protocol: TBCProtocol,
  source: string,
  version: string,
): TBCMessage[] {
  const messages: TBCMessage[] = [
    { level: 'info', kind: 'raw', source: '', code: '', message: ' ┌┼───────────────────────────────────────────────────────────' },
    { level: 'info', kind: 'raw', source: '', code: '', message: `[✓] System Index (Dex) Rebuilt: ${version}` },
    { level: 'info', kind: 'raw', source: '', code: '', message: ' └┼───────────────────────────────────────────────────────────' },
    { level: 'info', source, code: 'DEX-REBUILT',
      message: `Digest: ${protocol.dexCollection}/sys.digest.txt`,
      suggestion: 'This file now contains the full context of your [sys], [sys/core], and [sys/ext] specifications.' },
    { level: 'info', source, code: 'DEX-REBUILT',
      message: `Digest: ${protocol.dexCollection}/skills.jsonl`,
      suggestion: 'This file is index of all skill you can use for your goals.' },
    { level: 'info', source, code: 'DEX-REBUILT',
      message: `Digest: ${protocol.dexCollection}/${protocol.memCollection}.*.jsonl`,
      suggestion: 'These files is index of all your memory records partitioined by record_type.' },
  ];

  for (const artifact of artifacts) {
    if (artifact.fileName === 'sys.digest.txt' || artifact.fileName === 'skills.jsonl') continue;
    messages.push({
      level: 'debug',
      source,
      code: 'DEX-ARTIFACT',
      message: `Artifact: ${protocol.dexCollection}/${artifact.fileName}`,
    });
  }

  return messages;
}

export function formatLoadSpecsDebug(source = ''): TBCMessage[] {
  const logSource = source || 'sys:validate';
  return [
    {
      level: 'debug',
      kind: 'structured',
      source: logSource,
      code: 'DEBUG',
      message: 'Query ({"type":"list-all-ids"}) and load from sys using tbc-record-fs:query-records and tbc-record-fs:fetch-records',
    },
    {
      level: 'debug',
      kind: 'structured',
      source: logSource,
      code: 'DEBUG',
      message: 'Query ({"type":"list-all-ids"}) and load from sys/core using tbc-record-fs:query-records and tbc-record-fs:fetch-records',
    },
    {
      level: 'debug',
      kind: 'structured',
      source: logSource,
      code: 'DEBUG',
      message: 'Query ({"type":"list-all-ids"}) and load from sys/ext using tbc-record-fs:query-records and tbc-record-fs:fetch-records',
    },
    {
      level: 'debug',
      kind: 'structured',
      source: logSource,
      code: 'DEBUG',
      message: 'Query ({"type":"list-all-ids","recursive":true}) and load from skills using tbc-record-fs:query-records and tbc-record-fs:fetch-records',
    },
  ];
}

export function formatLoadCoreMemoriesDebug(source = ''): TBCMessage[] {
  const logSource = source || 'sys:validate';
  return [
    {
      level: 'debug',
      kind: 'structured',
      source: logSource,
      code: 'DEBUG',
      message: 'Identifying companionID',
    },
    {
      level: 'debug',
      kind: 'structured',
      source: logSource,
      code: 'DEBUG',
      message: 'Identifying primeID',
    },
    {
      level: 'debug',
      kind: 'structured',
      source: logSource,
      code: 'DEBUG',
      message: 'Identifying memoryMapID',
    },
  ];
}
