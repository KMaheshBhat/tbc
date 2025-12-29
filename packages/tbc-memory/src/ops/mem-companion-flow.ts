import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface MemCompanionFlowConfig {
    verbose: boolean;
    show: 'id' | 'name' | 'full';
}

const MemCompanionFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        show: { type: "string", enum: ["id", "name", "full"] },
    },
    required: ["verbose", "show"],
};

export class MemCompanionFlow extends HAMIFlow<Record<string, any>, MemCompanionFlowConfig> {
    startNode: Node;
    config: MemCompanionFlowConfig;

    constructor(config: MemCompanionFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-memory:mem-companion-flow";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose, show: this.config.show };

        // First fetch companion.id from sys
        shared.collection = 'sys';
        shared.IDs = ['companion.id'];

        // Wire the flow
        let flow = this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-record-fs:fetch-records'))
            .next(n('tbc-memory:extract-companion-id'));

        if (this.config.show === 'name' || this.config.show === 'full') {
            flow = flow
                .next(n('tbc-record-fs:fetch-records'))
                .next(n('tbc-memory:extract-companion-name'));
        }

        if (this.config.show === 'full') {
            flow = flow
                .next(n('tbc-memory:extract-companion-record'));
        }

        const resultKey = this.config.show === 'id' ? 'companionId' :
                         this.config.show === 'name' ? 'companionName' : 'companionRecord';
        const format = this.config.show === 'full' ? 'table' : 'text';
        const prefix = this.config.show === 'id' ? 'Companion ID:' :
                      this.config.show === 'name' ? 'Companion Name:' : 'Companion Record:';

        flow.next(n('core:log-result', {
            resultKey,
            format,
            prefix,
            verbose: this.config.verbose
        }));

        return super.run(shared);
    }

    validateConfig(config: MemCompanionFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, MemCompanionFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}