import { resolveProtocol } from '../lib/protocol.js';
import { runValidationChecks } from '../lib/validator.js';
import { storeRecord, fetchRecord, deleteDirectory, copyDirectory, type TBCRecord } from '../lib/fs.js';
import { upsertRecord } from '../lib/db.js';
import { ASSETS } from '../lib/assets.js';
import { mintUuids } from '../lib/mint.js';
import {
  formatMessages,
  formatMintedIds,
  formatProtocolDiscovery,
  formatStagedManifest,
  formatIdentitySummary,
  formatUpgradeComplete,
  formatNextSteps,
  formatLoadSpecsDebug,
  formatLoadCoreMemoriesDebug,
  type TBCMessage,
  type MintedOutput,
  type ProtocolDiscoveryOutput,
  type ManifestEntry,
} from '../lib/message.js';
import {
  synthesizeCompanionRecord,
  synthesizeCoreSpecsAndSkills,
  synthesizeMemoryMapRecord,
  synthesizePrimeRecord,
  synthesizeRootRecord,
  synthesizeSystemPointers,
} from '../lib/synthesis.js';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

interface TBCProtocol {
  rootDirectory: string;
  sysCollection: string;
  skillsCollection: string;
  memCollection: string;
  dexCollection: string;
  actCollection: string;
  hasSqlite: boolean;
  sqlitePath: string;
}

export interface SysInitRequest {
  rootDirectory: string;
  companionName: string;
  primeName: string;
  profile: 'baseline' | 'next';
  verbose: boolean;
  source?: string;
}

export interface SysUpgradeRequest {
  rootDirectory: string;
  verbose: boolean;
  source?: string;
}

export interface SysValidateRequest {
  rootDirectory: string;
  verbose: boolean;
  source?: string;
}

export interface TBCValidationResult {
  success: boolean;
  timestamp: string;
  messages: TBCMessage[];
}

function renderProtocolDiscovery(protocol: TBCProtocol, source: string, verbose: boolean): void {
  const protocolDiscoveryOutput: ProtocolDiscoveryOutput = {
    sysCollection: protocol.sysCollection,
    skillsCollection: protocol.skillsCollection,
    memCollection: protocol.memCollection,
    dexCollection: protocol.dexCollection,
    actCollection: protocol.actCollection,
    hasSqlite: protocol.hasSqlite,
  };
  const protocolMessages = formatProtocolDiscovery(protocolDiscoveryOutput, source);
  console.log(formatMessages(protocolMessages, verbose));
}

function renderVerboseTrace(source: string, verbose: boolean): void {
  if (!verbose) return;

  const debugMessages = [
    ...formatLoadSpecsDebug(source),
    ...formatLoadCoreMemoriesDebug(source),
  ];
  console.log(formatMessages(debugMessages, verbose));
}

function renderValidationAudit(
  validationResult: TBCValidationResult,
  source: string,
  verbose: boolean
): void {
  const auditMessages: TBCMessage[] = [
    {
      level: 'info',
      kind: 'raw',
      source: '',
      code: '',
      message: ' ┌┤ Validation Audit ├────────────────────────────────────────',
    },
    ...validationResult.messages,
    {
      level: 'info',
      kind: 'raw',
      source: '',
      code: '',
      message: ' └┼───────────────────────────────────────────────────────────',
    },
    {
      level: 'info',
      kind: 'raw',
      source,
      code: '',
      message: validationResult.success
        ? `[✓] STABLE   | 0 error(s) detected.`
        : `[✗] DEGRADED   | ${validationResult.messages.filter(m => m.level === 'error').length} error(s) detected.`,
    },
  ];

  console.log(formatMessages(auditMessages, verbose));
}

async function writeRecordsToFsAndSqlite(
  rootDirectory: string,
  protocol: TBCProtocol,
  records: Map<string, TBCRecord[]>
): Promise<void> {
  // Always use root directory for SQLite database
  const dbPath = join(rootDirectory, 'records.db');

  for (const [collection, recs] of records.entries()) {
    for (const record of recs) {
      storeRecord(rootDirectory, collection, record);
      // Always write to SQLite (creates database if needed)
      upsertRecord(dbPath, collection, record);
    }
  }
}

