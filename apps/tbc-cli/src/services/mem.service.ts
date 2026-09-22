import { fetchRecord as fetchFsRecord, queryCollection, storeRecord, type TBCRecord } from '../lib/fs.js';
import { queryRecords, searchRecords, upsertRecord, upsertRecordRelation } from '../lib/db.js';
import { resolveProtocol, type TBCProtocol } from '../lib/protocol.js';
import { runValidationChecks } from '../lib/validator.js';
import { formatMessages, formatProtocolDiscovery, type TBCMessage } from '../lib/message.js';
import { mintUuids } from '../lib/mint.js';
import { synthesizeMemoryRecord } from '../lib/synthesis.js';

export interface MemRememberRequest {
  rootDirectory: string;
  content?: string;
  type: string;
  title?: string;
  tags: string[];
  verbose: boolean;
  source?: string;
}

export interface MemRecallRequest {
  rootDirectory: string;
  query?: string;
  type?: string;
  limit: number;
  verbose: boolean;
  source?: string;
}

export interface MemAssimilateRequest {
  rootDirectory: string;
  verbose: boolean;
}

export function deriveTitle(content?: string): string {
  const words = (content || '').trim().split(/\s+/).filter(Boolean);
  return words.length ? words.slice(0, 5).join(' ') : '';
}

export function normalizeTags(rawTags: string[], companionTag: string): string[] {
  const tags = rawTags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => /^[a-z]\//.test(tag) ? tag : `t/${tag}`);
  return [...new Set([companionTag, ...tags].filter(Boolean))];
}

function renderProtocol(protocol: TBCProtocol, source: string, verbose: boolean): void {
  if (!verbose) return;
  console.log(formatMessages(formatProtocolDiscovery(protocol, source), verbose));
}

function validate(rootDirectory: string, protocol: TBCProtocol, source: string, verbose: boolean): boolean {
  const result = runValidationChecks(rootDirectory, protocol, source);
  if (result.success) return true;
  const messages: TBCMessage[] = [
    ...result.messages.filter((message) => message.level === 'error'),
    {
      level: 'error',
      source: source.endsWith(':recall') ? 'recall-flow' : 'remember-flow',
      code: 'OVERWRITE-GUARD',
      message: 'has no existing companion (not a valid TBC Root)',
      suggestion: 'Use "tbc sys init" instead.',
    },
  ];
  console.log(formatMessages(messages, verbose));
  return false;
}

function companionIdentity(rootDirectory: string, protocol: TBCProtocol): TBCRecord | null {
  const pointer = fetchFsRecord(rootDirectory, protocol.sysCollection, 'companion.id');
  const id = pointer?.content.trim();
  return id ? fetchFsRecord(rootDirectory, protocol.memCollection, id) : null;
}

function primeIdentity(rootDirectory: string, protocol: TBCProtocol): TBCRecord | null {
  const pointer = fetchFsRecord(rootDirectory, protocol.sysCollection, 'prime.id');
  const id = pointer?.content.trim();
  return id ? fetchFsRecord(rootDirectory, protocol.memCollection, id) : null;
}

function renderIdentity(title: string, record: TBCRecord, source: string): void {
  const name = String(record.data.record_title || record.id);
  const messages: TBCMessage[] = [
    { level: 'info', kind: 'raw', source: '', code: '', message: '' },
    { level: 'info', kind: 'raw', source: '', code: '', message: `┌┤ ${title} ├────────────────────────────────────────` },
    { level: 'info', kind: 'raw', source: '', code: '', message: `[✓] ${record.id} : ${name}` },
    { level: 'info', kind: 'raw', source, code: '', message: '└───────────────────────────────────────────────────────────' },
    {
      level: 'info', source, code: 'IDENTITY',
      message: title === 'Companion Identity' ? 'This is **your** identity.' : "This is your prime's identity.",
      suggestion: 'Lookup the record to know more.',
    },
  ];
  console.log(formatMessages(messages));
}

function memoryTitle(record: TBCRecord): string {
  return String(record.data.record_title || record.id);
}

function renderMemories(records: TBCRecord[], source: string, verbose: boolean): void {
  if (!records.length) {
    console.log(formatMessages([{
      level: 'info', source, code: 'NO-RESULTS', message: 'No memory records found.', suggestion: 'Try a different query!',
    }], verbose));
    return;
  }
  const messages: TBCMessage[] = [
    { level: 'info', kind: 'raw', source: '', code: '', message: '┌┤ Recalled Memories ├────────────────────────────────────────' },
    ...records.map((record) => ({
      level: 'info' as const, kind: 'raw' as const, source, code: 'MEMORY',
      message: `[✓] ${record.id} : [${String(record.record_type || record.kind || 'memory').padEnd(10)}] ${memoryTitle(record)}`,
    })),
    { level: 'info', kind: 'raw', source: '', code: '', message: '└───────────────────────────────────────────────────────────' },
    { level: 'info', source, code: 'RESULTS', message: `Found ${records.length} memory record(s).`, suggestion: 'Lookup those record(s) to know more.' },
  ];
  console.log(formatMessages(messages, verbose));
}

