import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';

import { fetchRecord as fetchFsRecord, queryCollection, storeRecord, type TBCRecord } from '../lib/fs.js';
import { upsertRecord } from '../lib/db.js';
import { mintUuids } from '../lib/mint.js';
import { formatMessages, formatProtocolDiscovery, type TBCMessage } from '../lib/message.js';
import { resolveProtocol, type TBCProtocol } from '../lib/protocol.js';
import { runValidationChecks } from '../lib/validator.js';
import { synthesizeMemoryRecord } from '../lib/synthesis.js';

export interface ActStartRequest { rootDirectory: string; activityId?: string; verbose: boolean; source?: string; }
export interface ActShowRequest { rootDirectory: string; verbose: boolean; source?: string; }
export interface ActPauseRequest { rootDirectory: string; activityId: string; verbose: boolean; source?: string; }
export interface ActCloseRequest { rootDirectory: string; activityId: string; verbose: boolean; source?: string; }
type ActRequest = ActStartRequest | ActShowRequest | ActPauseRequest | ActCloseRequest;

function sourceFor(request: ActRequest, fallback: string): string { return request.source || fallback; }

function validateActivityId(activityId: string | undefined): asserts activityId is string {
  if (!activityId || isAbsolute(activityId) || activityId.includes('/') || activityId.includes('\\') || activityId.includes('..')) {
    throw new Error('Invalid activity ID: expected a non-empty single path segment.');
  }
}

function renderProtocol(protocol: TBCProtocol, source: string, verbose: boolean): void {
  if (verbose) console.log(formatMessages(formatProtocolDiscovery(protocol, source), verbose));
}

function validateRoot(rootDirectory: string, protocol: TBCProtocol, source: string, verbose: boolean): boolean {
  const result = runValidationChecks(rootDirectory, protocol, source);
  if (result.success) return true;
  const messages: TBCMessage[] = [...result.messages.filter((message) => message.level === 'error'), {
    level: 'error', source: source.replace(/^act:/, 'act-') + '-flow', code: 'OVERWRITE-GUARD',
    message: 'has no existing companion (not a valid TBC Root)', suggestion: 'Use "tbc sys init" instead.',
  }];
  console.log(formatMessages(messages, verbose));
  return false;
}

function activityRoot(protocol: TBCProtocol, rootDirectory: string): string { return join(rootDirectory, protocol.actCollection); }
function activityPath(protocol: TBCProtocol, rootDirectory: string, state: 'current' | 'backlog' | 'archive', id: string): string {
  return join(activityRoot(protocol, rootDirectory), state, id);
}
function activityLogRecord(rootDirectory: string, protocol: TBCProtocol, state: 'current' | 'backlog', id: string): TBCRecord | null {
  return fetchFsRecord(rootDirectory, join(protocol.actCollection, state, id), id);
}
function renderMissingActivity(id: string, source: string, suggestion: string, verbose: boolean): void {
  console.log(formatMessages([{ level: 'error', source, code: 'ACTIVITY-NOT-FOUND', message: `Activity ${id} not found in current workspace.`, suggestion }], verbose));
}

