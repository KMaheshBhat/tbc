import { copyFileSync } from 'node:fs';
import packageJson from '../../package.json' with { type: 'json' };

import { fetchRecord as fetchFsRecord, queryCollection, storeRecord, type TBCRecord } from '../lib/fs.js';
import { queryRecords, rebuildCollectionIndex, rebuildCollectionRelations, searchRecords, upsertRecord, upsertRecordRelation, type CollectionIndexRecord, type CollectionRelation } from '../lib/db.js';
import { deriveTitle, mineMemoryRecord, normalizeTags, readMemoryRecords, type MinedRecord } from '../lib/assimilate.js';
import { writeDexArtifacts } from '../lib/dex.js';
import { resolveProtocol, type TBCProtocol } from '../lib/protocol.js';
import { validateRoot } from './validate.service.js';
import { formatDexRebuildReport, formatMessages, formatProtocolDiscovery, type TBCMessage } from '../lib/message.js';
import { mintUuids } from '../lib/mint.js';
import { synthesizeMemoryRecord } from '../lib/synthesis.js';

export { deriveTitle, normalizeTags };

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
  /** Report what would be written without writing anything. */
  dryRun?: boolean;
  /** Write a timestamped copy of the SQLite database before writing. */
  backup?: boolean;
  /** The message source — defaults to `'mem:assimilate'`. */
  source?: string;
}

/** The outcome of an assimilate run. */
export interface MemAssimilateResult {
  success: boolean;
  count: number;
  titlesDerived: number;
  tagsNormalized: number;
  relationsWritten: number;
  rowsWritten: number;
  rowsRemoved: number;
  relationsRemoved: number;
  filesRewritten: number;
  stores: string[];
  dexRebuilt: boolean;
}

function renderProtocol(protocol: TBCProtocol, source: string, verbose: boolean): void {
  if (!verbose) return;
  console.log(formatMessages(formatProtocolDiscovery(protocol, source), verbose));
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
    // The legacy view requests sortBy=id, sortOrder=desc. UUIDv7 IDs
    // preserve the intended recency ordering and remain stable when tests or
    // callers create records concurrently.
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, limit);
}

export async function rememberMemory(request: MemRememberRequest): Promise<void> {
  const source = request.source || 'mem:remember';
  const protocol = resolveProtocol(request.rootDirectory);
  renderProtocol(protocol, source, request.verbose);
  if (!(await validateRoot({ rootDirectory: request.rootDirectory, protocol, verbose: request.verbose, label: `${source}:validate`, guard: true })).success) return;

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
  if (!(await validateRoot({ rootDirectory: request.rootDirectory, protocol, verbose: request.verbose, label: `${source}:validate`, guard: true })).success) return;

  const normalizedQuery = request.query?.trim().toLowerCase();
  if (normalizedQuery === 'companion' || normalizedQuery === 'who am i') {
    const record = companionIdentity(request.rootDirectory, protocol);
    if (record) renderIdentity('Companion Identity', record, 'mem:recall');
    return;
  }
  if (normalizedQuery === 'prime' || normalizedQuery === 'who is my prime') {
    const record = primeIdentity(request.rootDirectory, protocol);
    if (record) renderIdentity('Prime Identity', record, 'mem:recall');
    return;
  }

  let records: TBCRecord[];
  if (request.query && protocol.hasSqlite) {
    if (request.verbose) console.log(`[»] ── debug | mem:recall | Query source: tbc-record-sqlite:query-records`);
    records = searchRecords(protocol.sqlitePath, protocol.memCollection, request.query, request.type);
  } else if (request.query) {
    if (request.verbose) console.log(`[»] ── debug | mem:recall | Query source: tbc-record-fs:query-records`);
    records = queryCollection(request.rootDirectory, protocol.memCollection, { recordType: request.type })
      .map((id) => fetchFsRecord(request.rootDirectory, protocol.memCollection, id))
      .filter((record): record is TBCRecord => !!record)
      .filter((record) => JSON.stringify(record.data).toLowerCase().includes(request.query!.toLowerCase()) || record.content.toLowerCase().includes(request.query!.toLowerCase()));
  } else if (protocol.hasSqlite) {
    if (request.verbose) console.log(`[»] ── debug | mem:recall | Query source: tbc-record-sqlite:query-records`);
    records = queryRecords(protocol.sqlitePath, protocol.memCollection, { recordType: request.type });
  } else {
    records = queryCollection(request.rootDirectory, protocol.memCollection, { recordType: request.type })
      .map((id) => fetchFsRecord(request.rootDirectory, protocol.memCollection, id))
      .filter((record): record is TBCRecord => !!record);
  }
  renderMemories(sortRecent(records, request.limit), source, request.verbose);
}

