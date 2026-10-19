import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import packageJson from '../../package.json' with { type: 'json' };

import { buildCollectionShards, buildSkillsIndex, buildSysDigest } from '../lib/dex.js';
import { storeRawFile } from '../lib/fs.js';
import { formatMessages, formatProtocolDiscovery } from '../lib/message.js';
import { resolveProtocol, normalizeProtocolCollections, type TBCProtocol } from '../lib/protocol.js';
import { runValidationChecks, type TBCValidationResult } from '../lib/validator.js';

export interface DexRebuildRequest {
  rootDirectory: string;
  verbose: boolean;
  source?: string;
}

function renderProtocol(protocol: TBCProtocol, source: string, verbose: boolean): void {
  console.log(formatMessages(formatProtocolDiscovery(protocol, source), verbose));
}

function renderFlowMessage(source: string, message: string, verbose: boolean): void {
  console.log(formatMessages([{ level: 'info', source, code: 'FLOW', message }], verbose));
}

function renderValidationAudit(result: TBCValidationResult, source: string, verbose: boolean): void {
  console.log(formatMessages([
    { level: 'info', kind: 'raw', source: '', code: '', message: ' ┌┤ Validation Audit ├────────────────────────────────────────' },
    ...result.messages,
    { level: 'info', kind: 'raw', source: '', code: '', message: ' └┼───────────────────────────────────────────────────────────' },
    { level: 'info', kind: 'raw', source, code: '', message: result.success
      ? '[✓] STABLE   | 0 error(s) detected.'
      : `[✗] DEGRADED   | ${result.messages.filter((message) => message.level === 'error').length} error(s) detected.` },
  ], verbose));
}

/**
 * Remove the stale memory shards of a collection.
 *
 * A record whose `record_type` changed would otherwise leave an orphan shard
 * behind (legacy `FSStore.index` parity).
 */
function removeStaleShards(dexDirectory: string, collection: string): void {
  if (!existsSync(dexDirectory)) return;
  for (const entry of readdirSync(dexDirectory)) {
    if (entry.startsWith(`${collection}.`) && entry.endsWith('.jsonl')) {
      rmSync(join(dexDirectory, entry), { force: true });
    }
  }
}

/**
 * Rebuild the inDEX artifacts of a TBC root.
 *
 * The rebuild targets are fixed (legacy `on.rebuild` parity):
 *   1. `<dex>/sys.digest.txt`  - the collated system specifications
 *   2. `<dex>/skills.jsonl`    - the skills metadata index
 *   3. `<dex>/<mem>.*.jsonl`   - the memory shards, partitioned by record_type
 *
 * The artifacts are written to the filesystem only; they are never dual-written
 * to SQLite (legacy `dex` collection protocol parity).
 */
export async function rebuildDex(request: DexRebuildRequest): Promise<void> {
  const source = request.source || 'dex:rebuild';
  // The root record may address the collections by path (`/mem/`) or by name
  // (`mem`); both are reduced to the collection directory name so that a root
  // created by either implementation is rebuilt identically.
  const protocol = normalizeProtocolCollections(resolveProtocol(request.rootDirectory));

  // Stage 2 - protocol discovery
  renderProtocol(protocol, source, request.verbose);
  renderFlowMessage(source, 'Checking first ...', request.verbose);

  // Stage 3 - root validation (abort without rebuilding on failure)
  const validation = runValidationChecks(request.rootDirectory, protocol, source);
  renderValidationAudit(validation, source, request.verbose);
  if (!validation.success) {
    console.log(formatMessages([{
      level: 'error',
      source: 'dex-rebuild-flow',
      code: 'OVERWRITE-GUARD',
      message: 'has no existing companion (not a valid TBC Root)',
      suggestion: 'Can only be run on a valid TBC Root. (Use "tbc sys init" for new Companion).',
    }], request.verbose));
    return;
  }

  renderFlowMessage(source, 'existing valid TBC root found, proceeding ...', request.verbose);
  renderFlowMessage(source, 'Rebuilding DEX...', request.verbose);

  // Stage 4 - rebuild execution (fixed order: sys digest -> skills index -> mem shards)
  const dexDirectory = join(request.rootDirectory, protocol.dexCollection);
  if (!existsSync(dexDirectory)) {
    mkdirSync(dexDirectory, { recursive: true });
  }

  // 4a - system digest
  storeRawFile(
    request.rootDirectory,
    protocol.dexCollection,
    'sys.digest.txt',
    buildSysDigest(request.rootDirectory, protocol),
  );

  // 4b - skills index
  storeRawFile(
    request.rootDirectory,
    protocol.dexCollection,
    'skills.jsonl',
    buildSkillsIndex(request.rootDirectory, protocol),
  );

  // 4c - memory shards (stale shards are removed first - legacy parity)
  removeStaleShards(dexDirectory, protocol.memCollection);
  for (const shard of buildCollectionShards(request.rootDirectory, protocol.memCollection)) {
    storeRawFile(request.rootDirectory, protocol.dexCollection, shard.fileName, shard.content);
  }

  // Stage 5 - output
  console.log(formatMessages([
    { level: 'info', kind: 'raw', source: '', code: '', message: ' ┌┼───────────────────────────────────────────────────────────' },
    { level: 'info', kind: 'raw', source: '', code: '', message: `[✓] System Index (Dex) Rebuilt: ${packageJson.version}` },
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
  ], request.verbose));
}
