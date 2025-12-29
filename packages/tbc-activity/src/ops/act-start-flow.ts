import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow } from "@hami-frameworx/core";

interface ActStartFlowConfig {
    verbose: boolean;
    activityId?: string;
}

export class ActStartFlow extends HAMIFlow<Record<string, any>, ActStartFlowConfig> {
    startNode: Node;
    config: ActStartFlowConfig;

    constructor(config: ActStartFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-activity:act-start-flow";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        shared.opts = { verbose: this.config.verbose, activityId: this.config.activityId };

        const rootDir = shared.root || process.cwd();
        shared.rootDirectory = rootDir;

        // Fetch companion info
        shared.collection = 'sys';
        shared.IDs = ['companion.id'];

        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-record-fs:fetch-records'))
            .next(n('tbc-memory:extract-companion-id'))
            .next(n('tbc-record-fs:fetch-records'))
            .next(n('tbc-memory:extract-companion-name'))
            .next(n('tbc-activity:generate-activity-id'))
            .next(n('tbc-activity:check-activity-state'))
            .next(n('tbc-activity:validate-start-state'))
            .next(n('tbc-activity:move-activity-directory'))
            .next(n('tbc-activity:create-activity-log-stub'))
            .next(n('tbc-record-fs:store-records'))
            .next(n('core:log-result', {
                resultKey: 'createdRecordId',
                format: 'text' as const,
                prefix: 'Started activity:',
                verbose: this.config.verbose
            }));

        return super.run(shared);
    }
}