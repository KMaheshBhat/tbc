import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface GenUuidFlowConfig {
    verbose: boolean;
}

const GenUuidFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class GenUuidFlow extends HAMIFlow<Record<string, any>, GenUuidFlowConfig> {
    startNode: Node;
    config: GenUuidFlowConfig;

    constructor(config: GenUuidFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-cli:gen-uuid";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Set count in shared state
        shared.count = shared.count || 1;

        // Create nodes
        const uuidNode = shared['registry'].createNode('tbc-generator:uuid');
        const logResult = shared['registry'].createNode('core:log-result', {
            resultKey: 'generatedIds',
            format: 'list',
            prefix: 'Generated UUIDs:',
            verbose: this.config.verbose
        });

        // Wire the flow
        this.startNode
            .next(uuidNode)
            .next(logResult);

        return super.run(shared);
    }

    validateConfig(config: GenUuidFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, GenUuidFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}