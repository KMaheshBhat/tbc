import assert from 'node:assert';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, ValidationSchema, validateAgainstSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface Config {
    verbose: boolean;
    rootDirectory?: string;
}

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        rootDirectory: { type: 'string' },
    },
};

class StartNode extends HAMINode<Shared, Config> {
    kind(): string {
        return 'tbc-interface:int-probe-flow-start:nx';
    }

    async post(shared: Shared): Promise<string> {
        shared.stage = shared.stage || {};
        shared.system = shared.system || {};
        shared.stage.verbose = shared.stage.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.stage.rootDirectory || this.config?.rootDirectory;
        return 'default';
    }
}

export class IntProbeFlowNx extends HAMIFlow<Shared, Config> {
    startNode: Node;
    config: Config;

    constructor(config: Config) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-interface:int-probe-flow:nx';
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-system:resolve-root-directory'))
            .next(n('tbc-system:validate-flow', { 
                verbose: this.config?.verbose,
                rootDirectory: this.config?.rootDirectory,
                resolveProtocol: true,
            }))
            .next(n('tbc-system:probe')) // TODO replace this
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
        return super.run(shared);
    }
}
