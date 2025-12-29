import { HAMIFlow } from "@hami-frameworx/core";
import { Node } from "pocketflow";

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
        return "tbc-view:refresh-extensions";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        const n = shared.registry.createNode.bind(shared.registry);

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Determine root directory
        const rootDir = shared.root || process.cwd();
        shared.rootDirectory = rootDir;

        // Set collection for fetch operations
        shared.collection = 'sys/ext';

        // Group extensions by type
        const groupExtensions = new GroupExtensionsByTypeNode();

        // Wire the flow
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-record-fs:fetch-all-ids'))
            .next(n('tbc-record-fs:fetch-records'))
            .next(groupExtensions)
            .next(n('tbc-view:generate-dex-extensions', { verbose: this.config.verbose }))
            .next(n('tbc-record-fs:store-records'))
            .next(n('core:log-result', { resultKey: 'storeResults', format: 'table'}))

        return super.run(shared);
    }
}