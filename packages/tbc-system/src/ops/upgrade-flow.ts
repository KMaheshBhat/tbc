import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import packageJson from '../../package.json' with { type: 'json' };
import { Shared } from '../types.js';
import { PROTOCOLS } from '../protocols.js';

interface Config {
    rootDirectory?: string;
    verbose: boolean;
};

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        root: { type: 'string' },
        verbose: { type: 'boolean' },
    },
    required: ['verbose'],
};

class StartNode extends HAMINode<Shared, Config> {
    constructor(config?: Config, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return 'tbc-system:upgrade-flow-start';
    }

    async post(shared: Record<string, any>, prepRes: unknown, execRes: unknown): Promise<string> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.system = shared.system || {};
        shared.system.protocol = shared.system.protocol || PROTOCOLS['baseline'];
        shared.stage.queryRecursive = {
            type: 'list-all-ids',
            recursive: true,
        };
        const timestamp = (new Date()).toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
        shared.stage.backupCollection = `bak-${timestamp}`;
        return 'default';
    }
}

export class UpgradeFlow extends HAMIFlow<Record<string, any>, Config> {
    startNode: Node;
    config: Config;

    constructor(config: Config) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-system:upgrade-flow';
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        /**
         * Creates a mutation node that prepares an array of drafts from a staged collection.
         * It automatically wraps raw strings into { id, content } objects.
         */
        const stageRecords = (
            registry: any,
            sourceCollection: string | ((s: Shared) => string),
            targetPath = 'stage.activeDrafts',
        ) => {
            return registry.createNode('core:mutate', {
                mutate: (shared: Shared) => {
                    const collectionName = typeof sourceCollection === 'function'
                        ? sourceCollection(shared)
                        : sourceCollection;
                    shared.stage.currentCollectionName = collectionName;
                    const rawRecords = shared.stage.records[collectionName] || {};
                    const drafts = Object.entries(rawRecords).map(([id, data]) => {
                        // If it's already an object (like memDrafts), pass it through
                        if (typeof data === 'object' && data !== null) return data;
                        // If it's a string (like sys/core or skills/core), wrap it
                        return {
                            id: id,
                            content: data,
                        };
                    });
                    // Set the drafts at the requested path (e.g., shared.stage.activeDrafts)
                    const pathParts = targetPath.split('.');
                    let current: any = shared;
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        current = current[pathParts[i]];
                    }
                    current[pathParts[pathParts.length - 1]] = drafts;
                },
            });
        };
        const abortSequence = new Node();
        abortSequence
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'error',
                        code: 'OVERWRITE-GUARD',
                        source: 'upgrade-flow',
                        message: 'has no existing companion (not a valid TBC Root)',
                        suggestion: 'Use "tbc sys init" instead.',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
        const branchToAbort = n('core:branch', {
            branch: (shared: Record<string, any>) => {
                if (!shared.stage.validationResult.success) {
                    return 'abort';
                }
                return 'default';
            },
        });
        branchToAbort.on('abort', abortSequence);
        this.startNode
            .next(n('tbc-system:resolve-flow', { 
                verbose: this.config.verbose,
                rootDirectory: this.config.rootDirectory,
                resolveRootDirectory: true,
                resolveProtocol: true,
                resolveCollections: true,
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'upgrade-flow',
                        message: 'Checking first ...',
                    });
                },
            }))
            .next(n('tbc-system:validate-flow', {
                verbose: shared.stage.verbose,
                rootDirectory: shared.stage.rootDirectory,
                resolve: {
                    resolveRootDirectory: true,
                    resolveProtocol: true,
                    resolveCollections: true,
                },
            }))
            .next(branchToAbort)
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'upgrade-flow',
                        message: 'existing valid TBC root found, proceeding ...',
                    });
                },
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.record.rootDirectory = shared.system.rootDirectory;
                    shared.record.collection = `${shared.stage.backupCollection}/${shared.stage.sysCollection}`;
                    shared.record.records = [];
                    for (const [id, record] of Object.entries(shared.stage.records[shared.stage.sysCollection])) {
                        shared.record.records.push(record);
                    }
                },
            }))
            .next(n('tbc-record:store-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: [{
                    id: 'tbc-record-fs:store-records',
                    config: { eagerIndex: false },
                }],
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'upgrade-flow',
                        message: `Backed up ${shared.record.records.length} ${shared.stage.sysCollection} record(s) into ${shared.record.collection}.`,
                    });
                },
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.record.rootDirectory = shared.system.rootDirectory;
                    shared.record.collection = `${shared.stage.backupCollection}/${shared.stage.sysCollection}/core`;
                    shared.record.records = [];
                    for (const [id, record] of Object.entries(shared.stage.records[`${shared.stage.sysCollection}/core`])) {
                        shared.record.records.push(record);
                    }
                },
            }))
            .next(n('tbc-record:store-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: [{
                    id: 'tbc-record-fs:store-records',
                    config: { eagerIndex: false },
                }],
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'upgrade-flow',
                        message: `Backed up ${shared.record.records.length} ${shared.stage.sysCollection}/core record(s) into ${shared.record.collection}.`,
                    });
                },
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.record.rootDirectory = shared.system.rootDirectory;
                    shared.record.collection = `${shared.stage.backupCollection}/${shared.stage.sysCollection}/ext`;
                    shared.record.records = [];
                    for (const [id, record] of Object.entries(shared.stage.records[`${shared.stage.sysCollection}/ext`])) {
                        shared.record.records.push(record);
                    }
                },
            }))
            .next(n('tbc-record:store-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: [{
                    id: 'tbc-record-fs:store-records',
                    config: { eagerIndex: false },
                }],
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'upgrade-flow',
                        message: `Backed up ${shared.record.records.length} ${shared.stage.sysCollection}/ext record(s) into ${shared.record.collection}.`,
                    });
                },
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.record.rootDirectory = shared.system.rootDirectory;
                    shared.record.collection = `${shared.stage.backupCollection}/${shared.stage.skillsCollection}`;
                    shared.record.records = [];
                    for (const [id, content] of Object.entries(shared.stage.records[`${shared.stage.skillsCollection}`])) {
                        shared.record.records.push({
                            ...Object(content),
                        });
                    }
                },
            }))
            .next(n('tbc-record:store-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: [{
                    id: 'tbc-record-fs:store-records',
                    config: { eagerIndex: false },
                }],
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'upgrade-flow',
                        message: `Backed up ${shared.record.records.length} ${shared.stage.skillsCollection} record(s) into ${shared.record.collection}.`,
                    });
                },
            }))
            .next(new DeleteDirectoryNode({ specDirectoryKey: 'sysCollection', collection: 'core' }))
            .next(new DeleteDirectoryNode({ specDirectoryKey: 'skillsCollection', collection: 'core' }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'upgrade-flow',
                        message: 'Removed old sys and skill specifications.',
                    });
                },
            }))
            .next(n('tbc-system:load-system-assets'))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Loaded TBC ${packageJson.version} core assets (specs and skills).`,
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('tbc-system:prepare-records-manifest'))
            .next(n('tbc-system:add-manifest-messages', {
                source: 'init-flow',
                level: 'info',
            }))
            .next(stageRecords(shared.registry, s => `${s.stage.sysCollection}/core`))
            .next(n('tbc-system:write-records-flow', {
                verbose: shared.stage.verbose,
                sourcePath: 'stage.activeDrafts',
                collection: 'currentCollectionName',
                protocolKey: 'sys',
            }))
            .next(stageRecords(shared.registry, s => `${s.stage.skillsCollection}/core`))
            .next(n('tbc-system:write-records-flow', {
                verbose: shared.stage.verbose,
                sourcePath: 'stage.activeDrafts',
                collection: 'currentCollectionName',
                protocolKey: 'skills',
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'upgrade-flow',
                        message: 'Validating again ...',
                    });
                },
            }))
            .next(n('tbc-system:validate-flow', {
                verbose: shared.stage.verbose,
                rootDirectory: shared.stage.rootDirectory,
                resolve: {
                    resolveRootDirectory: false,
                    resolveProtocol: false,
                    resolveCollections: false,
                },
            }))
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'upgrade-flow',
                        message: `Companion: ${shared.system.companionRecord.record_title} [${shared.system.companionID}]`,
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'upgrade-flow',
                        message: `Prime: ${shared.system.primeRecord.record_title} [${shared.system.primeID}]`,
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'upgrade-flow',
                        message: `Map of Memories: [${shared.system.memoryMapID}]`,
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        kind: 'raw',
                        message: ' ┌┼───────────────────────────────────────────────────────────',
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        kind: 'raw',
                        message: `[✓] Third Brain Companion upgraded to ${packageJson.version}.`,
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        kind: 'raw',
                        message: ' └┼───────────────────────────────────────────────────────────',
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'upgrade-flow',
                        message: 'Next Steps',
                        suggestion: 'Refresh indexes (tbc dex)',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        return super.run(shared);
    }
}

interface RemoveSpecsConfig {
    specDirectoryKey: string;
    collection: string;
};

class DeleteDirectoryNode extends HAMINode<Shared, RemoveSpecsConfig> {
    constructor(config?: RemoveSpecsConfig, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return 'tbc-system:delete-directory';
    }

    async prep(shared: Shared): Promise<[string, string]> {
        assert(this.config?.specDirectoryKey, 'must be configured with specDirectoryKey');
        return [shared.stage.rootDirectory, shared.stage[this.config?.specDirectoryKey]];
    }

    async exec(paths: [string, string]): Promise<void> {
        assert(this.config?.collection, 'must be configured with (sub)collection');
        const [rootDirectory, specDirectory] = paths;
        const path = join(rootDirectory, specDirectory, this.config.collection);
        if (existsSync(path)) {
            await rm(path, { recursive: true, force: true });
        }
    }

}
