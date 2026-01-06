import assert from "assert";

import { Node } from "pocketflow";
import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { TBCRecordStorage, TBCQueryParams, TBCResult, TBCStore } from "../types";

interface QueryRecordsFlowConfig {
    verbose: boolean;
    recordProviders?: string[];
    root?: string;
}

const QueryRecordsFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        recordProviders: { type: "array", items: { type: "string" } },
        root: { type: "string" },
    },
    required: ["verbose"],
};

export class QueryRecordsFlow extends HAMIFlow<Record<string, any>, QueryRecordsFlowConfig> {
    startNode: Node;
    config: QueryRecordsFlowConfig;

    constructor(config: QueryRecordsFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-record:query-records-flow";
    }

    async prep(shared: TBCRecordStorage): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        const providers = this.config.recordProviders || [];
        // TODO validate `tbc-record-${provider}:query-records` exists for each provider
        let finalNode = new Node();
        let tailNode = providers.length > 0 ? new Node() : finalNode;
        this.startNode
            .next(new PrintNode("---Starting QueryFlow---"))
            .next(n("core:assign", { "record.result": "emptyQueryResult" }))
            .next(tailNode);
        for (const [i, provider] of providers.entries()) {
            const isLast = i === providers.length - 1;
            const targetNext = isLast ? finalNode : new Node();
            tailNode
                .next(new PrintNode(`---Querying records from ${provider}---`))
                .next(n("core:assign", { "record.result": "emptyQueryResult" }))
                .next(n(`tbc-record-${provider}:query-records`))
                .next(new AccumulateQueryNode())
                .next(new PrintNode('------'))
                .next(targetNext);
            tailNode = targetNext;
        }
        finalNode
            .next(n("core:assign", { "record.result": "accumulatedQueryResult" }))
            .next(n("core:assign", { "accumulatedQueryResult": "emptyQueryResult" }))
            .next(new PrintNode("---Completed QueryFlow---"));
    }

    async run(shared: TBCRecordStorage): Promise<string | undefined> {
        assert(shared.record, 'shared.record (operation state) is required');
        assert(shared.record.query, 'shared.record.query is required');
        shared.emptyQueryResult = { IDs: [] };
        const rootDir = shared.record.rootDirectory || this.config.root || process.cwd();
        shared.record.rootDirectory = rootDir;
        // Collection should be set by the caller or from shared state
        if (!shared.record.collection && shared.collection) {
            shared.record.collection = shared.collection;
        }
        return super.run(shared);
    }

    validateConfig(config: QueryRecordsFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, QueryRecordsFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}

class AccumulateQueryNode extends Node {
    async prep(shared: TBCRecordStorage): Promise<[TBCResult, TBCResult]> {
        return [shared.accumulatedQueryResult || { IDs: [] }, shared.record?.result || { IDs: [] }];
    }

    async exec(prepRes: [TBCResult, TBCResult]): Promise<TBCResult> {
        const [accumulated, incoming] = prepRes;
        const master: TBCResult = {
            IDs: [...(accumulated.IDs || []), ...(incoming.IDs || [])],
            totalCount: (accumulated.totalCount || 0) + (incoming.totalCount || 0),
        };
        // Merge records as TBCStore
        const accRecords = accumulated.records || {};
        const incRecords = incoming.records || {};
        const mergedRecords: TBCStore = { ...accRecords };
        for (const collection in incRecords) {
            mergedRecords[collection] = mergedRecords[collection] || {};
            for (const id in incRecords[collection]) {
                mergedRecords[collection][id] = {
                    ...(mergedRecords[collection][id] || {}),
                    ...incRecords[collection][id]
                };
            }
        }
        if (Object.keys(mergedRecords).length > 0) {
            master.records = mergedRecords;
        }
        return master;
    }

    async post(
        shared: TBCRecordStorage,
        _prepRes: [TBCResult, TBCResult],
        execRes: TBCResult,
    ): Promise<string | undefined> {
        shared.accumulatedQueryResult = execRes;
        return undefined;
    }
}

class PrintNode extends Node {
    message: string;
    isVerbose: boolean;
    constructor(message: string) {
        super();
        this.message = message;
        this.isVerbose = false;
    }
    async prep(shared: Record<string, any>): Promise<void> {
        this.isVerbose = shared.opts?.verbose || false;
    }
    async exec(): Promise<void> {
        if (this.isVerbose) {
            console.log(this.message);
        }
    }
}