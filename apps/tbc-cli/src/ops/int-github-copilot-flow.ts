import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { ExtractCompanionId, createExtractCompanionNameNode, createSetStoreCollectionNode, logTableNode } from "./common-nodes.js";

interface IntGitHubCopilotFlowConfig {
    root?: string;
    verbose: boolean;
}

const IntGitHubCopilotFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        root: { type: "string" },
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class IntGitHubCopilotFlow extends HAMIFlow<Record<string, any>, IntGitHubCopilotFlowConfig> {
    startNode: Node;
    config: IntGitHubCopilotFlowConfig;

    constructor(config: IntGitHubCopilotFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-cli:int-github-copilot-flow";
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
            .next(n('tbc-github-copilot:generate-core'))
            .next(setStoreCollectionNode)
            .next(n('tbc-record-fs:store-records'))
            .next(logTableNode(shared['registry'], 'storeResults'));

        return super.run(shared);
    }

    validateConfig(config: IntGitHubCopilotFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, IntGitHubCopilotFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}
