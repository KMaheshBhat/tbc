import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { logTableNode } from "./common-nodes.js";

interface IntGitHubCopilotFlowConfig {
    root?: string;
    verbose: boolean;
}

const IntGitHubCopilotFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        root: { type: "string" },
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class IntGitHubCopilotFlow extends HAMIFlow<Record<string, any>, IntGitHubCopilotFlowConfig> {
    startNode: Node;
    config: IntGitHubCopilotFlowConfig;

    constructor(config: IntGitHubCopilotFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-interface:int-github-copilot-flow";
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
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: this.config.verbose,
            }))
            .next(n('tbc-memory:extract-companion-id'))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'collection',
                'record.IDs': 'IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: this.config.verbose,
            }))
            .next(n('tbc-memory:extract-companion-name'))
            .next(n('tbc-system:generate-role-definition'))
            .next(n('tbc-github-copilot:generate-core'))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'storeCollection',
                'record.records': 'records',
            }))
            .next(n('tbc-record:store-records-flow', {
                recordProviders: ['tbc-record-fs:store-records'],
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

    validateConfig(config: IntGitHubCopilotFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, IntGitHubCopilotFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}