import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { createSetStoreCollectionNode, logTableNode } from "./common-nodes.js";
import { GenerateGenericCoreNode } from "./generate-generic-core.js";

interface IntGenericFlowConfig {
    root?: string;
    verbose: boolean;
}

const IntGenericFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        root: { type: "string" },
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class IntGenericFlow extends HAMIFlow<Record<string, any>, IntGenericFlowConfig> {
    startNode: Node;
    config: IntGenericFlowConfig;

    constructor(config: IntGenericFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-interface:int-generic-flow";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Determine root directory
        shared.rootDirectory = shared.root || process.cwd();

        shared.collection = 'sys';
        shared.IDs = ['companion.id'];

        // Custom nodes
        const setStoreCollectionNode = createSetStoreCollectionNode();
        const generateGenericCoreNode = new GenerateGenericCoreNode();

        // Wire the flow
        this.startNode
            .next(n('tbc-system:validate', {
                verbose: this.config.verbose,
            }))
            .next(n('tbc-record-fs:fetch-records'))
            .next(n('tbc-memory:extract-companion-id'))
            .next(n('tbc-record-fs:fetch-records'))
            .next(n('tbc-memory:extract-companion-name'))
            .next(n('tbc-system:generate-role-definition'))
            .next(generateGenericCoreNode)
            .next(setStoreCollectionNode)
            .next(n('tbc-record-fs:store-records'))
            .next(logTableNode(shared['registry'], 'storeResults'));

        return super.run(shared);
    }

    validateConfig(config: IntGenericFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, IntGenericFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}