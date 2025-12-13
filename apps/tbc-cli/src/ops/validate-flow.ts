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

export class ValidateFlow extends HAMIFlow<Record<string, any>, ValidateFlowConfig> {
    startNode: Node;
    config: ValidateFlowConfig;

    constructor(config: ValidateFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-cli:validate-flow";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode;

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };
        // root is already set in shared state by CLI if --root flag was used

        this.startNode
            .next(n('tbc-core:resolve'))
            .next(n('tbc-core:validate', {
                verbose: this.config.verbose,
            }))
            .next(n('core:log-result', {
                resultKey: 'messages',
                format: 'table',
            }))
            ;

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