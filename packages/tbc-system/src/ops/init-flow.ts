import assert from "assert";

import { Node } from "pocketflow";

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from "../types";
import packageJson from '../../package.json' with { type: 'json' };

interface FlowConfig {
    verbose?: boolean;
    rootDirectory?: string;
    companionName: string;
    primeName: string;
}

const FlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        rootDirectory: { type: "string" },
        companionName: { type: "string" },
        primeName: { type: "string" },
    },
    required: ["companionName", "primeName"],
};

class InitFlowStartNode extends HAMINode<Shared, FlowConfig> {
    constructor(config?: FlowConfig, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return "tbc-system:init-flow-start"
    }

    async post(shared: Record<string, any>, prepRes: unknown, execRes: unknown): Promise<string> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.stage.companionName = shared.companionName || this.config?.companionName;
        shared.stage.primeName = shared.primeName || this.config?.primeName;
        shared.system = shared.system || {};
        shared.stage.sysCollection = 'sys';
        shared.stage.skillsCollection = 'skills';
        shared.stage.dexCollection = 'dex';
        shared.stage.memCollection = 'mem';
        shared.stage.actCollection = 'act';
        return "default";
    }
}

export class InitFlow extends HAMIFlow<Record<string, any>, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new InitFlowStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-system:init-flow";
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema)
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
            targetPath = 'stage.activeDrafts'
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
                            content: data
                        };
                    });
                    // Set the drafts at the requested path (e.g., shared.stage.activeDrafts)
                    const pathParts = targetPath.split('.');
                    let current: any = shared;
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        current = current[pathParts[i]];
                    }
                    current[pathParts[pathParts.length - 1]] = drafts;
                }
            });
        };
        const abortSequence = new Node();
        abortSequence
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'error',
                        code: 'OVERWRITE-GUARD',
                        source: 'init-flow',
                        message: `has existing companion ${shared.system.companionID}`,
                        suggestion: 'Use "tbc sys upgrade" instead.',
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'))
        const branchToAbort = n('core:branch', {
            branch: (shared: Record<string, any>) => {
                if (shared.stage.validationResult.success) {
                    return 'abort';
                }
                return 'default';
            },
        });
        branchToAbort.on('abort', abortSequence)
        this.startNode
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-system:resolve-root-directory'))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'Checking first ...',
                    });
                }
            }))
            .next(n('tbc-system:validate-flow', {
                verbose: shared.stage.verbose,
                rootDirectory: shared.stage.rootDirectory,
            }))
            .next(branchToAbort)
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'no existing valid TBC root found, proceeding ...',
                    });
                }
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
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'Synthesized memory records.',
                    });
                }
            }))
            .next(n('tbc-system:load-system-assets'))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Loaded TBC ${packageJson.version} core assets (specs and skills).`,
                    });
                }
            }))
            .next(n('tbc-system:synthesize-sys-records'))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'Synthesized system records.',
                    });
                }
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
                recordProviders: ['tbc-record-fs:store-records'],
                sourcePath: 'stage.activeDrafts',
                collection: 'currentCollectionName',
                syncIndex: false,
            }))
            .next(stageRecords(shared.registry, s => `${s.stage.sysCollection}/core`))
            .next(n('tbc-write:write-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: ['tbc-record-fs:store-records'],
                sourcePath: 'stage.activeDrafts',
                collection: 'currentCollectionName',
                syncIndex: false,
            }))
            .next(stageRecords(shared.registry, s => `${s.stage.sysCollection}/ext`))
            .next(n('tbc-write:write-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: ['tbc-record-fs:store-records'],
                sourcePath: 'stage.activeDrafts',
                collection: 'currentCollectionName',
                syncIndex: false,
            }))
            .next(stageRecords(shared.registry, s => `${s.stage.skillsCollection}/core`))
            .next(n('tbc-write:write-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: ['tbc-record-fs:store-records'],
                sourcePath: 'stage.activeDrafts',
                collection: 'currentCollectionName',
                syncIndex: false,
            }))
            .next(stageRecords(shared.registry, s => `${s.stage.skillsCollection}/ext`))
            .next(n('tbc-write:write-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: ['tbc-record-fs:store-records'],
                sourcePath: 'stage.activeDrafts',
                collection: 'currentCollectionName',
                syncIndex: false,
            }))
            .next(stageRecords(shared.registry, s => s.stage.memCollection, 'stage.memDrafts'))
            .next(n('tbc-write:write-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: ['tbc-record-fs:store-records'],
                sourcePath: 'stage.memDrafts',
                collection: 'memCollection',
                syncIndex: true,
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'Validating again ...',
                    });
                }
            }))
            .next(n('tbc-system:validate-flow', {
                verbose: shared.stage.verbose,
                rootDirectory: shared.stage.rootDirectory,
            }))
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Companion: ${shared.system.companionRecord.record_title} [${shared.system.companionID}]`,
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Prime: ${shared.system.primeRecord.record_title} [${shared.system.primeID}]`,
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Map of Memories [${shared.system.memoryMapID}] initialized.`,
                    });
                    shared.stage.messages.push({
                        level: 'raw',
                        message: ' ┌┼───────────────────────────────────────────────────────────',
                    });
                    shared.stage.messages.push({
                        level: 'raw',
                        message: `[✓] Third Brain Companion ${packageJson.version} initialized.`,
                    });
                    shared.stage.messages.push({
                        level: 'raw',
                        message: ' └┼───────────────────────────────────────────────────────────',
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Next Steps`,
                        suggestion: 'Refresh indexes (tbc dex) and prepare interface hooks (tbc int)',
                    });

                }
            }))
            .next(n('tbc-dex:collate-digest', {
                output: { collection: 'dex', id: 'sys.digest.txt' },
                sources: [
                    { collection: 'sys', idGlob: 'root.md', },
                    { collection: 'sys/core', idGlob: '*.md', },
                    { collection: 'sys/ext', idGlob: '*.md', },
                ],
            }))
            .next(n('tbc-dex:collate-metadata-index', {
                output: { collection: 'dex', id: 'skills.jsonl' },
                sources: [
                    { collection: 'skills', idGlob: '*/SKILL.md' },
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
                }
            }))
            .next(n('tbc-record:store-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: ['tbc-record-fs:store-records'],
            }))
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Stored ${shared.record.records?.length} ${shared.record.collection} record(s).`,
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Digest: dex/sys.digest.txt`,
                        suggestion: `This file now contains the full context of your [sys], [sys/core], and [sys/ext] specifications.`
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Digest: dex/skills.jsonl`,
                        suggestion: `This file is index of all skill you can use for your goals.`
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            ;
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.stage.companionName = shared.companionName || this.config?.companionName;
        shared.stage.primeName = shared.primeName || this.config?.primeName;
        return super.run(shared);
    }

}