/**
 * Resolve the companion tag of a vault.
 *
 * The tag is the companion's name in the `c/agent/<name>` shape — the same
 * shape `mem remember` uses. An empty string when the companion cannot be
 * resolved.
 */
function resolveCompanionTag(rootDirectory: string, protocol: TBCProtocol): string {
  const companion = companionIdentity(rootDirectory, protocol);
  const name = String(companion?.data.record_title || '').trim();
  return name ? `c/agent/${name.toLowerCase()}` : '';
}

/**
 * Write a timestamped copy of the SQLite database.
 *
 * The backup is opt-in (D6) — the SQLite index is derived data and the
 * filesystem is the authority, so a backup of derived data is not required.
 */
function writeDatabaseBackup(sqlitePath: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${sqlitePath}.bak-${stamp}`;
  copyFileSync(sqlitePath, backupPath);
  return backupPath;
}

/** The index payload of a mined record — the front matter plus the body. */
function indexPayload(record: MinedRecord): Record<string, unknown> {
  return {
    ...record.frontmatter,
    content: record.content,
    id: record.id,
    filename: record.filename,
  };
}

/**
 * Mine the memory records of a vault and bake them into every store.
 *
 * The filesystem is the **authority** for the body; the front-matter is the
 * **derived layer** that the mining produces and the bake writes back. The
 * broadcast then makes every other store agree with the filesystem: the
 * SQLite index, the SQLite relationships and the inDEX artifacts.
 *
 * The command is idempotent: a second run finds nothing to change.
 */
export async function assimilateMemory(request: MemAssimilateRequest): Promise<MemAssimilateResult> {
  const source = request.source || 'mem:assimilate';
  const dryRun = request.dryRun === true;

  // Stage 1 - protocol resolution
  const protocol = resolveProtocol(request.rootDirectory);

  // Stage 2 - protocol discovery / rendering
  renderProtocol(protocol, source, request.verbose);
  console.log(formatMessages([{ level: 'info', source, code: 'SERVICE', message: 'Checking existing TBC root ...' }], request.verbose));

  // Stage 3 - root validation (abort before any write on failure)
  const validation = await validateRoot({ rootDirectory: request.rootDirectory, protocol, verbose: request.verbose, label: `${source}:validate`, guard: true });
  if (!validation.success) {
    return { success: false, count: 0, titlesDerived: 0, tagsNormalized: 0, relationsWritten: 0, rowsWritten: 0, rowsRemoved: 0, relationsRemoved: 0, filesRewritten: 0, stores: [], dexRebuilt: false };
  }

  console.log(formatMessages([{ level: 'info', source, code: 'SERVICE', message: 'Starting assimilation ...' }], request.verbose));

  // Stage 5 - source enumeration (the filesystem is the authority)
  const warnings: string[] = [];
  const records = readMemoryRecords(request.rootDirectory, protocol.memCollection, (filename) => {
    warnings.push(filename);
  });
  for (const filename of warnings) {
    console.log(formatMessages([{
      level: 'warn',
      source,
      code: 'RECORD-SKIPPED',
      message: `Skipped unreadable memory record: ${filename}`,
    }], request.verbose));
  }
  console.log(formatMessages([{
    level: 'info',
    source,
    code: 'SERVICE',
    message: `Found ${records.length} record(s) to assimilate.`,
  }], request.verbose));




  // Stage 6 - mining (the derived layer)
  const companionTag = resolveCompanionTag(request.rootDirectory, protocol);
  const mined = records.map((record) => mineMemoryRecord(record, companionTag));
  const titlesDerived = mined.filter((record) => record.titleDerived).length;
  const tagsNormalized = mined.reduce((total, record) => total + record.tagsNormalized, 0);

  // Stage 7 - bake the mined front matter back into the FS records
  let filesRewritten = 0;
  for (const record of mined) {
    // A record file that carries no YAML front-matter block (a `.json` or a
    // `.yaml` record) cannot carry the mined front-matter — baking one would
    // rewrite the file in a foreign format. Such a record is still mined and
    // indexed; only the bake is skipped.
    if (!record.bakeable) continue;
    const written = storeRecord(request.rootDirectory, protocol.memCollection, {
      id: record.id,
      record_type: record.recordType,
      kind: record.kind,
      data: record.frontmatter,
      content: record.content,
    }, { onlyIfChanged: !dryRun, dryRun });
    if (written) filesRewritten += 1;
  }

  // Stage 8/9 - the SQLite index and the relationships
  const stores = ['tbc-record-fs:store-records'];
  let rowsWritten = 0;
  let rowsRemoved = 0;
  let relationsWritten = 0;
  let relationsRemoved = 0;

  if (protocol.hasSqlite) {
    if (request.backup && !dryRun) {
      writeDatabaseBackup(protocol.sqlitePath);
    }

    const indexRecords: CollectionIndexRecord[] = mined.map((record) => ({
      id: record.id,
      recordType: record.recordType || record.kind || 'unknown',
      payload: indexPayload(record),
      createdAt: record.createdAt,
    }));

    const relations: CollectionRelation[] = mined.flatMap((record) => record.tags.map((tag) => ({
      fromRecordId: record.id,
      toRecordId: tag,
      relationType: 'tag',
      targetCollection: 'tag',
    })));

    const index = rebuildCollectionIndex(protocol.sqlitePath, protocol.memCollection, indexRecords, { dryRun });
    const relationResult = rebuildCollectionRelations(protocol.sqlitePath, protocol.memCollection, relations, { dryRun });

    rowsWritten = index.written;
    rowsRemoved = index.removed;
    relationsWritten = relationResult.written;
    relationsRemoved = relationResult.removed;
    stores.push('tbc-record-sqlite:store-records');
  }

  console.log(formatMessages([{
    level: 'info',
    source,
    code: 'SERVICE',
    message: `Mined ${mined.length} record(s): ${titlesDerived} title(s) derived, ${tagsNormalized} tag(s) normalized, ${relationsWritten} relation(s) written, ${rowsWritten} row(s) written, ${rowsRemoved} stale row(s) removed, ${relationsRemoved} stale relation(s) removed, ${filesRewritten} file(s) rewritten.`,
  }], request.verbose));

  // Stage 10 - the inDEX
  const artifacts = writeDexArtifacts(request.rootDirectory, protocol);
  console.log(formatMessages(
    formatDexRebuildReport(artifacts, protocol, 'mem:assimilate:dex-rebuild', packageJson.version),
    request.verbose,
  ));
  stores.push('tbc-record-fs:dex-rebuild');

  // Stage 11 - the report
  console.log(formatMessages([{
    level: 'info',
    source,
    code: 'SERVICE',
    message: `Broadcast ${mined.length} record(s) to ${stores.join(', ')}.`,
  }], request.verbose));

  return {
    success: true,
    count: mined.length,
    titlesDerived,
    tagsNormalized,
    relationsWritten,
    rowsWritten,
    rowsRemoved,
    relationsRemoved,
    filesRewritten,
    stores,
    dexRebuilt: true,
  };
}
