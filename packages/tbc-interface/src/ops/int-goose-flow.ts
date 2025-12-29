import assert from "assert";
import { Node } from "pocketflow";
import { join } from "node:path";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { ExtractCompanionId, createExtractCompanionNameNode, createSetStoreCollectionNode, logTableNode } from "./common-nodes.js";

interface IntGooseFlowConfig {
    root?: string;
    verbose: boolean;
}

const IntGooseFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        root: { type: "string" },
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class IntGooseFlow extends HAMIFlow<Record<string, any>, IntGooseFlowConfig> {
    startNode: Node;
    config: IntGooseFlowConfig;

    constructor(config: IntGooseFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-interface:int-goose-flow";
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
        const extractCompanionIdNode = new ExtractCompanionId();
        const extractCompanionNameNode = createExtractCompanionNameNode();
        const setStoreCollectionNode = createSetStoreCollectionNode();


        // Wire the flow
        this.startNode
            .next(n('tbc-system:validate', {
                verbose: this.config.verbose,
            }))
            .next(n('tbc-record-fs:fetch-records'))
            .next(extractCompanionIdNode)
            .next(n('tbc-record-fs:fetch-records'))
            .next(extractCompanionNameNode)
            .next(n('tbc-system:generate-role-definition'))
            .next(n('tbc-goose:generate-core'))
            .next(setStoreCollectionNode)
            .next(n('tbc-record-fs:store-records'))
            .next(logTableNode(shared['registry'], 'storeResults'));

        return super.run(shared);
    }

    validateConfig(config: IntGooseFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, IntGooseFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}