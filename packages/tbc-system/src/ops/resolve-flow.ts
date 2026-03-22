import assert from 'node:assert';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface Config {
    verbose?: boolean;
    rootDirectory?: string;
    resolveRootDirectory?: boolean;  // Whether to resolve root directory (default: true)
    resolveProtocol?: boolean;       // Whether to resolve protocol (default: true)
    resolveCollections?: boolean;    // Whether to resolve collections (default: true)
};

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        rootDirectory: { type: 'string' },
        resolveRootDirectory: { type: 'boolean' },
        resolveProtocol: { type: 'boolean' },
        resolveCollections: { type: 'boolean' },
    },
};

class StartNode extends HAMINode<Shared, Config> {
    constructor(config?: Config, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return 'tbc-system:resolve-flow-start:nx';
    }

    async post(shared: Shared, prepRes: unknown, execRes: unknown): Promise<string> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = this.config?.verbose ?? shared.stage.verbose;
        shared.system = shared.system || {};
        return 'default';
    }
}

export class ResolveFlowNx extends HAMIFlow<Record<string, any>, Config> {
    startNode: Node;
    config: Config;

    constructor(config: Config) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-system:resolve-flow:nx';
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

        // Default resolveRootDirectory to true if not specified
        const resolveRootDirectory = this.config.resolveRootDirectory ?? true;

        // Default resolveProtocol to true if not specified
        const resolveProtocol = this.config.resolveProtocol ?? true;

        // Default resolveCollections to true if not specified
        const resolveCollections = this.config.resolveCollections ?? true;

        const resolveRootDirectoryOrSkip = resolveRootDirectory
            ? n('tbc-system:resolve-root-directory', { 
                rootDirectory: this.config.rootDirectory
              })
            : new Node();

        const resolveProtocolOrSkip = resolveProtocol
            ? n('tbc-system:resolve-protocol')
            : new Node();

        const resolveCollectionsOrSkip = resolveCollections
            ? n('tbc-system:resolve-collections')
            : new Node();

        this.startNode
            .next(n('tbc-system:prepare-messages:nx', {
                verbose: this.config?.verbose,
            }))
            .next(resolveRootDirectoryOrSkip)
            .next(resolveProtocolOrSkip)
            .next(resolveCollectionsOrSkip);
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        return super.run(shared);
    }
}
