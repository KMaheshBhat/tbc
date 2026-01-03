import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface IntProbeFlowConfig {
    verbose: boolean;
}

const IntProbeFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class IntProbeFlow extends HAMIFlow<Record<string, any>, IntProbeFlowConfig> {
    startNode: Node;
    config: IntProbeFlowConfig;

    constructor(config: IntProbeFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-interface:int-probe-flow";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-system:validate', {
                verbose: this.config.verbose,
            }))
            .next(n('tbc-system:probe'))
            .next(n('core:log-result', {
                resultKey: 'probeResults',
                format: 'table',
                prefix: 'Environment Probe Results:',
                verbose: this.config.verbose
            }))
            ;
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.opts = { verbose: this.config.verbose };
        return super.run(shared);
    }

    validateConfig(config: IntProbeFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, IntProbeFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}