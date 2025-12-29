import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow } from "@hami-frameworx/core";

interface ActCloseFlowConfig {
    verbose: boolean;
    activityId: string;
}

export class ActCloseFlow extends HAMIFlow<Record<string, any>, ActCloseFlowConfig> {
    startNode: Node;
    config: ActCloseFlowConfig;

    constructor(config: ActCloseFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-activity:act-close-flow";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        shared.opts = { verbose: this.config.verbose, activityId: this.config.activityId, targetState: 'archive' };
        const rootDir = shared.root || process.cwd();
        shared.rootDirectory = rootDir;
        shared.activityId = this.config.activityId;

        this.startNode
            .next(n('tbc-activity:check-activity-state'))
            .next(n('tbc-activity:validate-close-state'))
            .next(n('tbc-activity:assimilate-logs'))
            .next(n('tbc-record-fs:fetch-all-ids'))
            .next(n('tbc-record-fs:fetch-records'))
            .next(n('tbc-activity:prepare-close-records'))
            .next(n('tbc-activity:prepare-mem-store'))
            .next(n('tbc-record-fs:store-records'))
            .next(n('tbc-activity:remove-activity-records'))
            .next(n('tbc-activity:move-activity-directory'))
            .next(n('core:log-result', {
                resultKey: 'activityId',
                format: 'text' as const,
                prefix: 'Closed activity:',
                verbose: this.config.verbose
            }));

        return super.run(shared);
    }
}