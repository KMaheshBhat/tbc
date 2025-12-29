import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow } from "@hami-frameworx/core";

interface ActBacklogFlowConfig {
    verbose: boolean;
    activityId: string;
}

export class ActBacklogFlow extends HAMIFlow<Record<string, any>, ActBacklogFlowConfig> {
    startNode: Node;
    config: ActBacklogFlowConfig;

    constructor(config: ActBacklogFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-activity:act-backlog-flow";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        shared.opts = { verbose: this.config.verbose, activityId: this.config.activityId };
        shared.rootDirectory = shared.root || process.cwd();
        shared.activityId = this.config.activityId;

        this.startNode
            .next(n('tbc-activity:check-activity-state'))
            .next(n('tbc-activity:validate-backlog-state'))
            .next(n('tbc-activity:move-activity-directory'))
            .next(n('core:log-result', {
                resultKey: 'activityId',
                format: 'text' as const,
                prefix: 'Moved activity to backlog:',
                verbose: this.config.verbose
            }));

        return super.run(shared);
    }
}