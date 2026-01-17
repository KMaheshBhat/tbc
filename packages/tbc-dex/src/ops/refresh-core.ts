import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, validateAgainstSchema } from "@hami-frameworx/core";
import type { HAMINodeConfigValidateResult, ValidationSchema } from "@hami-frameworx/core";

interface RefreshCoreFlowConfig {
    verbose: boolean;
}

const RefreshCoreFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class RefreshCoreFlow extends HAMIFlow<Record<string, any>, RefreshCoreFlowConfig> {
    startNode: Node;
    config: RefreshCoreFlowConfig;

    constructor(config: RefreshCoreFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-dex:refresh-core";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // Wire the flow
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('core:assign', { 
                'record.collection': 'rootCollection',
                'record.IDs': 'rootIDs',
            }))
            .next(n('tbc-record:fetch-records-flow',{ 
                recordProviders: ['fs'],
                verbose: this.config.verbose,
            }))
            .next(n('core:assign', {
                'record.collection': 'specsCollection',
                'record.query': 'queryAllIDs',
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: ['fs'],
                verbose: this.config.verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs'
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['fs'],
                verbose: this.config.verbose,
            }))
            .next(n('tbc-dex:generate-dex-core'))
            .next(n('core:assign', { 
                'record.collection': 'collection',
                'record.records': 'records',
            }))
            .next(n('tbc-record:store-records-flow', {
                recordProviders: ['fs'],
                verbose: this.config.verbose,
            }))
            .next(n('core:log-result', {
                resultKey: 'storeResults',
                format: 'table',
            }))
            ;

    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Determine root directory
        const rootDir = shared.root || process.cwd();
        shared.rootDirectory = rootDir;
        shared.record = {
            rootDirectory: rootDir,
        }

        // Initialize fetchResults
        shared.fetchResults = {};

        // Set collection names
        shared.rootCollection = 'sys';
        shared.rootIDs = ['root'];
        shared.specsCollection = 'sys/core';
        shared.queryAllIDs = {
            type: 'list-all-ids',
        }

        return super.run(shared);
    }

    validateConfig(config: RefreshCoreFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, RefreshCoreFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}
