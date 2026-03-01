import assert from 'node:assert';
import { Node } from 'pocketflow';
import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface FlowConfig {
    verbose: boolean;
    query: string;
    type?: string;
    recordFetchers: string[];
    protocolKey: 'sys' | 'skills' | 'mem' | 'dex' | 'act' | undefined;
    limit?: number;
}

const FlowConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        query: { type: 'string' },
        type: { type: 'string' },
        recordFetchers: { type: 'array', items: { type: 'string' } },
        protocolKey: { type: 'string', enum: ['sys', 'skills', 'mem', 'dex', 'act'] },
        limit: { type: 'number' },
    },
    required: ['verbose', 'recordFetchers'],
};

class ViewRecordsStartNode extends HAMINode<Shared, FlowConfig> {
    kind(): string {
        return 'tbc-view:view-records-flow-start';
    }

    async post(shared: Shared): Promise<string> {
        assert(shared.system?.rootDirectory, 'shared.system.rootDirectory is required for ViewRecordsFlow');

        // Initialize the view namespace
        shared.view = shared.view || {
            matches: [],
            records: [],
        };

        return 'default';
    }
}

export class ViewRecordsFlow extends HAMIFlow<Shared, FlowConfig> {
    startNode: Node;

    constructor(config: FlowConfig) {
        const startNode = new ViewRecordsStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
    }

    kind(): string {
        return 'tbc-view:view-records-flow';
    }

    async prep(shared: Shared): Promise<void> {
        assert(this.config, 'flow must be configured');
        assert(shared.registry, 'registry is required');
        const config = this.config;
        const n = shared.registry.createNode.bind(shared.registry);
        const dexCollection= shared.system.protocol.dex.collection ?? 'dex';
        const collection= shared.system.protocol[this.config.protocolKey!].collection ?? 'mem';

        this.startNode
            // 0. Load DEX
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
            }): new Node())
            // 1. Setup Query
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.view = s.view || { query: '', matches: [], records: [] };
                    s.view.query = config.query;
                    s.view.type = config.type;
                },
            }))
            // 2. Query DEX
            .next(n('tbc-dex:query-indices', {
                query: config.query,
                type: config.type,
                limit: config.limit || 10,
                outputKey: 'viewMatches', // Tell DEX where to put the results in shared.stage
            }))
            // 3. Map Stage to View
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    // Clear previous pollution from Step 0
                    s.record.IDs = [];
                    s.view.matches = s.stage.viewMatches || [];
                    // Only fetch the IDs found by the DEX search
                    s.record.IDs = s.view.matches.map((m: any) => m.id);
                    s.record.collection = collection;
                    s.record.result = undefined;
                },
            }))
            // 4. Execute Settled Fetch Logic
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: config.recordFetchers, // Pass the fetcher kinds
                verbose: config.verbose,
            }))
            // 5. Project Results & Reporting
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
                    s.view.records = flattened;

                    // 3. Reporting and CLI Output Generation
                    const count = flattened.length;
                    const queryDisplay = s.view.query || '*';

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

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}