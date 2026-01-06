import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, validateAgainstSchema } from "@hami-frameworx/core";
import type { HAMINodeConfigValidateResult, ValidationSchema } from "@hami-frameworx/core";

interface RefreshRecordsFlowConfig {
    verbose: boolean;
}

const RefreshRecordsFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class RefreshRecordsFlow extends HAMIFlow<Record<string, any>, RefreshRecordsFlowConfig> {
    startNode: Node;
    config: RefreshRecordsFlowConfig;

    constructor(config: RefreshRecordsFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-view:refresh-records";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // Group records by type
        const groupRecords = new GroupRecordsByTypeNode();

        // Wire the flow
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('core:assign', {
                'record.collection': 'recordsCollection',
                'record.query': 'queryAllIDs',
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: ['fs'],
                verbose: this.config.verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['fs'],
                verbose: this.config.verbose,
            }))
            .next(groupRecords)
            .next(n('tbc-view:generate-dex-records', {
                verbose: this.config.verbose,
            }))
            .next(n('core:assign', {
                'record.collection': 'collection',
                'record.records': 'records',
            }))
            .next(n('tbc-record:store-records-flow', {
                recordProviders: ['fs'],
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
        shared.recordsCollection = 'mem';
        shared.dexRecordsCollection = 'dex/records';
        shared.queryAllIDs = {
            type: 'list-all-ids',
        }

        return super.run(shared);
    }

    validateConfig(config: RefreshRecordsFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, RefreshRecordsFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}

class GroupRecordsByTypeNode extends Node {
    async prep(shared: Record<string, any>): Promise<any> {
        return shared.record?.result?.records?.mem || {};
    }

    async exec(prepRes: any): Promise<Record<string, any[]>> {
        const recordsByType: Record<string, any[]> = {};

        // Group records by record_type
        for (const [id, record] of Object.entries(prepRes as Record<string, any>)) {
            const recordType = (record as any).record_type;
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