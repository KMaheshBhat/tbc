import assert from 'node:assert';

import { Node } from 'pocketflow';
import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { TBCShared as Shared, TBCResult, TBCStore } from '../types.js';

interface FlowConfig {
    verbose: boolean;
    recordProviders?: string[];
    root?: string;
}

const FlowConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        recordProviders: { type: 'array', items: { type: 'string' } },
        root: { type: 'string' },
    },
    required: ['verbose'],
};

export class FetchRecordsFlow extends HAMIFlow<Record<string, any>, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-record:fetch-records-flow';
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        const providers = this.config.recordProviders || [];
        for (const provider of providers) {
            const nodeKind = provider;
            assert(
                shared.registry.hasNodeClass(nodeKind),
                `Composition Error: The required node class [${nodeKind}] is not registered in the HAMI manager.`,
            );
        }
        let finalNodeSequence = new Node();
        let tailNode = providers.length > 0 ? new Node() : finalNodeSequence;
        this.startNode
            .next(n('core:assign', { 'record.accumulate': 'record.result' }))
            .next(tailNode);
        for (const [i, provider] of providers.entries()) {
            const isLast = i === providers.length - 1;
            const targetNext = isLast ? finalNodeSequence : new Node();
            tailNode
                .next(n('core:mutate', {
                    mutate: async (shared: Shared) => {
                        shared.record!.result = undefined;
                    },
                }))
                .next(n(provider))
                .next(new AccumulateNode())
                .next(targetNext);
            tailNode = targetNext;
        }
        finalNodeSequence
            .next(n('core:mutate', {
                mutate: async (shared: Shared) => {
                    shared.record!.result = shared.record!.accumulate;
                    shared.record!.accumulate = undefined;
                },
            }));
    }

    async run(shared: Shared): Promise<string | undefined> {
        assert(shared.record, 'shared.record (operation state) is required');
        const rootDir = shared.record.rootDirectory || this.config.root || process.cwd();
        shared.record.rootDirectory = rootDir;
        return super.run(shared);
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}

class AccumulateNode extends Node {
    async prep(shared: Shared): Promise<[TBCResult, TBCResult]> {
        assert(shared.record, 'shared.record is required');
        return [shared.record?.accumulate || {}, shared.record?.result || {}];
    }

    async exec(prepRes: [TBCResult, TBCResult]): Promise<TBCResult> {
        const [accumulated, incoming] = prepRes;
        const master = accumulated || {};
        for (const collection in incoming.records) {
            if (!master.records) master.records = {};
            master.records[collection] = master.records[collection] || {};
            for (const id in incoming.records[collection]) {
                master.records[collection][id] = {
                    ...(master.records[collection][id] || {}),
                    ...incoming.records[collection][id],
                };
            }
        }
        return master;
    }

    async post(
        shared: Shared,
        _prepRes: [TBCResult, TBCResult],
        execRes: TBCResult,
    ): Promise<string | undefined> {
        assert(shared.record, 'shared.record is required');
        shared.record.accumulate = execRes;
        return undefined;
    }
}