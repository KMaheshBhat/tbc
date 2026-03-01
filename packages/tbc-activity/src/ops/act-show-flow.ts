import assert from 'node:assert';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types';

interface FlowConfig {
    verbose: boolean;
    rootDirectory?: string;
}

const FlowConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        rootDirectory: { type: 'string' },
    },
};

class ActShowFlowStartNode extends HAMINode<Shared, FlowConfig> {
    kind(): string {
        return 'tbc-activity:act-show-flow-start';
    }

    async post(shared: Shared): Promise<string> {
        shared.stage = shared.stage || {};
        shared.system = shared.system || {};
        shared.stage.verbose = shared.stage.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.stage.rootDirectory || this.config?.rootDirectory;
        shared.stage.currentActivityCollection = 'act/current';
        shared.stage.backlogActivityCollection = 'act/backlog';
        shared.stage.queryRecursive = {
            type: 'list-all-ids',
            recursive: true,
        };
        return 'default';
    }
}

export class ActShowFlow extends HAMIFlow<Shared, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new ActShowFlowStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-activity:act-show-flow';
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // --- System Guard & Setup ---
        const abortSequence = new Node().next(n('core:mutate', { /* ... */ })).next(n('tbc-system:log-and-clear-messages'));
        const branchToAbort = n('core:branch', { branch: (s: Shared) => s.stage.validationResult?.success ? 'default' : 'abort' });
        branchToAbort.on('abort', abortSequence);

        let tail = this.startNode
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-system:resolve-root-directory'))
            .next(n('tbc-system:validate-flow', {
                verbose: this.config?.verbose,
                rootDirectory: this.config?.rootDirectory,
                resolveProtocol: true,
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    const actCollectionRoot = s.system.protocol.act.collection ?? 'act';
                    shared.stage.currentActivityCollection = `${actCollectionRoot}/current`;
                    shared.stage.backlogActivityCollection = `${actCollectionRoot}/backlog`;
                },
            }))
            .next(branchToAbort);

        // --- The Pattern: Loop through Collections ---
        const collections = [
            'stage.currentActivityCollection',
            'stage.backlogActivityCollection',
        ];

        for (const collectionPath of collections) {
            tail = tail
                .next(n('core:mutate', {
                    mutate: (s: Shared) => {
                        // Clear previous results to avoid pollution
                        s.record.result = undefined;
                        s.stage.records = undefined;
                    },
                }))
                .next(n('core:assign', {
                    'record.rootDirectory': 'system.rootDirectory',
                    'record.collection': collectionPath,
                    'record.query': 'stage.queryRecursive',
                }))
                .next(n('tbc-record:query-records-flow', {
                    recordProviders: ['tbc-record-fs:query-records'],
                    verbose: shared.stage.verbose,
                }))
                .next(n('core:assign', {
                    'record.rootDirectory': 'system.rootDirectory',
                    'record.collection': collectionPath,
                    'record.IDs': 'record.result.IDs',
                }))
                .next(n('tbc-record:fetch-records-flow', {
                    recordProviders: ['tbc-record-fs:fetch-records'],
                    verbose: shared.stage.verbose,
                }))
                .next(n('core:mutate', {
                    mutate: (s: Shared) => {
                        s.stage.loaded = s.stage.loaded || {};
                        const colName = collectionPath.split('.').pop()!;
                        const resolvedCollection = s.stage[colName];
                        const records = s.record.result?.records?.[resolvedCollection];
                        if (records) {
                            s.stage.loaded[resolvedCollection] = records;
                        }
                    },
                }));
        }

        // --- Unified Formatter ---
        tail = tail
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    const source = 'act-show-flow';
                    const groups = [
                        { path: s.stage.currentActivityCollection, label: 'Active [current]', empty: 'No active activities found.' },
                        { path: s.stage.backlogActivityCollection, label: 'Paused [backlog]', empty: 'No paused activities found.' },
                    ];

                    for (const group of groups) {
                        const records = s.stage.loaded?.[group.path] || {};
                        const entries = Object.entries(records);

                        s.stage.messages.push({ level: 'raw', source, message: ` ┌┤ ${group.label} ├────────────────────────────────────────` });

                        if (entries.length === 0) {
                            s.stage.messages.push({ level: 'info', source, message: `(${group.empty})` });
                        } else {
                            for (const [path, record] of entries) {
                                const r = record as any;

                                // 1. Split path into parts (e.g., ["019c...", "019c...md"])
                                const parts = path.split('/');
                                if (parts.length < 2) continue; // Safety check

                                const folderId = parts[0];
                                const fileNameWithExt = parts[parts.length - 1];
                                const fileName = fileNameWithExt.replace('.md', '');

                                // 2. THE FILTER: The identity file MUST match the folder name
                                if (folderId !== fileName) continue;

                                const title = r.record_title || r.title || 'Untitled Activity';

                                s.stage.messages.push({
                                    level: 'info',
                                    source,
                                    message: title,
                                    suggestion: `Found at ${group.path}:${folderId}/${fileNameWithExt}`,
                                });
                            }
                        }
                        s.stage.messages.push({ level: 'raw', source, message: ' └────────────────────────────────────────────────────────────' });
                    }
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        return { valid: result.isValid, errors: result.errors || [] };
    }

    async run(shared: Shared): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        return super.run(shared);
    }
}
