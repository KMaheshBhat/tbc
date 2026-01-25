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

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-system:validate', {
                verbose: this.config.verbose,
            }))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'fetchCollection',
                'record.IDs': 'IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['fs'],
                verbose: this.config.verbose,
            }))
            .next(n('tbc-memory:extract-companion-id'))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'collection',
                'record.IDs': 'IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['fs'],
                verbose: this.config.verbose,
            }))
            .next(n('tbc-memory:extract-companion-name'))
            .next(n('tbc-activity:generate-activity-id'))
            .next(n('tbc-activity:check-activity-state'))
            .next(n('tbc-activity:validate-start-state'))
            .next(n('tbc-activity:move-activity-directory'))
            .next(n('tbc-activity:create-activity-log-stub'))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'collection',
                'record.records': 'records',
            }))
            .next(n('tbc-record:store-records-flow', {
                recordProviders: ['tbc-record-fs:store-records'],
                verbose: this.config.verbose,
            }))
            .next(n('core:log-result', {
                resultKey: 'createdRecordId',
                format: 'text' as const,
                prefix: 'Started activity:',
                verbose: this.config.verbose
            }));
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.opts = { 
            verbose: this.config.verbose,
            activityId: this.config.activityId,
        };
        shared.fetchCollection = 'sys';
        shared.IDs = ['companion.id'];
        return super.run(shared);
    }
}