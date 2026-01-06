import assert from "assert";
import { Node } from "pocketflow";
import path from "path";

import { HAMIFlow, validateAgainstSchema } from "@hami-frameworx/core";
import type { HAMINodeConfigValidateResult, ValidationSchema } from "@hami-frameworx/core";
import { ViewStore } from "../store/view-store.js";
import type { TBCViewStorage } from "../types.js";

interface GraphMinerFlowConfig {
    verbose: boolean;
}

const GraphMinerFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class GraphMinerFlow extends HAMIFlow<Record<string, any>, GraphMinerFlowConfig> {
    startNode: Node;
    config: GraphMinerFlowConfig;

    constructor(config: GraphMinerFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-view:graph-miner-flow";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-view:fs-walker'))
            .next(n('tbc-view:change-detector'))
            .next(n('tbc-view:metadata-extractor'))
            .next(n('tbc-view:presence-watermark'))
            .next(n('tbc-view:schema-watermark'))
            .next(n('tbc-view:structure-watermark'))
            .next(n('tbc-view:links-watermark'))
            .next(n('tbc-view:vector-watermark'))
            .next(n('core:log-result', {
                resultKey: 'indexingResults',
                format: 'table' as const,
                prefix: 'Indexing completed:',
                verbose: this.config.verbose
            }));
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.opts = {
            verbose: this.config.verbose,
        };
        if (!shared.viewStore) {
            shared.rootDirectory = shared.rootDirectory || process.cwd();  // TODO below should be a node that uses `tbc-system:resolve`
            const dbPath = path.join(shared.rootDirectory, 'dex', 'tbc-view.db');
            shared.viewStore = new ViewStore(dbPath);
        }
        return super.run(shared);
    }

    validateConfig(config: GraphMinerFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, GraphMinerFlowConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}