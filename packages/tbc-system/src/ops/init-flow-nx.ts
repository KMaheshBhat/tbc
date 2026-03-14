import assert from 'node:assert';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import packageJson from '../../package.json' with { type: 'json' };
import { Shared } from '../types.js';
import { PROTOCOLS } from '../protocols.js';

interface Config {
    verbose?: boolean;
    rootDirectory?: string;
    profile?: string;
    companionName: string;
    primeName: string;
};

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        rootDirectory: { type: 'string' },
        profile: { type: 'string' },
        companionName: { type: 'string' },
        primeName: { type: 'string' },
    },
    required: ['companionName', 'primeName'],
};


class StartNode extends HAMINode<Shared, Config> {
    constructor(config?: Config, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return 'tbc-system:init-flow-start:nx';
    }

    async post(shared: Shared, prepRes: unknown, execRes: unknown): Promise<string> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.stage.requestedProfile = this.config?.profile || 'baseline';
        shared.stage.companionName = shared.companionName || this.config?.companionName;
        shared.stage.primeName = shared.primeName || this.config?.primeName;
        shared.system = shared.system || {};
        shared.system.protocol = PROTOCOLS[shared.stage.requestedProfile];
        assert(shared.system.protocol, `unknown profile requested: ${shared.stage.requestedProfile}`);
        return 'default';
    }
}

export class InitFlowNx extends HAMIFlow<Record<string, any>, Config> {
    startNode: Node;
    config: Config;

