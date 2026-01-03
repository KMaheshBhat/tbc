import assert from "assert";

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
        return "tbc-generator:gen-uuid";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-generator:uuid'))
            .next(n('core:log-result', {
                resultKey: 'generatedIds',
                format: 'list',
                prefix: 'Generated UUIDs:',
                verbose: this.config.verbose
            }))
            ;
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.opts = { verbose: this.config.verbose };
        shared.count = shared.count || 1;
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