export async function startActivity(request: ActStartRequest): Promise<void> {
  const source = sourceFor(request, 'act:start');
  if (request.activityId !== undefined) validateActivityId(request.activityId);
  const protocol = resolveProtocol(request.rootDirectory);
  renderProtocol(protocol, source, request.verbose);
  if (!validateRoot(request.rootDirectory, protocol, source, request.verbose)) return;

  const [mintedId] = request.activityId ? [request.activityId] : await mintUuids(1);
  const id = mintedId;
  const current = activityPath(protocol, request.rootDirectory, 'current', id);
  const backlog = activityPath(protocol, request.rootDirectory, 'backlog', id);
  let status: 'active' | 'resumed' | 'created';
  if (existsSync(current)) status = 'active';
  else if (existsSync(backlog)) {
    mkdirSync(join(activityRoot(protocol, request.rootDirectory), 'current'), { recursive: true });
    renameSync(backlog, current); status = 'resumed';
  } else { mkdirSync(current, { recursive: true }); status = 'created'; }

  const workspaceMessages: Record<typeof status, string> = {
    active: `Activity ${id} is already active.`, resumed: `Resumed activity from backlog: ${id}`, created: `Created new workspace for activity: ${id}`,
  };
  console.log(formatMessages([{ level: 'info', source: 'prepare-workspace', code: 'WORKSPACE-PREPARED', message: workspaceMessages[status] }], request.verbose));

  if (!existsSync(join(current, `${id}.md`))) {
    const pointer = fetchFsRecord(request.rootDirectory, protocol.sysCollection, 'companion.id');
    const companionId = pointer?.content.trim();
    const companion = companionId ? fetchFsRecord(request.rootDirectory, protocol.memCollection, companionId) : null;
    const timestamp = new Date().toISOString();
    const record = synthesizeMemoryRecord(id, 'log', `Activity Log ${timestamp}`,
      `Activity session initialized with companion ${String(companion?.data.record_title || 'companion')}. Replace this with actual activity details and logs as you work.`, [], timestamp);
    record.data.log_type = 'activity';
    storeRecord(request.rootDirectory, join(protocol.actCollection, 'current', id), record);
  }

  console.log(formatMessages([
    { level: 'info', kind: 'raw', source: '', code: '', message: ' ┌┼───────────────────────────────────────────────────────────' },
    { level: 'info', kind: 'raw', source: '', code: '', message: `[✓] Activity started: ${id}` },
    { level: 'info', kind: 'raw', source: '', code: '', message: ' └┼───────────────────────────────────────────────────────────' },
    { level: 'info', source: 'act-start-flow', code: 'ACTIVITY-STARTED', message: `Log: ${protocol.actCollection}/current/${id}/${id}.md`, suggestion: 'This is your active workspace. Updates will be tracked here until the activity is closed.' },
  ], request.verbose));
}

function primaryActivityRecords(rootDirectory: string, collection: string): Array<{ folderId: string; fileName: string; record: TBCRecord }> {
  return queryCollection(rootDirectory, collection, { recursive: true }).map((recordId) => {
    const parts = recordId.split('/');
    return { folderId: parts[0], fileName: parts[parts.length - 1], record: fetchFsRecord(rootDirectory, collection, recordId) };
  }).filter((entry): entry is { folderId: string; fileName: string; record: TBCRecord } =>
    !!entry.record && entry.folderId === entry.fileName && entry.record.record_type === 'log');
}

export async function showActivity(request: ActShowRequest): Promise<void> {
  const source = sourceFor(request, 'act:show');
  const protocol = resolveProtocol(request.rootDirectory);
  renderProtocol(protocol, source, request.verbose);
  if (!validateRoot(request.rootDirectory, protocol, source, request.verbose)) return;
  for (const group of [
    { state: 'current' as const, label: 'Active [current]', empty: 'No active activities found.' },
    { state: 'backlog' as const, label: 'Paused [backlog]', empty: 'No paused activities found.' },
  ]) {
    const collection = join(protocol.actCollection, group.state);
    const entries = primaryActivityRecords(request.rootDirectory, collection).sort((a, b) => b.folderId.localeCompare(a.folderId));
    const messages: TBCMessage[] = [{ level: 'info', kind: 'raw', source: '', code: '', message: ` ┌┤ ${group.label} ├────────────────────────────────────────` }];
    if (!entries.length) messages.push({ level: 'info', source, code: 'NO-ACTIVITIES', message: `(${group.empty})` });
    else for (const entry of entries) messages.push({ level: 'info', source, code: 'ACTIVITY', message: String(entry.record.data.record_title || 'Untitled Activity'), suggestion: `Found at ${collection}:${entry.folderId}/${entry.fileName}.md` });
    messages.push({ level: 'info', kind: 'raw', source: '', code: '', message: ' └────────────────────────────────────────────────────────────' });
    console.log(formatMessages(messages, request.verbose));
  }
}