    constructor(config: Config) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-system:init-flow:nx';
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
                mutate: (s: Shared) => {
                    const collectionName = typeof sourceCollection === 'function'
                        ? sourceCollection(s)
                        : sourceCollection;
                    s.stage.currentCollectionName = collectionName;
                    const rawRecords = s.stage.records[collectionName] || {};
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
                    let current: any = s;
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        current = current[pathParts[i]];
                    }
                    current[pathParts[pathParts.length - 1]] = drafts;
                },
            });
        };
        const abortOverwriteGuardSequence = new Node();
        abortOverwriteGuardSequence
            .next(n('core:mutate', {
                mutate: (s: Record<string, any>) => {
                    s.stage.messages.push({
                        level: 'error',
                        code: 'OVERWRITE-GUARD',
                        source: 'init-flow',
                        message: `has existing companion ${s.system.companionID}`,
                        suggestion: 'Use "tbc sys upgrade" instead.',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
        const branchToAbortForOverwriteGuard = n('core:branch', {
            branch: (s: Record<string, any>) => {
                if (s.stage.validationResult.success) {
                    return 'abort';
                }
                return 'default';
            },
        });
        branchToAbortForOverwriteGuard.on('abort', abortOverwriteGuardSequence);
        const abortFailedInitializeSequence = new Node();
        abortFailedInitializeSequence
            .next(n('core:mutate', {
                mutate: (s: Record<string, any>) => {
                    s.stage.messages.push({
                        level: 'error',
                        code: 'FAILED-INITIALIZE',
                        source: 'init-flow',
                        message: `failed to initalize`,
                        suggestion: 'This indicates failure of the TBC tool.  Requires Developer intervention.',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
        const branchToAbortForFailedInitizalize = n('core:branch', {
            branch: (s: Record<string, any>) => {
                if (!s.stage.validationResult.success) {
                    return 'abort';
                }
                return 'default';
            },
        });
        branchToAbortForFailedInitizalize.on('abort', abortFailedInitializeSequence);
        this.startNode
            .next(n('tbc-system:resolve-flow:nx', { 
                verbose: this.config.verbose,
                rootDirectory: this.config.rootDirectory,
                resolveRootDirectory: true,
                resolveProtocol: false,
                resolveCollections: true,
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('core:mutate', {
                mutate: (s: Record<string, any>) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'Checking first ...',
                    });
                },
            }))
            .next(n('tbc-system:validate-flow:nx', {
                verbose: shared.stage.verbose,
                rootDirectory: shared.stage.rootDirectory,
            }))
            .next(branchToAbortForOverwriteGuard)
            .next(n('core:mutate', {
                mutate: (s: Record<string, any>) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `no existing valid TBC root found, proceeding (profile: ${s.stage.requestedProfile}) ...`,
                    });
                },
            }))
            .next(n('tbc-mint:mint-ids-flow', {
                requests: [
                    { type: 'tbc-mint:uuid-mint', 'key': 'companionID' },
                    { type: 'tbc-mint:uuid-mint', 'key': 'primeID' },
                    { type: 'tbc-mint:uuid-mint', 'key': 'memoryMapID' },
                ],
            }))
            .next(n('tbc-system:add-minted-messages', {
                source: 'init-flow',
                level: 'info',
            }))
            .next(n('tbc-system:synthesize-mem-records'))
            .next(n('core:mutate', {
                mutate: (s: Record<string, any>) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'Synthesized memory records.',
                    });
                },
            }))
            .next(n('tbc-system:load-system-assets'))
            .next(n('core:mutate', {
                mutate: (s: Record<string, any>) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Loaded TBC ${packageJson.version} core assets (specs and skills).`,
                    });
                },
            }))
            .next(n('tbc-system:synthesize-sys-records'))
            .next(n('core:mutate', {
                mutate: (s: Record<string, any>) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'Synthesized system records.',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('tbc-system:prepare-records-manifest'))
            .next(n('tbc-system:add-manifest-messages', {
                source: 'init-flow',
                level: 'info',
            }))
            .next(stageRecords(shared.registry, s => s.stage.sysCollection))
            .next(n('tbc-write:write-records-flow', {
                verbose: shared.stage.verbose,
                sourcePath: 'stage.activeDrafts',
                collection: 'currentCollectionName',
                protocolKey: 'sys',
                syncIndex: false,
            }))
            .next(stageRecords(shared.registry, s => `${s.stage.sysCollection}/core`))
            .next(n('tbc-write:write-records-flow', {
                verbose: shared.stage.verbose,
                sourcePath: 'stage.activeDrafts',
                collection: 'currentCollectionName',
                protocolKey: 'sys',
                syncIndex: false,
            }))
            .next(stageRecords(shared.registry, s => `${s.stage.sysCollection}/ext`))
            .next(n('tbc-write:write-records-flow', {
                verbose: shared.stage.verbose,
                sourcePath: 'stage.activeDrafts',
                collection: 'currentCollectionName',
                protocolKey: 'sys',
                syncIndex: false,
            }))
            .next(stageRecords(shared.registry, s => `${s.stage.skillsCollection}/core`))
            .next(n('tbc-write:write-records-flow', {
                verbose: shared.stage.verbose,
                sourcePath: 'stage.activeDrafts',
                collection: 'currentCollectionName',
                protocolKey: 'skills',
                syncIndex: false,
            }))
            .next(stageRecords(shared.registry, s => `${s.stage.skillsCollection}/ext`))
            .next(n('tbc-write:write-records-flow', {
                verbose: shared.stage.verbose,
                sourcePath: 'stage.activeDrafts',
                collection: 'currentCollectionName',
                protocolKey: 'skills',
                syncIndex: false,
            }))
            .next(stageRecords(shared.registry, s => s.stage.memCollection, 'stage.memDrafts'))
            .next(n('tbc-write:write-records-flow', {
                verbose: shared.stage.verbose,
                sourcePath: 'stage.memDrafts',
                collection: 'memCollection',
                protocolKey: 'mem',
                syncIndex: true,
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'Validating again ...',
                    });
                },
            }))
            .next(n('tbc-system:validate-flow:nx', {
                verbose: shared.stage.verbose,
                rootDirectory: shared.stage.rootDirectory,
            }))
            .next(branchToAbortForFailedInitizalize)
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Companion: ${s.system.companionRecord.record_title} [${s.system.companionID}]`,
                    });
                    s.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Prime: ${s.system.primeRecord.record_title} [${s.system.primeID}]`,
                    });
                    s.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Map of Memories [${s.system.memoryMapID}] initialized.`,
                    });
                    s.stage.messages.push({
                        level: 'info',
                        kind: 'raw',
                        message: ' ┌┼───────────────────────────────────────────────────────────',
                    });
                    s.stage.messages.push({
                        level: 'info',
                        kind: 'raw',
                        message: `[✓] Third Brain Companion ${packageJson.version} initialized. (PROFILE: ${s.stage.requestedProfile})`,
                    });
                    s.stage.messages.push({
                        level: 'info',
                        kind: 'raw',
                        message: ' └┼───────────────────────────────────────────────────────────',
                    });
                    s.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'Next Steps',
                        suggestion: 'Refresh indexes (tbc dex) and prepare interface hooks (tbc int)',
                    });
                },
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.record.records = undefined;
                    s.stage.synthesizeRequests = [
                        {
                            type: 'digest',
                            provider: 'tbc-system:synthesize-collation-digest',
                            meta: {
                                sources: [
                                    { collection: `${s.stage.sysCollection}`, idGlob: 'root.md' },
                                    { collection: `${s.stage.sysCollection}/core`, idGlob: '*.md' },
                                    { collection: `${s.stage.sysCollection}/ext`, idGlob: '*.md' },
                                ],
                                id: 'sys.digest.txt',
                            },
                        },
                        {
                            type: 'metadata-index',
                            provider: 'tbc-system:synthesize-collation-metadata',
                            meta: {
                                sources: [
                                    { collection: `${s.stage.skillsCollection}`, 'idGlob': '*/SKILL.md' },
                                ],
                                id: 'skills.jsonl',
                            },
                        },
                    ];
                },
            }))
            .next(n('tbc-synthesize:synthesize-record-flow', {
                requestsKey: 'synthesizeRequests',
            }))
            .next(n('tbc-write:write-records-flow', {
                verbose: this.config?.verbose,
                sourcePath: 'record.records',
                collection: 'dexCollection',
                protocolKey: 'dex',
                syncIndex: false,
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Stored ${s.record.records?.length} ${s.record.collection} record(s).`,
                    });
                    s.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Digest: ${s.stage.dexCollection}/sys.digest.txt`,
                        suggestion: 'This file now contains the full context of your [sys], [sys/core], and [sys/ext] specifications.',
                    });
                    s.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Digest: ${s.stage.dexCollection}/skills.jsonl`,
                        suggestion: 'This file is index of all skill you can use for your goals.',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
    }

    async run(shared: Shared): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.stage.requestedProfile = this.config?.profile || 'baseline';
        shared.stage.companionName = shared.companionName || this.config?.companionName;
        shared.stage.primeName = shared.primeName || this.config?.primeName;
        return super.run(shared);
    }

}
