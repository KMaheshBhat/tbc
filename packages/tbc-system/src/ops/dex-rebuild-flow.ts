import assert from 'node:assert';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import packageJson from '../../package.json' with { type: 'json' };
import { Shared } from '../types.js';

interface FlowConfig {
    rootDirectory?: string;
    verbose: boolean;
}

const FlowConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        root: { type: 'string' },
        verbose: { type: 'boolean' },
    },
    required: ['verbose'],
};

class DexRebuildStartNode extends HAMINode<Shared, FlowConfig> {
    constructor(config?: FlowConfig, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return 'tbc-system:dex-rebuild-flow-start';
    }

    async post(shared: Record<string, any>, prepRes: unknown, execRes: unknown): Promise<string> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.system = shared.system || {};
        shared.stage.query = {
            type: 'list-all-ids',
        };
        shared.stage.sysCollection = 'sys';
        shared.stage.skillsCollection = 'skills';
        shared.stage.dexCollection = 'dex';
        shared.stage.memCollection = 'mem';
        shared.stage.actCollection = 'act';
        const timestamp = (new Date()).toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
        shared.stage.backupCollection = `bak-${timestamp}`;
        return 'default';
    }
}

export class DexRebuildFlow extends HAMIFlow<Record<string, any>, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new DexRebuildStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-system:dex-rebuild-flow';
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        const abortSequence = new Node();
        abortSequence
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'error',
                        code: 'OVERWRITE-GUARD',
                        source: 'dex-rebuild-flow',
                        message: 'has no existing companion (not a valid TBC Root)',
                        suggestion: 'Can only be run on a valid TBC Root. (Use "tbc sys init" for new Companion).',
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
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-system:resolve-root-directory'))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'dex-rebuild-flow',
                        message: 'Checking first ...',
                    });
                },
            }))
            .next(n('tbc-system:validate-flow', {
                verbose: shared.stage.verbose,
                rootDirectory: shared.stage.rootDirectory,
            }))
            .next(branchToAbort)
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'dex-upgrade-flow',
                        message: 'existing valid TBC root found, proceeding ...',
                    });
                    shared.stage.records['mem'] = undefined; // Clear memories from vaildation
                },
            }))
            .next(n('core:assign', { // and reload all records
                'record.rootDirectory': 'system.rootDirectory',
                'record.collection': 'stage.memCollection',
                'record.query': 'stage.query',
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: ['tbc-record-fs:query-records'],
                verbose: shared.stage.verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: shared.stage.verbose,
            }))
            .next(n('core:assign', {
                'record.rootDirectory': 'system.rootDirectory',
                'record.collection': 'stage.memCollection',
                'record.query': 'stage.query',
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'debug',
                        source: 'validate-flow',
                        message: `Query (${JSON.stringify(shared.record.query)}) and load from ${shared.record.collection}`,
                    });
                },
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: ['tbc-record-fs:query-records'],
                verbose: shared.stage.verbose,
            }))
            .next(n('tbc-system:prepare-records-manifest'))
            .next(n('tbc-system:add-manifest-messages', {
                source: 'dex-upgrade-flow',
                level: 'info',
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('tbc-dex:collate-digest', {
                output: { collection: 'dex', id: 'sys.digest.txt' },
                sources: [
                    { collection: 'sys', idGlob: 'root.md' },
                    { collection: 'sys/core', idGlob: '*.md' },
                    { collection: 'sys/ext', idGlob: '*.md' },
                ],
            }))
            .next(n('tbc-dex:collate-metadata-index', {
                output: { collection: 'dex', id: 'skills.jsonl' },
                sources: [
                    { collection: 'skills', idGlob: '*/SKILL.md' },
                ],
            }))
            .next(n('tbc-dex:collate-metadata-index', {
                output: { collection: 'dex', id: 'memory.jsonl' },
                sources: [
                    { collection: 'mem', idGlob: '*', partitionKey: 'record_type' },
                ],
            }))
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    shared.record = shared.record || {};
                    shared.record.rootDirectory = shared.stage.rootDirectory;
                    shared.record.collection = shared.stage.dexCollection;
                    shared.record.records = [];
                    const dexRecords = shared.stage.dex?.records || {};
                    for (const [id, record] of Object.entries(dexRecords)) {
                        shared.record.records.push({
                            ...(record as any),
                            id: id,
                        });
                    }
                },
            }))
            .next(n('tbc-record:store-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: ['tbc-record-fs:store-records'],
            }))
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'dex-rebuild-flow',
                        message: `Stored ${shared.record.records?.length} ${shared.record.collection} record(s).`,
                    });
                },
            }))
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    shared.stage.messages.push({
                        level: 'info',
                        kind: 'raw',
                        message: ' ┌┼───────────────────────────────────────────────────────────',
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        kind: 'raw',
                        message: `[✓] System Index (Dex) Rebuilt: ${packageJson.version}`,
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        kind: 'raw',
                        message: ' └┼───────────────────────────────────────────────────────────',
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'dex-rebuild-flow',
                        message: 'Digest: dex/sys.digest.txt',
                        suggestion: 'This file now contains the full context of your [sys], [sys/core], and [sys/ext] specifications.',
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'dex-rebuild-flow',
                        message: 'Digest: dex/skills.jsonl',
                        suggestion: 'This file is index of all skill you can use for your goals.',
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'dex-rebuild-flow',
                        message: 'Digest: dex/*.memory.jsonl',
                        suggestion: 'These files is index of all your memory records partitioined by record_type.',
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
