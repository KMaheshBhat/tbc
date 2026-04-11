import assert from 'node:assert';

import { Node } from 'pocketflow';

import {
    HAMIFlow,
    HAMINode,
    HAMINodeConfigValidateResult,
    validateAgainstSchema,
    ValidationSchema,
} from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface Config {
    count: number;
}

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        count: { type: 'number' },
    },
};

class StartNode extends HAMINode<Shared, Config> {
    constructor(config?: Config, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return 'tbc-system:generate-uuids-flow-start';
    }

    async post(shared: Record<string, any>, prepRes: unknown, execRes: unknown): Promise<string> {
        shared.stage = shared.stage || {};
        return 'default';
    }
}

export class GenerateUUIDsFlow extends HAMIFlow<Record<string, any>, Config> {
    startNode: Node;
    config: Config;

    constructor(config: Config) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-system:generate-uuids-flow';
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-system:prepare-messages', {
                verbose: true,
            }))
            .next(n('tbc-mint:mint-ids-flow', {
                requests: [
                    {
                        type: 'tbc-mint:uuid-mint',
                        count: this.config.count,
                    },
                ],
            }))
            .next(n('tbc-system:add-minted-messages', {
                source: 'generate-uuids-flow',
                level: 'info',
            }))
            .next(n('tbc-system:log-and-clear-messages'));
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        return super.run(shared);
    }

}
