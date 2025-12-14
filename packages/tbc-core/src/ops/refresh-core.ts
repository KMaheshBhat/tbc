import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

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
        return "tbc-core:refresh-core";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Determine root directory
        const rootDir = shared.root || process.cwd();
        shared.rootDirectory = rootDir;

        // Initialize fetchResults
        shared.fetchResults = {};

        // Set collection names
        shared.rootCollection = 'tbc';
        shared.rootIDs = ['root'];
        shared.specsCollection = 'tbc/specs';

        // Wire the flow
        this.startNode
            .next(n('tbc-core:resolve'))
            .next(n('core:map', { 'collection': 'rootCollection', 'IDs': 'rootIDs' }))
            .next(n('tbc-record-fs:fetch-records'))
            .next(n('core:map', { 'collection': 'specsCollection' }))
            .next(n('tbc-record-fs:fetch-all-ids'))
            .next(n('tbc-record-fs:fetch-records'))
            .next(n('tbc-core:generate-dex-core'))
            .next(n('tbc-record-fs:store-records'))
            .next(n('core:log-result', { resultKey: 'storeResults' }))
            ;

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
