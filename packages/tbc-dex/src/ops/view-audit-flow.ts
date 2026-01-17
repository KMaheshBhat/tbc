import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, validateAgainstSchema } from "@hami-frameworx/core";
import type { HAMINodeConfigValidateResult, ValidationSchema } from "@hami-frameworx/core";

interface ViewAuditFlowConfig {
    verbose: boolean;
    outputFormat: 'table' | 'json';
}

const ViewAuditFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        outputFormat: { type: "string", enum: ["table", "json"] },
    },
    required: ["verbose", "outputFormat"],
};

export class ViewAuditFlow extends HAMIFlow<Record<string, any>, ViewAuditFlowConfig> {
    startNode: Node;
    config: ViewAuditFlowConfig;

    constructor(config: ViewAuditFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-dex:view-audit-flow";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-dex:fs-walker'))
            .next(n('tbc-dex:change-detector'))
            .next(n('tbc-dex:metadata-extractor'))
            .next(n('tbc-dex:health-summary-query'))
            .next(n('tbc-dex:zombie-detection'))
            .next(n('tbc-dex:orphan-detection'))
            .next(n('tbc-dex:schema-violation-check'))
            .next(n('tbc-dex:repair-recommendations'))
            .next(n('tbc-dex:report-generator'))
            .next(n('core:log-result', {
                resultKey: 'integrityReport',
                format: this.config.outputFormat,
                prefix: 'Comprehensive System Audit:',
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

    validateConfig(config: ViewAuditFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ViewAuditFlowConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}