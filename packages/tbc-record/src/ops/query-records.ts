import assert from 'node:assert';

import { Node } from 'pocketflow';
import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { TBCShared as Shared, TBCQueryParams, TBCResult, TBCStore } from '../types.js';

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

class StartNode extends HAMINode<Shared, FlowConfig> {
    constructor(config?: FlowConfig, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return 'tbc-system:query-records-flow-start';
    }

    post(shared: Shared, prepRes: unknown, execRes: unknown): Promise<string> {
        shared.record.rootDirectory = shared.record.rootDirectory || this.config?.root || process.cwd();
        return Promise.resolve('default');
    }
}

export class QueryRecordsFlow extends HAMIFlow<Record<string, any>, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-record:query-records-flow';
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        const providers = this.config.recordProviders || [];

        const endNode = new Node();
        let currentAnchor = this.startNode;

        for (const provider of providers) {
            const providerNode = n(provider);

            // The branch logic: check shared.record.result for hits
            const hitBranch = n('core:branch', {
                branch: (s: Shared) => {
                    const hasIds = s.record?.result?.IDs && s.record.result.IDs.length > 0;
                    console.log(`${hasIds ? 'hit' : 'miss'} on ${providerNode.kind()}`) // TODO:REMOVE - DEVELOPMENT ONLY
                    return hasIds ? 'hit' : 'default';
                }
            });

            // Anchor -> Provider -> Branch
            currentAnchor.next(providerNode).next(hitBranch);

            // If 'hit', short-circuit straight to endNode
            hitBranch.on('hit', endNode);

            // If 'default', we set up a new anchor for the next loop iteration
            const nextAnchor = new Node();
            hitBranch.next(nextAnchor);
            currentAnchor = nextAnchor;
        }

        // Connect the very last anchor to endNode (exhausted all providers with no hit)
        currentAnchor.next(endNode);
    }

    async run(shared: Shared): Promise<string | undefined> {
        assert(shared.record, 'shared.record (operation state) is required');
        assert(shared.record.query, 'shared.record.query is required');
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