export async function validateSystem(
  request: SysValidateRequest,
  options?: { sourceContext?: string; showProtocolDiscovery?: boolean; profile?: 'baseline' | 'next' }
): Promise<TBCValidationResult> {
  const source = options?.sourceContext || request.source || 'sys:validate';
  const protocol = resolveProtocol(request.rootDirectory, options?.profile);

  // Show protocol discovery only when called directly (not from init/upgrade)
  if (options?.showProtocolDiscovery !== false) {
    renderProtocolDiscovery(protocol, source, request.verbose);
  }

  renderVerboseTrace(source, request.verbose);

  const validationResult = runValidationChecks(request.rootDirectory, protocol, source);
  renderValidationAudit(validationResult, source, request.verbose);

  return validationResult;
}

interface InitIdentities {
  companionID: string;
  primeID: string;
  memoryMapID: string;
}

async function performPreInitValidation(
  request: SysInitRequest,
  validateSource: string
): Promise<TBCValidationResult> {
  return validateSystem(
    { rootDirectory: request.rootDirectory, verbose: request.verbose, source: validateSource },
    { sourceContext: validateSource, showProtocolDiscovery: false, profile: request.profile }
  );
}

async function mintInitIdentities(source: string, verbose: boolean): Promise<InitIdentities> {
  const [companionID, primeID, memoryMapID] = await mintUuids(3);
  const mintedOutput: MintedOutput = {
    keys: { companionID, primeID, memoryMapID },
    batch: [],
  };
  console.log(formatMessages(formatMintedIds(mintedOutput, source), verbose));
  return { companionID, primeID, memoryMapID };
}

function synthesizeInitRecords(
  request: SysInitRequest,
  protocol: TBCProtocol,
  identities: InitIdentities,
  source: string
): Map<string, TBCRecord[]> {
  const now = new Date().toISOString();
  const records = new Map<string, TBCRecord[]>();
  const { companionID, primeID, memoryMapID } = identities;

  records.set(protocol.memCollection, [
    synthesizeCompanionRecord(companionID, request.companionName, now),
    synthesizePrimeRecord(primeID, request.primeName, now),
    synthesizeMemoryMapRecord(memoryMapID, now),
  ]);
  records.set(protocol.sysCollection, [
    ...synthesizeSystemPointers(companionID, primeID),
    synthesizeRootRecord(protocol, companionID, primeID, memoryMapID, request.companionName, request.primeName, now),
  ]);

  const coreRecords = synthesizeCoreSpecsAndSkills(protocol, ASSETS);
  records.set(`${protocol.sysCollection}/core`, coreRecords.get(`${protocol.sysCollection}/core`) ?? []);
  records.set(`${protocol.sysCollection}/ext`, [{ id: '.gitkeep', record_type: 'placeholder', data: {}, content: '' }]);
  records.set(`${protocol.skillsCollection}/core`, coreRecords.get(`${protocol.skillsCollection}/core`) ?? []);
  records.set(`${protocol.skillsCollection}/ext`, [{ id: '.gitkeep', record_type: 'placeholder', data: {}, content: '' }]);

  const messages: TBCMessage[] = [
    { level: 'info', source, code: 'SYNTHESIZED', message: 'Synthesized memory records.' },
    { level: 'info', source, code: 'ASSETS', message: `Loaded TBC ${packageJson.version} core assets (specs and skills).` },
    { level: 'info', source, code: 'SYNTHESIZED', message: 'Synthesized system records.' },
  ];
  console.log(formatMessages(messages, request.verbose));

  const manifestEntries: ManifestEntry[] = [...records.entries()].map(([collection, recs]) => ({
    collection,
    count: recs.length,
    records: recs.map(record => record.id),
  }));
  console.log(formatMessages(formatStagedManifest(manifestEntries, source), request.verbose));

  if (request.verbose) {
    console.log(formatMessages([
      ...formatLoadSpecsDebug(source),
      ...formatLoadCoreMemoriesDebug(source),
    ], request.verbose));
  }
  return records;
}

async function writeInitRecords(
  request: SysInitRequest,
  protocol: TBCProtocol,
  records: Map<string, TBCRecord[]>
): Promise<void> {
  await writeRecordsToFsAndSqlite(request.rootDirectory, protocol, records);
}

