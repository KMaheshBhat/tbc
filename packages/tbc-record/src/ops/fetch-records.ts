import assert from "assert";

import { Node } from "pocketflow";
import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { TBCRecordStorage, TBCStore } from "../types";

interface FetchRecordsFlowConfig {
    verbose: boolean;
    recordProviders?: string[];
    root?: string;
}

const FetchRecordsFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        recordProviders: { type: "array", items: { type: "string" } },
        root: { type: "string" },
    },
    required: ["verbose"],
};

export class FetchRecordsFlow extends HAMIFlow<Record<string, any>, FetchRecordsFlowConfig> {
    startNode: Node;
    config: FetchRecordsFlowConfig;

    constructor(config: FetchRecordsFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-record:fetch-records-flow";
    }

    async prep(shared: TBCRecordStorage): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        const providers = this.config.recordProviders || [];
        // TODO validate `tbc-record-${provider}:fetch-records` exists for each provider
        let finalNode = new Node();
        let tailNode = providers.length > 0 ? new Node() : finalNode;
        this.startNode
            .next(new PrintNode("---Starting FetchRecordsFlow---"))
            .next(n("core:assign", { "record.accumulate": "record.result.records" }))
            .next(tailNode);
        for (const [i, provider] of providers.entries()) {
            const isLast = i === providers.length - 1;
            const targetNext = isLast ? finalNode : new Node();
            tailNode
                .next(new PrintNode(`---Fetching records from ${provider}---`))
                .next(n("core:assign", { "record.results": "record.empty" }))
                .next(n(`tbc-record-${provider}:fetch-records`))
                .next(new AccumulateNode())
                .next(new PrintNode('------'))
                .next(targetNext);
            tailNode = targetNext;
        }
        finalNode
            .next(n("core:assign", { "record.result.records": "record.accumulate" }))
            .next(n("core:assign", { "record.accumulate": "record.empty" }))
            .next(new PrintNode("---Completed FetchRecordsFlow---"));
    }

    async run(shared: TBCRecordStorage): Promise<string | undefined> {
        assert(shared.record, 'shared.record (operation state) is required');
        shared.record.empty = {};
        const rootDir = shared.record.rootDirectory || this.config.root || process.cwd();
        shared.record.rootDirectory = rootDir;
        return super.run(shared);
    }

    validateConfig(config: FetchRecordsFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FetchRecordsFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}

class AccumulateNode extends Node {
    async prep(shared: TBCRecordStorage): Promise<[TBCStore, TBCStore]> {
        assert(shared.record, 'shared.record is required');
        return [shared.record?.accumulate || {}, shared.record?.result?.records || {}];
    }

    async exec(prepRes: [TBCStore, TBCStore]): Promise<TBCStore> {
        const [accumulated, incoming] = prepRes;
        const master = accumulated || {};
        for (const collection in incoming) {
            master[collection] = master[collection] || {};
            for (const id in incoming[collection]) {
                master[collection][id] = {
                    ...(master[collection][id] || {}),
                    ...incoming[collection][id]
                };
            }
        }
        return master;
    }

    async post(
        shared: TBCRecordStorage,
        _prepRes: [TBCStore, TBCStore],
        execRes: TBCStore,
    ): Promise<string | undefined> {
        assert(shared.record, 'shared.record is required');
        shared.record.accumulate = execRes;
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