import assert from "assert";
import { Node } from "pocketflow";
import path from "path";

import { HAMIFlow, validateAgainstSchema } from "@hami-frameworx/core";
import type { HAMINodeConfigValidateResult, ValidationSchema } from "@hami-frameworx/core";
import { DexStore } from "../store/dex-store.js";
import type { Shared } from "../types.js";

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
        return "tbc-dex:graph-miner-flow";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-dex:fs-walker'))
            .next(n('tbc-dex:change-detector'))
            .next(n('tbc-dex:metadata-extractor'))
            .next(n('tbc-dex:presence-watermark'))
            .next(n('tbc-dex:schema-watermark'))
            .next(n('tbc-dex:structure-watermark'))
            .next(n('tbc-dex:links-watermark'))
            .next(n('tbc-dex:vector-watermark'))
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
        if (!shared.dexStore) {
            shared.rootDirectory = shared.rootDirectory || process.cwd();  // TODO below should be a node that uses `tbc-system:resolve`
            const dbPath = path.join(shared.rootDirectory, 'dex', 'tbc-view.db');
            shared.dexStore = new DexStore(dbPath);
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