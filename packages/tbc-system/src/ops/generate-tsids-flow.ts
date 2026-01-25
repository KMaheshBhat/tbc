import assert from "assert";

import { Node } from "pocketflow";

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from "../types";

interface FlowConfig {
    verbose?: boolean;
    count: number;
}

const FlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        count: { type: "number" },
    },
};

class GenerateTSIDsFlowStartNode extends HAMINode<Shared, FlowConfig> {
    constructor(config?: FlowConfig, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return "tbc-system:generate-tsids-flow-start"
    }

    async post(shared: Record<string, any>, prepRes: unknown, execRes: unknown): Promise<string> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        return "default";
    }
}

export class GenerateTSIDsFlow extends HAMIFlow<Record<string, any>, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new GenerateTSIDsFlowStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-system:generate-tsids-flow";
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-mint:mint-ids-flow', {
                requests: [
                    { type: 'tbc-mint:tsid-mint', 'count': this.config.count },
                ],
            }))
            .next(n('tbc-system:add-minted-messages', {
                source: 'generate-uuids-flow',
                level: 'info',
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            ;
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        return super.run(shared);
    }

}