function sortRecent(records: TBCRecord[], limit: number): TBCRecord[] {
  return records
    // The legacy view flow requests sortBy=id, sortOrder=desc. UUIDv7 IDs
    // preserve the intended recency ordering and remain stable when tests or
    // callers create records concurrently.
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, limit);
}

export async function rememberMemory(request: MemRememberRequest): Promise<void> {
  const source = request.source || 'mem:remember';
  const protocol = resolveProtocol(request.rootDirectory);
  renderProtocol(protocol, source, request.verbose);
  if (!validate(request.rootDirectory, protocol, source, request.verbose)) return;

  const [id] = await mintUuids(1);
  const companion = companionIdentity(request.rootDirectory, protocol);
  const companionName = String(companion?.data.record_title || '').trim();
  const tags = normalizeTags(request.tags, companionName ? `c/agent/${companionName.toLowerCase()}` : '');
  const title = request.title?.trim() || deriveTitle(request.content) || `New ${request.type}`;
  const record = synthesizeMemoryRecord(id, request.type, title, request.content || '', tags, new Date().toISOString());

  storeRecord(request.rootDirectory, protocol.memCollection, record);
  if (protocol.hasSqlite) {
    upsertRecord(protocol.sqlitePath, protocol.memCollection, record);
    for (const tag of tags) {
      upsertRecordRelation(protocol.sqlitePath, protocol.memCollection, id, 'tag', tag, 'tag');
    }
  }
  console.log(formatMessages([
    { level: 'info', kind: 'raw', source: '', code: '', message: '┌┼───────────────────────────────────────────────────────────' },
    { level: 'info', kind: 'raw', source: '', code: '', message: `[✓] Memory persisted (${request.type}): ${id}` },
    { level: 'info', kind: 'raw', source: '', code: '', message: '└┼───────────────────────────────────────────────────────────' },
    { level: 'info', source, code: 'PERSISTED', message: `Record: ${protocol.memCollection}/${id}.md`, suggestion: 'This file now contains the memory. Adjust and enhance it if required.' },
  ], request.verbose));
}

export async function recallMemory(request: MemRecallRequest): Promise<void> {
  const source = request.source || 'mem:recall';
  const protocol = resolveProtocol(request.rootDirectory);
  renderProtocol(protocol, source, request.verbose);
  if (!validate(request.rootDirectory, protocol, source, request.verbose)) return;

  const normalizedQuery = request.query?.trim().toLowerCase();
  if (normalizedQuery === 'companion' || normalizedQuery === 'who am i') {
    const record = companionIdentity(request.rootDirectory, protocol);
    if (record) renderIdentity('Companion Identity', record, 'recall-flow');
    return;
  }
  if (normalizedQuery === 'prime' || normalizedQuery === 'who is my prime') {
    const record = primeIdentity(request.rootDirectory, protocol);
    if (record) renderIdentity('Prime Identity', record, 'recall-flow');
    return;
  }

  let records: TBCRecord[];
  if (request.query && protocol.hasSqlite) {
    if (request.verbose) console.log(`[»] ── debug | recall-flow | Query source: tbc-record-sqlite:query-records`);
    records = searchRecords(protocol.sqlitePath, protocol.memCollection, request.query, request.type);
  } else if (request.query) {
    if (request.verbose) console.log(`[»] ── debug | recall-flow | Query source: tbc-record-fs:query-records`);
    records = queryCollection(request.rootDirectory, protocol.memCollection, { recordType: request.type })
      .map((id) => fetchFsRecord(request.rootDirectory, protocol.memCollection, id))
      .filter((record): record is TBCRecord => !!record)
      .filter((record) => JSON.stringify(record.data).toLowerCase().includes(request.query!.toLowerCase()) || record.content.toLowerCase().includes(request.query!.toLowerCase()));
  } else if (protocol.hasSqlite) {
    if (request.verbose) console.log(`[»] ── debug | recall-flow | Query source: tbc-record-sqlite:query-records`);
    records = queryRecords(protocol.sqlitePath, protocol.memCollection, { recordType: request.type });
  } else {
    records = queryCollection(request.rootDirectory, protocol.memCollection, { recordType: request.type })
      .map((id) => fetchFsRecord(request.rootDirectory, protocol.memCollection, id))
      .filter((record): record is TBCRecord => !!record);
  }
  renderMemories(sortRecent(records, request.limit), source, request.verbose);
}

export async function assimilateMemory(_request: MemAssimilateRequest): Promise<void> {
  throw new Error('NG stub: mem service not yet migrated from HAMI');
}
