import { HAMIFlow } from "@hami-frameworx/core";
import { Node } from "pocketflow";

interface RefreshRecordsFlowConfig {
    verbose: boolean;
}

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
        return "tbc-core:refresh-records";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        const n = shared.registry.createNode.bind(shared.registry);

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Determine root directory
        const rootDir = shared.root || process.cwd();
        shared.rootDirectory = rootDir;

        // Set collection for fetch operations
        shared.collection = 'vault';

        // Group records by type
        const groupRecords = new GroupRecordsByTypeNode();

        // Wire the flow
        this.startNode
            .next(n('tbc-core:resolve'))
            .next(n('tbc-record-fs:fetch-all-ids'))
            .next(n('tbc-record-fs:fetch-records'))
            .next(groupRecords)
            .next(n('tbc-core:generate-dex-records', { verbose: this.config.verbose }))
            .next(n('tbc-record-fs:store-records'))
            .next(n('core:log-result', {
                resultKey: 'storeResults',
                prefix: 'Records refresh completed:'
            }));

        return super.run(shared);
    }
}

class GroupRecordsByTypeNode extends Node {
    async prep(shared: Record<string, any>): Promise<any> {
        return shared.fetchResults?.vault || {};
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