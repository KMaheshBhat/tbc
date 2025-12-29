import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { createSetStoreCollectionNode, logTableNode } from "./common-nodes.js";

interface IntKilocodeFlowConfig {
    root?: string;
    verbose: boolean;
}

const IntKilocodeFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        root: { type: "string" },
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class IntKilocodeFlow extends HAMIFlow<Record<string, any>, IntKilocodeFlowConfig> {
    startNode: Node;
    config: IntKilocodeFlowConfig;

    constructor(config: IntKilocodeFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-interface:int-kilocode-flow";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // Determine root directory
        shared.rootDirectory = shared.root || process.cwd();

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        shared.collection = 'sys';
        shared.IDs = ['companion.id'];

        // Custom nodes
        const setStoreCollectionNode = createSetStoreCollectionNode();


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
            .next(n('tbc-kilocode:generate-core'))
            .next(setStoreCollectionNode)
            .next(n('tbc-record-fs:store-records'))
            .next(logTableNode(shared['registry'], 'storeResults'));

        return super.run(shared);
    }

    validateConfig(config: IntKilocodeFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, IntKilocodeFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}