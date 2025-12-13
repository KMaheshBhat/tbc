import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface RefreshCoreFlowConfig {
    verbose: boolean;
}

const RefreshCoreFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class RefreshCoreFlow extends HAMIFlow<Record<string, any>, RefreshCoreFlowConfig> {
    startNode: Node;
    config: RefreshCoreFlowConfig;

    constructor(config: RefreshCoreFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-core:refresh-core";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Determine root directory
        const rootDir = shared.root || process.cwd();
        shared.rootDirectory = rootDir;

        // Initialize fetchResults
        shared.fetchResults = {};

        // Set collection names
        shared.rootCollection = 'tbc';
        shared.rootIDs = ['root'];
        shared.specsCollection = 'tbc/specs';
        shared.extensionsCollection = 'tbc/extensions';

        // Create nodes
        const resolve = shared['registry'].createNode('tbc-core:resolve');

        // Fetch records for root
        const mapRoot = shared['registry'].createNode('core:map', { 'collection': 'rootCollection', 'IDs': 'rootIDs' });
        const fetchRecordsRoot = shared['registry'].createNode('tbc-record-fs:fetch-records');

        // Fetch records for specs
        const mapSpecs = shared['registry'].createNode('core:map', { 'collection': 'specsCollection' });
        const fetchAllIDsSpecs = shared['registry'].createNode('tbc-record-fs:fetch-all-ids');
        const fetchRecordsSpecs = shared['registry'].createNode('tbc-record-fs:fetch-records');

        // Fetch records for extensions
        const mapExtensions = shared['registry'].createNode('core:map', { 'collection': 'extensionsCollection' });
        const fetchAllIDsExtensions = shared['registry'].createNode('tbc-record-fs:fetch-all-ids');
        const fetchRecordsExtensions = shared['registry'].createNode('tbc-record-fs:fetch-records');

        // Generate dex core record
        const generateCore = shared['registry'].createNode('tbc-core:generate-dex-core');
        
        // Store dex core record
        const storeCore = shared['registry'].createNode('tbc-record-fs:store-records');
        
        // Log Results
        const logResult = shared['registry'].createNode('core:log-result', { resultKey: 'storeResults' });

        // Wire the flow
        this.startNode
            .next(resolve)
            .next(mapRoot)
            .next(fetchRecordsRoot)
            .next(mapSpecs)
            .next(fetchAllIDsSpecs)
            .next(fetchRecordsSpecs)
            .next(mapExtensions)
            .next(fetchAllIDsExtensions)
            .next(fetchRecordsExtensions)
            .next(generateCore)
            .next(storeCore)
            .next(logResult)
            ;

        return super.run(shared);
    }

    validateConfig(config: RefreshCoreFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, RefreshCoreFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}
