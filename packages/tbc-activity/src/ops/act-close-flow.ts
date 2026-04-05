import assert from 'node:assert';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types';

interface Config {
    verbose?: boolean;
    rootDirectory?: string;
    activityId: string;
}

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        rootDirectory: { type: 'string' },
        activityId: { type: 'string' },
    },
    required: ['activityId'],
};

class StartNode extends HAMINode<Shared, Config> {
    kind(): string {
        return 'tbc-activity:act-close-flow-start';
    }

    async post(shared: Shared): Promise<string> {
        shared.stage = shared.stage || {};
        shared.system = shared.system || {};
        shared.stage.verbose = shared.stage.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.stage.rootDirectory || this.config?.rootDirectory;
        shared.stage.activityId = shared.stage.activityId || this.config?.activityId;
        shared.stage.currentActivityCollection = 'act/current';
        shared.stage.backlogActivityCollection = 'act/backlog';
        shared.stage.memCollection = 'mem';
        shared.stage.query = {
            type: 'list-all-ids',
        };
        return 'default';
    }
}

export class ActCloseFlow extends HAMIFlow<Shared, Config> {
    startNode: Node;
    config: Config;

    constructor(config: Config) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-activity:act-close-flow';
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        // --- ABORT SEQUENCE: System Guard ---
        const abortSequence = new Node();
        abortSequence
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'error',
                        code: 'OVERWRITE-GUARD',
                        source: 'act-close-flow',
                        message: `has no existing companion (not a valid TBC Root)`,
                        suggestion: 'Use "tbc sys init" instead.',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
        const branchToAbort = n('core:branch', {
            branch: (s: Shared) => s.stage.validationResult?.success ? 'default' : 'abort',
        });
        branchToAbort.on('abort', abortSequence);
        const abortOnMissingActivity = new Node();
        abortOnMissingActivity
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'error',
                        source: 'act-close-flow',
                        code: 'ACTIVITY-NOT-FOUND',
                        message: `Activity ${s.stage.activityId} not found in current workspace.`,
                        suggestion: 'Verify the ID with "tbc act show" or check if it is already in the backlog/archive.',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
        const branchOnMissingActivity = n('core:branch', {
            branch: (s: Shared) => {
                const actCollectionRoot = s.system.protocol.act.collection ?? 'act';
                const actPath = join(s.stage.rootDirectory, actCollectionRoot, 'current', s.stage.activityId);
                if (existsSync(actPath)) {
                    return 'default';
                }
                return 'abort';
            },
        });
        branchOnMissingActivity.on('abort', abortOnMissingActivity);
        this.startNode
            .next(n('tbc-system:prepare-messages', {
                verbose: this.config?.verbose,
            }))
            .next(n('tbc-system:resolve-flow', {
                verbose: this.config?.verbose,
                rootDirectory: this.config?.rootDirectory,
                resolveRootDirectory: true,
                resolveProtocol: true,
                resolveCollections: true,
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'act-close-flow',
                        message: 'Checking first ...',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('tbc-system:validate-flow', {
                verbose: shared.stage.verbose,
                rootDirectory: shared.stage.rootDirectory,
            }))
            .next(branchToAbort)
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    const actCollectionRoot = s.system.protocol.act.collection ?? 'act';
                    s.stage.currentActivityCollection = `${actCollectionRoot}/current`;
                    s.stage.backlogActivityCollection = `${actCollectionRoot}/backlog`;
                    s.stage.memCollection = s.system.protocol.mem.collection ?? 'mem';
                },
            }))
            .next(branchOnMissingActivity)
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    // Clear previous results to avoid pollution
                    s.record.result = undefined;
                    s.stage.records = undefined;
                    s.stage.currentActivityCollection = `${s.stage.currentActivityCollection}/${s.stage.activityId}`;
                },
            }))
            .next(n('core:assign', {
                'record.rootDirectory': 'system.rootDirectory',
                'record.collection': 'stage.currentActivityCollection',
                'record.query': 'stage.query',
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'debug',
                        source: 'act-close-flow',
                        message: `Query (${JSON.stringify(shared.record.query)}) and load from ${shared.record.collection}`,
                    });
                },
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: ['tbc-record-fs:query-records'],
                verbose: shared.stage.verbose,
            }))
            .next(n('core:assign', {
                'record.rootDirectory': 'system.rootDirectory',
                'record.collection': 'stage.currentActivityCollection',
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: shared.stage.verbose,
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    const activityId = s.stage.activityId;
                    const targetFile = `${activityId}.md`;
                    const workspaceKey = Object.keys(s.record.result?.records || {})[0];
                    const workspaceRecords = s.record.result?.records?.[workspaceKey] || {};
                    const primaryRecord = workspaceRecords[targetFile];
                    s.stage.activeDrafts = [];
                    primaryRecord && s.stage.activeDrafts.push({
                        ...primaryRecord,
                        id: activityId,
                        filename: targetFile,
                    });
                },
            }))
            .next(n('tbc-system:prepare-records-manifest'))
            .next(shared.verbose ? n('tbc-system:add-manifest-messages', {
                source: 'act-close-flow',
                level: 'info',
            }) : new Node())
            .next(n('tbc-system:write-records-flow', {
                verbose: shared.stage.verbose,
                sourcePath: 'stage.activeDrafts',
                collection: 'memCollection',
                protocolKey: 'mem',
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    const actCollectionRoot = s.system.protocol.act.collection ?? 'act';
                    const currentDir = join(s.stage.rootDirectory, actCollectionRoot, 'current', s.stage.activityId);
                    const archiveRoot = join(s.stage.rootDirectory, actCollectionRoot, 'archive');
                    const archiveDir = join(archiveRoot, s.stage.activityId);

                    // Ensure archive root exists
                    if (!existsSync(archiveRoot)) {
                        mkdirSync(archiveRoot, { recursive: true });
                    }

                    // Raw move: move the entire workspace to archive
                    if (existsSync(currentDir)) {
                        renameSync(currentDir, archiveDir);
                        s.stage.messages.push({
                            level: 'info',
                            kind: 'raw',
                            message: ' ┌┼───────────────────────────────────────────────────────────',
                        });
                        s.stage.messages.push({
                            level: 'info',
                            kind: 'raw',
                            message: `[✓] Activity closed: ${s.stage.activityId}`,
                        });
                        s.stage.messages.push({
                            level: 'info',
                            kind: 'raw',
                            message: ' └┼───────────────────────────────────────────────────────────',
                        });
                        s.stage.messages.push({
                            level: 'info',
                            source: 'act-close-flow',
                            message: `Activity archived: ${actCollectionRoot}/archive/${s.stage.activityId}`,
                        });
                    }
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ConfigSchema);
        return { valid: result.isValid, errors: result.errors || [] };
    }

    async run(shared: Shared): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.stage.activityId = shared.activityId || this.config?.activityId;
        return super.run(shared);
    }
}
