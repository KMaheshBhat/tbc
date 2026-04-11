import assert from 'node:assert';

import { Node } from 'pocketflow';
import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface FlowConfig {
    verbose: boolean;
    sourcePath: string;
    collection: string;
    storeProviders?: Array<{ id: string; config?: Record<string, any> }>;
    protocolKey: 'sys' | 'skills' | 'mem' | 'dex' | 'act' | undefined;
}

const FlowConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        sourcePath: { type: 'string' },
        collection: { type: 'string' },
        storeProviders: { type: 'array' },
        protocolKey: { type: 'string', enum: ['sys', 'skills', 'mem', 'dex', 'act']},
    },
    required: ['verbose', 'sourcePath', 'collection'],
};

class WriteRecordsStartNode extends HAMINode<Shared, FlowConfig> {
    kind(): string {
        return 'tbc-system:write-records-flow-start';
    }

    async post(shared: Shared): Promise<string> {
        // Ensure shared.system exists as we rely on it for rootDirectory indirection
        assert(shared.system?.rootDirectory, 'shared.system.rootDirectory is required for WriteRecordsFlow');
        return 'default';
    }
}

export class WriteRecordsFlow extends HAMIFlow<Record<string, any>, FlowConfig> {
    startNode: Node;

    constructor(config: FlowConfig) {
        const startNode = new WriteRecordsStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
    }

    kind(): string {
        return 'tbc-system:write-records-flow';
    }

    async prep(shared: Shared): Promise<void> {
        assert(this.config, 'flow must be configured');
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        const sourcePath = this.config.sourcePath;
        const collection : string = shared.stage[this.config.collection];
        const proto = shared.system.protocol?.[this.config.protocolKey!];
        const storeProviders = proto?.on?.store ?? this.config.storeProviders ?? []
        const storeConfig = proto?.on?.store ?? [];

        const postNode = new Node();
        for (const provider of storeConfig) {
            const postHook = provider.config?.post;
            if (postHook) {
                postNode.next(n(postHook.id, {
                    ...postHook.config,
                    verbose: this.config?.verbose,
                }));
            }
        }

        this.startNode
            // 1. Prepare shared.record for tbc-record:store-records-flow
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    const source = this.resolvePath(shared, sourcePath);
                    if (!source) throw new Error(`No data found at path: ${sourcePath}`);
                    const records = Array.isArray(source) ? source : [source];
                    shared.record = shared.record || {};
                    shared.record.rootDirectory = shared.system.rootDirectory;
                    shared.record.collection = collection;
                    shared.record.records = records;
                },
            }))
            .next(n('tbc-record:store-records-flow', {
                recordProviders: storeProviders,
                verbose: this.config.verbose,
            }))
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    const count = shared.record.records?.length || 0;
                    shared.stage.messages.push({
                        level: 'debug',
                        source: 'write-records-flow',
                        message: `Processed ${count} record(s) in [${collection}].`,
                    });
                },
            }))
            .next(postNode)
            ;
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    protected resolvePath(obj: any, path: string): any {
        if (!path || !obj) return undefined;
        return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
    }
}