async function performPostInitValidation(
  request: SysInitRequest,
  validateSource: string
): Promise<void> {
  console.log(formatMessages([{
    level: 'info',
    source: request.source || 'sys:init',
    code: 'VALIDATING',
    message: 'Validating again ...',
  }], request.verbose));

  const postValidation = await validateSystem(
    { rootDirectory: request.rootDirectory, verbose: request.verbose, source: validateSource },
    { sourceContext: validateSource, showProtocolDiscovery: false, profile: request.profile }
  );
  if (postValidation.success) return;

  const source = request.source || 'sys:init';
  console.log(formatMessages([{
    level: 'error',
    code: 'FAILED-INITIALIZE',
    source,
    message: 'Post-init validation failed',
    suggestion: 'Check validation audit for details.',
  }], request.verbose));
  throw new Error('Init failed: post-validation failed');
}

function renderInitSummary(
  request: SysInitRequest,
  identities: InitIdentities,
  source: string
): void {
  const identityMessages = formatIdentitySummary(
    request.companionName,
    identities.companionID,
    request.primeName,
    identities.primeID,
    identities.memoryMapID,
    packageJson.version,
    request.profile,
    source
  );
  console.log(formatMessages(identityMessages, request.verbose));
  console.log(formatMessages(
    formatNextSteps('Refresh indexes (tbc dex) and prepare interface hooks (tbc int)', source),
    request.verbose
  ));
}

export async function initSystem(request: SysInitRequest): Promise<void> {
  const source = request.source || 'sys:init';
  const validateSource = `${source}:validate`;
  const protocol = resolveProtocol(request.rootDirectory, request.profile);

  renderProtocolDiscovery(protocol, source, request.verbose);
  const preValidation = await performPreInitValidation(request, validateSource);
  if (preValidation.success) {
    const companionIdRecord = fetchRecord(request.rootDirectory, protocol.sysCollection, 'companion.id');
    const companionID = companionIdRecord?.content?.trim() || 'unknown';
    console.log(formatMessages([{
      level: 'error',
      code: 'OVERWRITE-GUARD',
      source,
      message: `has existing companion ${companionID}`,
      suggestion: 'Use "tbc sys upgrade" instead.',
    }], request.verbose));
    return;
  }

  const identities = await mintInitIdentities(source, request.verbose);
  const records = synthesizeInitRecords(request, protocol, identities, source);
  await writeInitRecords(request, protocol, records);
  await performPostInitValidation(request, validateSource);
  renderInitSummary(request, identities, source);
}

