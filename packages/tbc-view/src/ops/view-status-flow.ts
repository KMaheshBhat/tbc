import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, validateAgainstSchema } from "@hami-frameworx/core";
import type { HAMINodeConfigValidateResult, ValidationSchema } from "@hami-frameworx/core";

interface ViewStatusFlowConfig {
    verbose: boolean;
}

const ViewStatusFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class ViewStatusFlow extends HAMIFlow<Record<string, any>, ViewStatusFlowConfig> {
    startNode: Node;
    config: ViewStatusFlowConfig;

    constructor(config: ViewStatusFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-view:view-status-flow";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // Simple status query
        this.startNode
            .next(n('tbc-view:health-summary-query'))
            .next(n('core:log-result', {
                resultKey: 'healthSummary',
                format: 'table' as const,
                prefix: 'System Health Status:',
                verbose: this.config.verbose
            }))
            ;
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.opts = { verbose: this.config.verbose };
        shared.rootDirectory = shared.rootDirectory || process.cwd();

        // Initialize ViewStore if not present
        if (!shared.viewStore) {
            const path = require('path');
            const dbPath = path.join(shared.rootDirectory, 'dex', 'tbc-view.db');
            const { ViewStore } = await import('../store/view-store.js');
            shared.viewStore = new ViewStore(dbPath);
        }

        return super.run(shared);
    }

    validateConfig(config: ViewStatusFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ViewStatusFlowConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}