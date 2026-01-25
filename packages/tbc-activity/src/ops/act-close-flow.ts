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

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-system:validate', {
                verbose: this.config.verbose,
            }))
            .next(n('tbc-activity:check-activity-state'))
            .next(n('tbc-activity:validate-close-state'))
            .next(n('tbc-activity:assimilate-logs'))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'collection',
                'record.query': 'queryAllIDs',
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: ['tbc-record-fs:query-records'],
                verbose: this.config.verbose,
             }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs'
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: this.config.verbose,
            }))
            .next(n('tbc-activity:prepare-close-records'))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'collection',
                'record.records': 'records',
            }))
            .next(n('tbc-record:store-records-flow', {
                recordProviders: ['tbc-record-fs:store-records'],
                verbose: this.config.verbose,
            }))
            .next(n('tbc-activity:remove-activity-records'))
            .next(n('tbc-activity:move-activity-directory'))
            .next(n('core:log-result', {
                resultKey: 'activityId',
                format: 'text' as const,
                prefix: 'Closed activity:',
                verbose: this.config.verbose
            }));
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.opts = {
            verbose: this.config.verbose,
            activityId: this.config.activityId,
            targetState: 'archive',
        };
        shared.activityId = this.config.activityId;
        shared.queryAllIDs = {
            type: 'list-all-ids',
        }
        return super.run(shared);
    }
}