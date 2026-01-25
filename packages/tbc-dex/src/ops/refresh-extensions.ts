import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, validateAgainstSchema } from "@hami-frameworx/core";
import type { HAMINodeConfigValidateResult, ValidationSchema } from "@hami-frameworx/core";

class GroupExtensionsByTypeNode extends Node {
    async prep(shared: Record<string, any>): Promise<any> {
        return shared.fetchResults?.["sys/ext"] || {};
    }

    async exec(prepRes: any): Promise<Record<string, any[]>> {
        const recordsByType: Record<string, any[]> = {};

        // Group records by record_type
        for (const [id, record] of Object.entries(prepRes as Record<string, any>)) {
            const recordType = (record as any).record_type || 'specification';
            if (!recordsByType[recordType]) {
                recordsByType[recordType] = [];
            }
            recordsByType[recordType].push(record);
        }

        return recordsByType;
    }

    async post(shared: Record<string, any>, prepRes: any, execRes: Record<string, any[]>): Promise<string | undefined> {
        shared.recordsByType = execRes;
        return 'default'; // Follow HAMI pattern
    }
}

interface RefreshExtensionsFlowConfig {
    verbose: boolean;
}

const RefreshExtensionsFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class RefreshExtensionsFlow extends HAMIFlow<Record<string, any>, RefreshExtensionsFlowConfig> {
    startNode: Node;
    config: RefreshExtensionsFlowConfig;

    constructor(config: RefreshExtensionsFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-dex:refresh-extensions";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // Group extensions by type
        const groupExtensions = new GroupExtensionsByTypeNode();

        // Wire the flow
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('core:assign', {
                'record.collection': 'extensionsCollection',
                'record.query': 'queryAllIDs',
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: ['tbc-record-fs:query-records'],
                verbose: this.config.verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: this.config.verbose,
            }))
            .next(groupExtensions)
            .next(n('tbc-dex:generate-dex-extensions', {
                verbose: this.config.verbose,
            }))
            .next(n('core:assign', {
                'record.collection': 'collection',
                'record.records': 'records',
            }))
            .next(n('tbc-record:store-records-flow', {
                recordProviders: ['tbc-record-fs:store-records'],
                verbose: this.config.verbose,
            }))
            .next(n('core:log-result', {
                resultKey: 'storeResults',
                format: 'table',
            }))
            ;
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Determine root directory
        const rootDir = shared.root || process.cwd();
        shared.rootDirectory = rootDir;
        shared.record = {
            rootDirectory: rootDir,
        }

        // Initialize fetchResults
        shared.fetchResults = {};

        // Set collection names
        shared.extensionsCollection = 'sys/ext';
        shared.queryAllIDs = {
            type: 'list-all-ids',
        }

        return super.run(shared);
    }

    validateConfig(config: RefreshExtensionsFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, RefreshExtensionsFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}