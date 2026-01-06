import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { logTableNode } from "./common-nodes.js";

interface IntGooseFlowConfig {
    root?: string;
    verbose: boolean;
}

const IntGooseFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        root: { type: "string" },
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class IntGooseFlow extends HAMIFlow<Record<string, any>, IntGooseFlowConfig> {
    startNode: Node;
    config: IntGooseFlowConfig;

    constructor(config: IntGooseFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-interface:int-goose-flow";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-system:validate', {
                verbose: this.config.verbose,
            }))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'collection',
                'record.IDs': 'IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['fs'],
                verbose: this.config.verbose,
            }))
            .next(n('tbc-memory:extract-companion-id'))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'collection',
                'record.IDs': 'IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['fs'],
                verbose: this.config.verbose,
            }))
            .next(n('tbc-memory:extract-companion-name'))
            .next(n('tbc-system:generate-role-definition'))
            .next(n('tbc-goose:generate-core'))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'storeCollection',
                'record.records': 'records',
            }))
            .next(n('tbc-record:store-records-flow', {
                recordProviders: ['fs'],
                verbose: this.config.verbose,
            }))
            .next(logTableNode(shared['registry'], 'storeResults'))
            ;
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.opts = { 
            verbose: this.config.verbose,
        };
        shared.collection = 'sys';
        shared.storeCollection = '.';
        shared.IDs = ['companion.id'];
        return super.run(shared);
    }

    validateConfig(config: IntGooseFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, IntGooseFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}