export async function pauseActivity(request: ActPauseRequest): Promise<void> {
  const source = sourceFor(request, 'act:pause');
  validateActivityId(request.activityId);
  const protocol = resolveProtocol(request.rootDirectory);
  renderProtocol(protocol, source, request.verbose);
  if (!validateRoot(request.rootDirectory, protocol, source, request.verbose)) return;
  const current = activityPath(protocol, request.rootDirectory, 'current', request.activityId);
  if (!existsSync(current)) {
    renderMissingActivity(request.activityId, 'act-pause-flow', 'Check "tbc act show" to verify the activity status or "tbc act start" to start a new activity.', request.verbose); return;
  }
  const backlogRoot = join(activityRoot(protocol, request.rootDirectory), 'backlog');
  mkdirSync(backlogRoot, { recursive: true }); renameSync(current, join(backlogRoot, request.activityId));
  console.log(formatMessages([
    { level: 'info', kind: 'raw', source: '', code: '', message: ' ┌┼───────────────────────────────────────────────────────────' },
    { level: 'info', kind: 'raw', source: '', code: '', message: `[✓] Activity paused: ${request.activityId}` },
    { level: 'info', kind: 'raw', source: '', code: '', message: ' └┼───────────────────────────────────────────────────────────' },
    { level: 'info', source: 'act-pause-flow', code: 'ACTIVITY-PAUSED', message: `Paused activity: ${request.activityId}`, suggestion: `Use "tbc act start ${request.activityId}" to resume the activity.` },
  ], request.verbose));
}

export async function closeActivity(request: ActCloseRequest): Promise<void> {
  const source = sourceFor(request, 'act:close');
  validateActivityId(request.activityId);
  const protocol = resolveProtocol(request.rootDirectory);
  renderProtocol(protocol, source, request.verbose);
  if (!validateRoot(request.rootDirectory, protocol, source, request.verbose)) return;
  const current = activityPath(protocol, request.rootDirectory, 'current', request.activityId);
  if (!existsSync(current)) {
    renderMissingActivity(request.activityId, 'act-close-flow', 'Verify the ID with "tbc act show" or check if it is already in the backlog/archive.', request.verbose); return;
  }
  const record = activityLogRecord(request.rootDirectory, protocol, 'current', request.activityId);
  if (!record) {
    console.log(formatMessages([{ level: 'error', source: 'act-close-flow', code: 'PRIMARY-LOG-MISSING', message: `Primary activity log ${request.activityId}.md is missing; activity was left untouched.` }], request.verbose)); return;
  }
  if (record.record_type !== 'log' || record.data.record_type !== 'log') throw new Error(`Activity ${request.activityId} primary record is not a log.`);
  const archive = activityPath(protocol, request.rootDirectory, 'archive', request.activityId);
  if (existsSync(archive)) throw new Error(`Activity archive destination already exists: ${relative(request.rootDirectory, archive)}`);
  storeRecord(request.rootDirectory, protocol.memCollection, record);
  if (protocol.hasSqlite) upsertRecord(protocol.sqlitePath, protocol.memCollection, record);
  mkdirSync(join(activityRoot(protocol, request.rootDirectory), 'archive'), { recursive: true }); renameSync(current, archive);
  console.log(formatMessages([
    { level: 'info', kind: 'raw', source: '', code: '', message: ' ┌┼───────────────────────────────────────────────────────────' },
    { level: 'info', kind: 'raw', source: '', code: '', message: `[✓] Activity closed: ${request.activityId}` },
    { level: 'info', kind: 'raw', source: '', code: '', message: ' └┼───────────────────────────────────────────────────────────' },
    { level: 'info', source: 'act-close-flow', code: 'ACTIVITY-CLOSED', message: `Activity archived: ${protocol.actCollection}/archive/${request.activityId}` },
  ], request.verbose));
}
