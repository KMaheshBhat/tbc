import { resolveProtocol } from '../lib/protocol.js';
import { runValidationChecks } from '../lib/validator.js';
import { storeRecord, fetchRecord, deleteDirectory, type TBCRecord } from '../lib/fs.js';
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
} from '../lib/console.js';
import { join } from 'node:path';
import matter from 'gray-matter';
import { existsSync, readFileSync } from 'node:fs';
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

async function copyDirectory(source: string, target: string): Promise<void> {
  const { mkdirSync, copyFileSync, readdirSync, statSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');

  if (!existsSync(source)) return;

  mkdirSync(target, { recursive: true });
  const entries = readdirSync(source);

  for (const entry of entries) {
    const srcPath = join(source, entry);
    const tgtPath = join(target, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      await copyDirectory(srcPath, tgtPath);
    } else {
      copyFileSync(srcPath, tgtPath);
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
  }

  // Debug messages for verbose mode (matching legacy behavior)
  if (request.verbose) {
    const debugMessages = [
      ...formatLoadSpecsDebug(source),
      ...formatLoadCoreMemoriesDebug(source),
    ];
    console.log(formatMessages(debugMessages, request.verbose));
  }

  const validationResult = runValidationChecks(request.rootDirectory, protocol, source);

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

  console.log(formatMessages(auditMessages, request.verbose));

  return validationResult;
}

export async function initSystem(request: SysInitRequest): Promise<void> {
  const source = request.source || 'sys:init';
  const validateSource = `${source}:validate`;
  const protocol = resolveProtocol(request.rootDirectory, request.profile);

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
    { sourceContext: validateSource, showProtocolDiscovery: false, profile: request.profile }
  );

  if (preValidation.success) {
    const companionIdRecord = fetchRecord(request.rootDirectory, protocol.sysCollection, 'companion.id');
    const companionID = companionIdRecord?.content?.trim() || 'unknown';

    const errorMessages: TBCMessage[] = [
      {
        level: 'error',
        code: 'OVERWRITE-GUARD',
        source,
        message: `has existing companion ${companionID}`,
        suggestion: 'Use "tbc sys upgrade" instead.',
      },
    ];
    console.log(formatMessages(errorMessages, request.verbose));
    return;
  }

  const uuids = await mintUuids(3);
  const [companionID, primeID, memoryMapID] = uuids;

  const mintedOutput: MintedOutput = {
    keys: {
      companionID,
      primeID,
      memoryMapID,
    },
    batch: [],
  };
  const mintedMessages = formatMintedIds(mintedOutput, source);
  console.log(formatMessages(mintedMessages, request.verbose));

  const version = packageJson.version;
  const now = new Date().toISOString();

  const records = new Map<string, TBCRecord[]>();

  const memCollection = protocol.memCollection;

  const companionRecord: TBCRecord = {
    id: companionID,
    record_type: 'party',
    data: {
      id: companionID,
      record_type: 'party',
      party_type: 'agent',
      record_title: request.companionName,
      record_create_date: now,
    },
    content: `# ${request.companionName}\n\nCompanion Agent for the Third Brain Companion system.`,
  };

  const primeRecord: TBCRecord = {
    id: primeID,
    record_type: 'party',
    data: {
      id: primeID,
      record_type: 'party',
      party_type: 'person',
      record_title: request.primeName,
      record_create_date: now,
    },
    content: `# ${request.primeName}\n\nPrime User for the Third Brain Companion system.`,
  };

  const memoryMapRecord: TBCRecord = {
    id: memoryMapID,
    record_type: 'structure',
    data: {
      id: memoryMapID,
      record_type: 'structure',
      record_title: 'Map of Memories',
      record_create_date: now,
    },
    content: `# Map of Memories\n\nRoot structure record for the memory vault.`,
  };

  records.set(memCollection, [companionRecord, primeRecord, memoryMapRecord]);

  const companionIdRecord: TBCRecord = {
    id: 'companion.id',
    record_type: 'system',
    data: { id: 'companion.id', record_type: 'system' },
    content: companionID,
  };

  const primeIdRecord: TBCRecord = {
    id: 'prime.id',
    record_type: 'system',
    data: { id: 'prime.id', record_type: 'system' },
    content: primeID,
  };

  records.set(protocol.sysCollection, [companionIdRecord, primeIdRecord]);

  const rootTemplate = ASSETS['templates/root.md'];
  const rootContent = rootTemplate
    .replace(/\{\{companionName\}\}/g, request.companionName)
    .replace(/\{\{primeName\}\}/g, request.primeName)
    .replace(/\{\{companionID\}\}/g, companionID)
    .replace(/\{\{primeID\}\}/g, primeID)
    .replace(/\{\{memoryMapID\}\}/g, memoryMapID);

  const rootRecord: TBCRecord = {
    id: 'root',
    record_type: 'system',
    data: {
      id: 'root',
      record_type: 'system',
      companion: companionID,
      prime: primeID,
      system_path: protocol.sysCollection,
      skills_path: protocol.skillsCollection,
      memory_path: protocol.memCollection,
      memory_map: memoryMapID,
      view_path: protocol.dexCollection,
      activity_path: protocol.actCollection,
      record_create_date: now,
    },
    content: rootContent,
  };

  records.set(protocol.sysCollection, [...(records.get(protocol.sysCollection) || []), rootRecord]);

  const sysCoreRecord: TBCRecord = {
    id: '20251228150423',
    record_type: 'specification',
    data: {
      id: '20251228150423',
      record_type: 'specification',
      specification_name: 'tbc-system-spec',
      record_title: 'Third Brain Companion System Specification 0.4',
      record_create_date: '2025-12-28 15:04:23 UTC',
      record_tags: ['c/public/tbc'],
    },
    content: ASSETS['sys/core/20251228150423.md'].split('---\n').slice(2).join('---\n'),
  };

  records.set(`${protocol.sysCollection}/core`, [sysCoreRecord]);

  records.set(`${protocol.sysCollection}/ext`, [
    {
      id: '.gitkeep',
      record_type: 'placeholder',
      data: {},
      content: '',
    },
  ]);

  const skillRecords: TBCRecord[] = [];
  for (const skillName of [
    'tbc-act-ops',
    'tbc-dex-ops',
    'tbc-env-probe',
    'tbc-int-ops',
    'tbc-mem-ops',
    'tbc-sys-ops',
  ]) {
    const assetKey = `skills/core/${skillName}/SKILL.md`;
    const content = ASSETS[assetKey];
    if (content) {
      const parsed = matter(content);
      skillRecords.push({
        id: skillName,
        record_type: 'specification',
        data: parsed.data,
        content: parsed.content,
      });
    }
  }

  records.set(`${protocol.skillsCollection}/core`, skillRecords);

  records.set(`${protocol.skillsCollection}/ext`, [
    {
      id: '.gitkeep',
      record_type: 'placeholder',
      data: {},
      content: '',
    },
  ]);

  // Synthesized memory records
  const memMessages: TBCMessage[] = [
    {
      level: 'info',
      source,
      code: 'SYNTHESIZED',
      message: 'Synthesized memory records.',
    },
  ];
  console.log(formatMessages(memMessages, request.verbose));

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

  // Synthesized system records
  const sysMessages: TBCMessage[] = [
    {
      level: 'info',
      source,
      code: 'SYNTHESIZED',
      message: 'Synthesized system records.',
    },
  ];
  console.log(formatMessages(sysMessages, request.verbose));

  // Staged Records Manifest
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

  // Debug messages for verbose mode
  if (request.verbose) {
    const debugMessages = [
      ...formatLoadSpecsDebug(source),
      ...formatLoadCoreMemoriesDebug(source),
    ];
    console.log(formatMessages(debugMessages, request.verbose));
  }

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
    { sourceContext: validateSource, showProtocolDiscovery: false, profile: request.profile }
  );

  if (!postValidation.success) {
    const errorMessages: TBCMessage[] = [
      {
        level: 'error',
        code: 'FAILED-INITIALIZE',
        source,
        message: 'Post-init validation failed',
        suggestion: 'Check validation audit for details.',
      },
    ];
    console.log(formatMessages(errorMessages, request.verbose));
    throw new Error('Init failed: post-validation failed');
  }

  // Identity Summary
  const identityMessages = formatIdentitySummary(
    request.companionName,
    companionID,
    request.primeName,
    primeID,
    memoryMapID,
    version,
    request.profile,
    source
  );
  console.log(formatMessages(identityMessages, request.verbose));

  // Next Steps
  const nextStepsMessages = formatNextSteps('Refresh indexes (tbc dex) and prepare interface hooks (tbc int)', source);
  console.log(formatMessages(nextStepsMessages, request.verbose));
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

  const records = new Map<string, TBCRecord[]>();

  const sysCoreRecord: TBCRecord = {
    id: '20251228150423',
    record_type: 'specification',
    data: {
      id: '20251228150423',
      record_type: 'specification',
      specification_name: 'tbc-system-spec',
      record_title: 'Third Brain Companion System Specification 0.4',
      record_create_date: '2025-12-28 15:04:23 UTC',
      record_tags: ['c/public/tbc'],
    },
    content: ASSETS['sys/core/20251228150423.md'].split('---\n').slice(2).join('---\n'),
  };

  records.set(`${protocol.sysCollection}/core`, [sysCoreRecord]);

  const skillRecords: TBCRecord[] = [];
  for (const skillName of [
    'tbc-act-ops',
    'tbc-dex-ops',
    'tbc-env-probe',
    'tbc-int-ops',
    'tbc-mem-ops',
    'tbc-sys-ops',
  ]) {
    const assetKey = `skills/core/${skillName}/SKILL.md`;
    const content = ASSETS[assetKey];
    if (content) {
      const parsed = matter(content);
      skillRecords.push({
        id: skillName,
        record_type: 'specification',
        data: parsed.data,
        content: parsed.content,
      });
    }
  }

  records.set(`${protocol.skillsCollection}/core`, skillRecords);

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
