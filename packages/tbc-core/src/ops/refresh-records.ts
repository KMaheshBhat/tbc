import { HAMIFlow } from "@hami-frameworx/core";
import { Node } from "pocketflow";
import { GenerateDexRecordsNode } from "./generate-dex-records.js";

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
        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Determine root directory
        const rootDir = shared.root || process.cwd();
        shared.rootDirectory = rootDir;

        // Create nodes
        const resolve = shared['registry'].createNode('tbc-core:resolve');

        // Fetch all record IDs from vault
        const fetchAllIDs = shared['registry'].createNode('tbc-record-fs:fetch-all-ids');
        shared.collection = 'vault';

        // Fetch all records
        const fetchRecords = shared['registry'].createNode('tbc-record-fs:fetch-records');

        // Group records by type
        const groupRecords = new GroupRecordsByTypeNode();

        // Generate dex records
        const generateRecords = shared['registry'].createNode('tbc-core:generate-dex-records', { verbose: this.config.verbose });

        // Store dex records
        const storeRecords = shared['registry'].createNode('tbc-record-fs:store-records');

        // Log Results
        const logResult = shared['registry'].createNode('core:log-result', {
            resultKey: 'storeResults',
            prefix: 'Records refresh completed:'
        });

        // Wire the flow
        this.startNode
            .next(resolve)
            .next(fetchAllIDs)
            .next(fetchRecords)
            .next(groupRecords)
            .next(generateRecords)
            .next(storeRecords)
            .next(logResult);

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