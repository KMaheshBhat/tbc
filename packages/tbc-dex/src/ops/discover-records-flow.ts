import assert from 'node:assert';
import { Node } from 'pocketflow';
import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface Config {
    verbose: boolean;
    query: string;
    type?: string;
    protocolKey: 'sys' | 'skills' | 'mem' | 'dex' | 'act' | undefined;
    limit?: number;
    outputKey: string;
}

const ConfigSchema: ValidationSchema = {
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

class StartNode extends HAMINode<Shared, Config> {
    kind(): string {
        return 'tbc-dex:discover-records-flow-start';
    }

    async post(shared: Shared): Promise<string> {
        assert(shared.system?.rootDirectory, 'shared.system.rootDirectory is required for DiscoverRecordsFlow');
        assert(shared.system?.protocol, 'protocol must be resolved before discover-records-flow');

        // Initialize the dex namespace
        shared.stage.dex = shared.stage.dex || {
            matches: [],
            records: [],
        };

        return 'default';
    }
}

export class DiscoverRecordsFlow extends HAMIFlow<Shared, Config> {
    startNode: Node;

    constructor(config: Config) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
    }

    kind(): string {
        return 'tbc-dex:discover-records-flow';
    }

    async prep(shared: Shared): Promise<void> {
        assert(this.config, 'flow must be configured');
        assert(shared.registry, 'registry is required');
        assert(shared.system?.protocol, 'protocol must be resolved before discover-records-flow');
        const config = this.config;
        const n = shared.registry.createNode.bind(shared.registry);
        const protocol = shared.system.protocol;
        const dexCollection = protocol.dex.collection ?? 'dex';

        // Get protocol-derived providers for dex
        const dexQueriers = protocol.dex.on?.query?.map(p => p.id) ?? [];
        const dexFetchers = protocol.dex.on?.fetch?.map(p => p.id) ?? [];

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
                recordProviders: dexQueriers,
                verbose: this.config.verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: dexFetchers,
                verbose: this.config.verbose,
            }))
            .next(n('tbc-system:prepare-records-manifest'))
            .next(this.config.verbose ? n('tbc-system:add-manifest-messages', {
                source: 'discover-records-flow',
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
                outputKey: config.outputKey,
            }))
            // 3. Map only IDs back
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage[config.outputKey] = s.stage[config.outputKey].map((m: any) => m.id);
                },
            }))
            ;

        // Get protocol-derived providers for the target protocol (from config.protocolKey)
        const targetProtocol = protocol[config.protocolKey!];
        const targetQueriers = targetProtocol?.on?.query?.map(p => p.id) ?? ['tbc-record-sqlite:query-records'];
        const targetCollection = targetProtocol?.collection ?? 'mem';

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
                    s.record.collection = targetCollection;
                },
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: targetQueriers,
                verbose: config.verbose,
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    // Querier usually returns result.IDs directly
                    s.stage[config.outputKey] = s.record.result?.IDs || [];
                },
            }));

        const branch =
            n('core:branch', {
                branch: (s: Shared) => {
                    const targetProtocol = s.system.protocol[config.protocolKey!];
                    // If we have a dedicated querier (like SQLite), use the fast path
                    const hasRdbms = targetProtocol?.on?.query?.some((p: any) => p.id.includes('sqlite'));
                    const path = hasRdbms ? 'rdbms-path' : 'fs-path';
                    return path;
                },
            });
        branch.on('fs-path', fsSequence);
        branch.on('rdbms-path', rdbmsSequence);
        this.startNode.next(branch);
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}
