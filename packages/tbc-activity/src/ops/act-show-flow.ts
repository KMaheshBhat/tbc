import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow } from "@hami-frameworx/core";

interface ActShowFlowConfig {
    verbose: boolean;
}

export class ActShowFlow extends HAMIFlow<Record<string, any>, ActShowFlowConfig> {
    startNode: Node;
    config: ActShowFlowConfig;

    constructor(config: ActShowFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-activity:act-show-flow";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-activity:list-activity-directories'))
            .next(n('core:log-result', {
                resultKey: 'currentActivities',
                format: 'text' as const,
                prefix: 'Current activities:',
                verbose: this.config.verbose
            }))
            .next(n('core:log-result', {
                resultKey: 'backlogActivities',
                format: 'text' as const,
                prefix: 'Backlog activities:',
                verbose: this.config.verbose
            }));
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.opts = {
            verbose: this.config.verbose,
        };
        return super.run(shared);
    }
}