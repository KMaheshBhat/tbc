import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, validateAgainstSchema } from "@hami-frameworx/core";
import type { HAMINodeConfigValidateResult, ValidationSchema } from "@hami-frameworx/core";

interface IntegrityReportFlowConfig {
    verbose: boolean;
    outputFormat: 'table' | 'json';
}

const IntegrityReportFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        outputFormat: { type: "string", enum: ["table", "json"] },
    },
    required: ["verbose", "outputFormat"],
};

export class IntegrityReportFlow extends HAMIFlow<Record<string, any>, IntegrityReportFlowConfig> {
    startNode: Node;
    config: IntegrityReportFlowConfig;

    constructor(config: IntegrityReportFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-dex:integrity-report-flow";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-dex:health-summary-query'))
            .next(n('tbc-dex:zombie-detection'))
            .next(n('tbc-dex:orphan-detection'))
            .next(n('tbc-dex:schema-violation-check'))
            .next(n('tbc-dex:repair-recommendations'))
            .next(n('tbc-dex:report-generator'))
            .next(n('core:log-result', {
                resultKey: 'integrityReport',
                format: this.config.outputFormat,
                prefix: 'SRE Integrity Report:',
                verbose: this.config.verbose
            }))
            ;
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.opts = {
            verbose: this.config.verbose,
        };
        // Initialize DexStore if not present
        if (!shared.dexStore) {
            shared.rootDirectory = shared.rootDirectory || process.cwd();  // TODO below should be a node that uses `tbc-system:resolve`
            const path = require('path');
            const dbPath = path.join(shared.rootDirectory, 'dex', 'tbc-view.db');
            const { DexStore } = await import('../store/dex-store.js');
            shared.dexStore = new DexStore(dbPath);
        }
        return super.run(shared);
    }

    validateConfig(config: IntegrityReportFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, IntegrityReportFlowConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}