import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface ValidateFlowConfig {
    verbose: boolean;
}

const ValidateFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class SysValidateFlow extends HAMIFlow<Record<string, any>, ValidateFlowConfig> {
    startNode: Node;
    config: ValidateFlowConfig;

    constructor(config: ValidateFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-system:sys-validate-flow";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-system:validate', {
                verbose: this.config.verbose,
            }))
            .next(n('core:log-result', {
                resultKey: 'messages',
                format: 'table',
            }))
            ;
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.opts = {
            verbose: this.config.verbose,
        };
        return super.run(shared);
    }

    validateConfig(config: ValidateFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ValidateFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}