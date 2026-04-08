import assert from 'node:assert';
import { Node } from 'pocketflow';
import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface Config {
    verbose: boolean;
    query: string;
    deepQuery: boolean;
    type?: string;
    protocolKey: 'sys' | 'skills' | 'mem' | 'dex' | 'act' | undefined;
    limit?: number;
}

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        query: { type: 'string' },
        deepQuery: { type: 'boolean', default: false },
        type: { type: 'string' },
        protocolKey: { type: 'string', enum: ['sys', 'skills', 'mem', 'dex', 'act'] },
        limit: { type: 'number' },
    },
    required: ['verbose'],
};

class StartNode extends HAMINode<Shared, Config> {
    kind(): string {
        return 'tbc-system:view-records-flow-start';
    }

    async post(shared: Shared): Promise<string> {
        assert(shared.system?.rootDirectory, 'shared.system.rootDirectory is required for ViewRecordsFlow');
        assert(shared.system?.protocol, 'protocol must be resolved before view-records-flow');

        // Initialize the view namespace
        shared.view = shared.view || {
            matches: [],
            records: [],
        };

        return 'default';
    }
}

export class ViewRecordsFlow extends HAMIFlow<Shared, Config> {
    startNode: Node;

    constructor(config: Config) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
    }

    kind(): string {
        return 'tbc-system:view-records-flow';
    }

    async prep(shared: Shared): Promise<void> {
        assert(this.config, 'flow must be configured');
        assert(shared.registry, 'registry is required');
        assert(shared.system?.protocol, 'protocol must be resolved before view-records-flow');
        const config = this.config;
        const n = shared.registry.createNode.bind(shared.registry);
        const protocol = shared.system.protocol;
        const collection = protocol[config.protocolKey!]?.collection ?? 'mem';

        // Get query providers from protocol.on.query - fallback to fs if empty
        let queryProviders = protocol[config.protocolKey!]?.on?.query?.map(p => p.id) ?? [];
        if (queryProviders.length === 0) {
            queryProviders = ['tbc-record-fs:query-records'];
        }
        // Get fetch providers from protocol.on.fetch - fallback to fs if empty
        let fetchProviders = protocol[config.protocolKey!]?.on?.fetch?.map(p => p.id) ?? [];
        if (fetchProviders.length === 0) {
            fetchProviders = ['tbc-record-fs:fetch-records'];
        }

        this.startNode
            // Step 0: Setup query parameters
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    const queryStr = config.query || '';
                    const queryType = queryStr.trim().length > 0 ? 'search-by-content' : 'list-all-ids';
                    
                    s.record.query = {
                        type: queryType,
                        searchTerm: queryStr,
                        recordType: config.type,
                        sortBy: 'id',
                        sortOrder: 'desc',
                        limit: config.limit,
                    };
                    s.record.collection = collection;
                },
            }))
            // Step 1: Query records using protocol.on.query providers
            .next(n('tbc-record:query-records-flow', {
                deepQuery: config.deepQuery,
                recordProviders: queryProviders,
                verbose: config.verbose,
            }))
            // Step 2: Map query results to IDs for fetch
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    // Capture IDsSource and IDs before clearing result
                    const idsSource = s.record.result?.IDsSource;
                    const queryIDs = s.record.result?.IDs || [];
                    
                    // Clear previous result to avoid accumulation from earlier queries
                    s.record.result = undefined;
                    
                    s.record.IDs = queryIDs;
                    
                    // Report the query source for debugging
                    if (idsSource) {
                        s.stage.messages.push({
                            level: 'debug',
                            source: 'view-records-flow',
                            message: `Query source: ${idsSource}`,
                        });
                    }
                },
            }))
            // Step 3: Fetch records using protocol.on.fetch providers
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: fetchProviders,
                verbose: config.verbose,
            }))
            // Project Results & Reporting
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    // 1. Extract and Flatten Records from the fetch-records-flow result
                    const incoming = s.record.result?.records || {};
                    const flattened: any[] = [];

                    for (const col in incoming) {
                        for (const id in incoming[col]) {
                            const r = incoming[col][id];

                            // Normalize the record structure for the View layer
                            const normalizedRecord = {
                                ...r,
                                // Priority: specific field > generic field > fallback ID
                                title: r.record_title || r.title || id,
                                type: r.record_type || r.type || 'memory',
                                id: r.id || id,
                            };

                            flattened.push(normalizedRecord);
                        }
                    }

                    // 2. Finalize the view state
                    s.view!.records = flattened;

                    // 3. Reporting and CLI Output Generation
                    const count = flattened.length;
                    const queryDisplay = s.view!.query || '*';

                    if (count > 0) {
                        // Standard summary message
                        s.stage.messages.push({
                            level: 'debug',
                            source: 'view-records-flow',
                            message: `Found ${count} record(s) matching "${queryDisplay}".`,
                        });

                        // Detailed recall messages for the CLI capture
                        // This generates the "Recalled: [type] title" strings the test expects
                        flattened.forEach(r => {
                            s.stage.messages.push({
                                level: 'debug',
                                source: 'view-records-flow',
                                message: `Recalled: [${r.type}] ${r.title}`,
                            });
                        });
                    } else {
                        s.stage.messages.push({
                            level: 'warn',
                            source: 'view-records-flow',
                            message: `No records found matching query: "${queryDisplay}"`,
                            suggestion: 'Try a different keyword or check your index partitions.',
                        });
                    }
                },
            }));
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}
