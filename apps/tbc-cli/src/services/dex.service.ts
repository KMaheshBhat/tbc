import packageJson from '../../package.json' with { type: 'json' };

import { writeDexArtifacts } from '../lib/dex.js';
import { formatDexRebuildReport, formatMessages, formatProtocolDiscovery, formatValidationAudit } from '../lib/message.js';
import { resolveProtocol, type TBCProtocol } from '../lib/protocol.js';
import { runValidationChecks } from '../lib/validator.js';

export interface DexRebuildRequest {
  rootDirectory: string;
  verbose: boolean;
  source?: string;
}

function renderProtocol(protocol: TBCProtocol, source: string, verbose: boolean): void {
  console.log(formatMessages(formatProtocolDiscovery(protocol, source), verbose));
}

function renderServiceMessage(source: string, message: string, verbose: boolean): void {
  console.log(formatMessages([{ level: 'info', source, code: 'SERVICE', message }], verbose));
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
  // `resolveProtocol` reduces the collection references of the root record to
  // the collection directory, so a vault created by the legacy `tbc sys init`
  // (which addresses the collections by path) is rebuilt identically to a
  // vault created by the NG `tbc sys init`.
  const protocol = resolveProtocol(request.rootDirectory);

  // Stage 2 - protocol discovery
  renderProtocol(protocol, source, request.verbose);
  renderServiceMessage(source, 'Checking first ...', request.verbose);

  // Stage 3 - root validation (abort without rebuilding on failure)
  const validation = runValidationChecks(request.rootDirectory, protocol, source);
  console.log(formatMessages(formatValidationAudit(validation, source), request.verbose));
  if (!validation.success) {
    console.log(formatMessages([{
      level: 'error',
      source: 'dex:rebuild',
      code: 'OVERWRITE-GUARD',
      message: 'has no existing companion (not a valid TBC Root)',
      suggestion: 'Can only be run on a valid TBC Root. (Use "tbc sys init" for new Companion).',
    }], request.verbose));
    return;
  }

  renderServiceMessage(source, 'existing valid TBC root found, proceeding ...', request.verbose);
  renderServiceMessage(source, 'Rebuilding DEX...', request.verbose);

  // Stage 4 - rebuild execution (fixed order: sys digest -> skills index -> mem shards)
  const artifacts = writeDexArtifacts(request.rootDirectory, protocol);

  // Stage 5 - output
  console.log(formatMessages(
    formatDexRebuildReport(artifacts, protocol, source, packageJson.version),
    request.verbose,
  ));
}