export async function upgradeSystem(request: SysUpgradeRequest): Promise<void> {
  const source = request.source || 'sys:upgrade';
  const validateSource = `${source}:validate`;
  const protocol = resolveProtocol(request.rootDirectory);
  const version = packageJson.version;

  // Protocol discovery at start (matching legacy)
  const protocolDiscoveryOutput: ProtocolDiscoveryOutput = {
    sysCollection: protocol.sysCollection,
    skillsCollection: protocol.skillsCollection,
    memCollection: protocol.memCollection,
    dexCollection: protocol.dexCollection,
    actCollection: protocol.actCollection,
    hasSqlite: protocol.hasSqlite,
  };
  const protocolMessages = formatProtocolDiscovery(protocolDiscoveryOutput, source);
  console.log(formatMessages(protocolMessages, request.verbose));

  const preValidation = await validateSystem(
    { rootDirectory: request.rootDirectory, verbose: request.verbose, source: validateSource },
    { sourceContext: validateSource, showProtocolDiscovery: false, profile: protocol.sysCollection.includes('next') ? 'next' : 'baseline' }
  );

  if (!preValidation.success) {
    const errorMessages: TBCMessage[] = [
      {
        level: 'error',
        code: 'OVERWRITE-GUARD',
        source,
        message: 'has no existing companion (not a valid TBC Root)',
        suggestion: 'Use "tbc sys init" instead.',
      },
    ];
    console.log(formatMessages(errorMessages, request.verbose));
    return;
  }

  // Checking first...
  const checkingMessages: TBCMessage[] = [
    {
      level: 'info',
      source,
      code: 'CHECKING',
      message: 'Checking first ...',
    },
  ];
  console.log(formatMessages(checkingMessages, request.verbose));

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
  const backupDir = `bak-${timestamp}`;

  const backupPaths = [
    protocol.sysCollection,
    `${protocol.sysCollection}/core`,
    `${protocol.sysCollection}/ext`,
    protocol.skillsCollection,
  ];

  // Detailed backup messages per collection
  for (const collection of backupPaths) {
    const sourceDir = join(request.rootDirectory, collection);
    const targetDir = join(request.rootDirectory, backupDir, collection);
    await copyDirectory(sourceDir, targetDir);

    // Count records in the source directory
    const { readdirSync, existsSync, statSync } = await import('node:fs');
    let recordCount = 0;
    if (existsSync(sourceDir)) {
      const entries = readdirSync(sourceDir);
      for (const entry of entries) {
        const fullPath = join(sourceDir, entry);
        if (statSync(fullPath).isFile()) {
          recordCount++;
        }
      }
    }

    const backupMessages: TBCMessage[] = [
      {
        level: 'debug',
        kind: 'structured',
        source,
        code: 'BACKUP',
        message: `Backed up ${recordCount} ${collection} record(s) into ${backupDir}/${collection}.`,
      },
    ];
    console.log(formatMessages(backupMessages, request.verbose));
  }

  await deleteDirectory(join(request.rootDirectory, `${protocol.sysCollection}/core`));
  await deleteDirectory(join(request.rootDirectory, `${protocol.skillsCollection}/core`));

  // Removed old sys and skill specifications
  const removedMessages: TBCMessage[] = [
    {
      level: 'info',
      source,
      code: 'REMOVED',
      message: 'Removed old sys and skill specifications.',
    },
  ];
  console.log(formatMessages(removedMessages, request.verbose));

  const coreRecords = synthesizeCoreSpecsAndSkills(protocol, ASSETS);
  const records = new Map<string, TBCRecord[]>();
  records.set(`${protocol.sysCollection}/core`, coreRecords.get(`${protocol.sysCollection}/core`) ?? []);
  records.set(`${protocol.skillsCollection}/core`, coreRecords.get(`${protocol.skillsCollection}/core`) ?? []);

  // Loaded TBC core assets
  const assetsMessages: TBCMessage[] = [
    {
      level: 'info',
      source,
      code: 'ASSETS',
      message: `Loaded TBC ${version} core assets (specs and skills).`,
    },
  ];
  console.log(formatMessages(assetsMessages, request.verbose));

  // Staged Records Manifest for sys/core and skills/core
  const manifestEntries: ManifestEntry[] = [];
  for (const [collection, recs] of records.entries()) {
    manifestEntries.push({
      collection,
      count: recs.length,
      records: recs.map(r => r.id),
    });
  }
  const manifestMessages = formatStagedManifest(manifestEntries, source);
  console.log(formatMessages(manifestMessages, request.verbose));

  await writeRecordsToFsAndSqlite(request.rootDirectory, protocol, records);

  // Validating again...
  const validatingMessages: TBCMessage[] = [
    {
      level: 'info',
      source,
      code: 'VALIDATING',
      message: 'Validating again ...',
    },
  ];
  console.log(formatMessages(validatingMessages, request.verbose));

  const postValidation = await validateSystem(
    { rootDirectory: request.rootDirectory, verbose: request.verbose, source: validateSource },
    { sourceContext: validateSource, showProtocolDiscovery: false, profile: protocol.sysCollection.includes('next') ? 'next' : 'baseline' }
  );

  // Fetch companion and prime records for identity summary
  const companionIdRecord = fetchRecord(request.rootDirectory, protocol.sysCollection, 'companion.id');
  const companionID = companionIdRecord?.content?.trim() || 'unknown';
  const primeIdRecord = fetchRecord(request.rootDirectory, protocol.sysCollection, 'prime.id');
  const primeID = primeIdRecord?.content?.trim() || 'unknown';

  // Fetch companion and prime names from mem
  const companionMemRecord = fetchRecord(request.rootDirectory, protocol.memCollection, companionID);
  const companionName = (companionMemRecord?.data?.record_title as string) || 'Unknown';
  const primeMemRecord = fetchRecord(request.rootDirectory, protocol.memCollection, primeID);
  const primeName = (primeMemRecord?.data?.record_title as string) || 'Unknown';

  // Fetch memoryMapID from root.md
  const rootRecord = fetchRecord(request.rootDirectory, protocol.sysCollection, 'root');
  const memoryMapID = (rootRecord?.data?.memory_map as string) || 'unknown';

  // Upgrade Complete with identity summary
  const upgradeCompleteMessages = formatUpgradeComplete(
    version,
    companionName,
    companionID,
    primeName,
    primeID,
    memoryMapID,
    source
  );
  console.log(formatMessages(upgradeCompleteMessages, request.verbose));

  // Next Steps
  const nextStepsMessages = formatNextSteps('Refresh indexes (tbc dex)', source);
  console.log(formatMessages(nextStepsMessages, request.verbose));
}
