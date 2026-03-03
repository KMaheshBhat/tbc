import assert from 'node:assert';
import { Node } from 'pocketflow';
import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface FlowConfig {
    verbose: boolean;
    query: string;
    type?: string;
    protocolKey: 'sys' | 'skills' | 'mem' | 'dex' | 'act' | undefined;
    limit?: number;
    outputKey: string;
}

const FlowConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        query: { type: 'string' },
        type: { type: 'string' },
        protocolKey: { type: 'string', enum: ['sys', 'skills', 'mem', 'dex', 'act'] },
        limit: { type: 'number' },
        outputKey: { type: 'string' },
    },
    required: ['verbose', 'outputKey'],
};

class DiscoverRecordsFlowStartNode extends HAMINode<Shared, FlowConfig> {
    kind(): string {
        return 'tbc-dex:discover-records-flow-start';
    }

    async post(shared: Shared): Promise<string> {
        assert(shared.system?.rootDirectory, 'shared.system.rootDirectory is required for ViewRecordsFlow');

        // Initialize the view namespace
        shared.stage.dex = shared.stage.dex || {
            matches: [],
            records: [],
        };

        return 'default';
    }
}

export class DiscoverRecordsFlow extends HAMIFlow<Shared, FlowConfig> {
    startNode: Node;

    constructor(config: FlowConfig) {
        const startNode = new DiscoverRecordsFlowStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
    }

    kind(): string {
        return 'tbc-dex:discover-records-flow';
    }

    async prep(shared: Shared): Promise<void> {
        assert(this.config, 'flow must be configured');
        assert(shared.registry, 'registry is required');
        const config = this.config;
        const n = shared.registry.createNode.bind(shared.registry);
        const dexCollection = shared.system.protocol.dex.collection ?? 'dex';

        const fsSequence = new Node();
        fsSequence
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.record.query = {
                        type: 'list-all-ids',
                    };
                    s.record.collection = dexCollection;
                },
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: ['tbc-record-fs:query-records'],
                verbose: this.config.verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: this.config.verbose,
            }))
            .next(n('tbc-system:prepare-records-manifest'))
            .next(this.config.verbose ? n('tbc-system:add-manifest-messages', {
                source: 'view-records-flow',
                level: 'debug',
            }) : new Node())
            // 1. Setup Query
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.dex = s.stage.dex || { query: '', matches: [], records: [] };
                    s.stage.dex.query = config.query;
                    s.stage.dex.type = config.type;
                },
            }))
            // 2. Query DEX
            .next(n('tbc-dex:query-indices', {
                query: config.query,
                type: config.type,
                limit: config.limit || 10,
                outputKey: config.outputKey, // Tell DEX where to put the results in shared.stage
            }))
            // 3. Map only IDs back
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage[config.outputKey] = s.stage[config.outputKey].map((m: any) => m.id);
                },
            }))
            ;

        const rdbmsSequence = new Node();
        rdbmsSequence
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.record.query = {
                        type: 'search-by-content',
                        searchTerm: config.query,
                        sortBy: 'id',
                        sortOrder: 'desc',
                    };
                    s.record.collection = shared.system.protocol[config.protocolKey!].collection;
                }
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: ['tbc-record-sqlite:query-records'],
                verbose: config.verbose
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    // SQLite Querier usually returns result.IDs directly
                    s.stage[config.outputKey] = s.record.result?.IDs || [];
                }
            }));

        const branch =
            n('core:branch', {
                branch: (s: Shared) => {
                    const protocol = s.system.protocol[config.protocolKey!];
                    // If we have a dedicated querier (like SQLite), use the fast path
                    const path = protocol?.recordQueriers?.includes('tbc-record-sqlite:query-records')
                        ? 'rdbms-path'
                        : 'fs-path';
                    return path;
                }
            });
        branch.on('fs-path', fsSequence);
        branch.on('rdbms-path', rdbmsSequence);
        this.startNode.next(branch);
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}
