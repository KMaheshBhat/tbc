import assert from "assert";

import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface GenTsidFlowConfig {
    verbose: boolean;
}

const GenTsidFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class GenTsidFlow extends HAMIFlow<Record<string, any>, GenTsidFlowConfig> {
    startNode: Node;
    config: GenTsidFlowConfig;

    constructor(config: GenTsidFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-cli:gen-tsid";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode;
        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };
        shared.count = shared.count || 1;

        // Wire the flow
        this.startNode
            .next(n('tbc-generator:tsid'))
            .next(n('core:log-result', {
                resultKey: 'generatedIds',
                format: 'list',
                prefix: 'Generated TSIDs:',
                verbose: this.config.verbose
            }));

        return super.run(shared);
    }

    validateConfig(config: GenTsidFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, GenTsidFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}