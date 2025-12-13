import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface ProbeFlowConfig {
    verbose: boolean;
}

const ProbeFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class ProbeFlow extends HAMIFlow<Record<string, any>, ProbeFlowConfig> {
    startNode: Node;
    config: ProbeFlowConfig;

    constructor(config: ProbeFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-cli:probe-flow";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode;

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        this.startNode
            .next(n('tbc-core:resolve'))
            .next(n('tbc-core:validate', {
                verbose: this.config.verbose,
            }))
            .next(n('tbc-core:probe'))
            .next(n('core:log-result', {
                resultKey: 'probeResults',
                format: 'table',
                prefix: 'Environment Probe Results:',
                verbose: this.config.verbose
            }))
            ;

        return super.run(shared);
    }

    validateConfig(config: ProbeFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ProbeFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}