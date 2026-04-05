import assert from 'node:assert';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, HAMIRegistrationManager, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';
import { PROTOCOLS } from '../protocols.js';

interface Config {
    verbose?: boolean;
    rootDirectory?: string;
    resolve?: {
        resolveRootDirectory?: boolean;
        resolveProtocol?: boolean;
        resolveCollections?: boolean;
    };
};

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        rootDirectory: { type: 'string' },
        resolve: {
            type: 'object',
            properties: {
                resolveRootDirectory: { type: 'boolean' },
                resolveProtocol: { type: 'boolean' },
                resolveCollections: { type: 'boolean' },
            },
        },
    },
};

class StartNode extends HAMINode<Shared, Config> {
    constructor(config?: Config, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return 'tbc-system:validate-flow-start';
    }

    async post(shared: Shared, prepRes: unknown, execRes: unknown): Promise<string> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.system = shared.system || {};
        shared.record = shared.record || {};
        return 'default';
    }
}

export class ValidateFlow extends HAMIFlow<Record<string, any>, Config> {
    startNode: Node;
    config: Config;

    constructor(config: Config) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-system:validate-flow';
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

        // When resolve.resolveRootDirectory is true, invoke resolve-flow at start (for direct CLI invocation)
        // When false (default), skip resolve-flow as root/protocol already resolved by caller
        // NOTE: We always need resolveCollections to ensure sysCollection/memCollection are set
        const shouldResolve = this.config.resolve?.resolveRootDirectory ?? false;
        const resolveFlowOrSkip = shouldResolve
            ? n('tbc-system:resolve-flow', { 
                verbose: this.config.verbose,
                rootDirectory: this.config.rootDirectory,
                resolveRootDirectory: this.config.resolve?.resolveRootDirectory ?? true,
                resolveProtocol: this.config.resolve?.resolveProtocol ?? true,
                resolveCollections: true,  // Always resolve collections for sys/mem collection names
              })
            : n('tbc-system:resolve-collections');  // At minimum resolve collections

        this.startNode
            .next(n('tbc-system:prepare-messages', {
                verbose: this.config?.verbose,
            }))
            .next(resolveFlowOrSkip)
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('tbc-system:load-specifications-flow', {
                verbose: shared.stage.verbose,
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('tbc-system:load-core-memories-flow', {
                verbose: shared.stage.verbose,
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'validate-flow',
                        message: 'Validating system',
                    });
                },
            }))
            .next(n('tbc-system:validate-system'))
            .next(n('tbc-system:log-and-clear-messages'))
            ;
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        return super.run(shared);
    }

}
