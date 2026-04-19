import { HAMINode } from '@hami-frameworx/core';
import { TBCRecord } from '@tbc-frameworx/tbc-record';

import { Shared } from '../types.js';

type NodeInput = {
    records: Record<string, any>;
    roleDefinition: string;
    companionName: string;
};

export class SynthesizeIntegrationRecordsNode extends HAMINode<Shared> {
    kind(): string {
        return 'tbc-pi:synthesize-integration-records';
    }

    async prep(shared: Shared): Promise<NodeInput> {
        return {
            records: shared.stage.records || {},
            roleDefinition: shared.stage.roleDefinition,
            companionName: shared.system.companionRecord.record_title,
        };
    }

    async exec(input: NodeInput): Promise<TBCRecord[]> {
        const {
            records,
            roleDefinition,
            companionName,
        } = input;
        const templates = records.templates || {};
        const result: TBCRecord[] = [];

        const agentsTemplate = templates['agent.md'] || '';
        if (agentsTemplate) {
            let hydratedAgentsContent = agentsTemplate
                .replace(/{{roleDefinition}}/g, roleDefinition)
                .replace(/{{companionName}}/g, companionName);
            result.push({
                id: '.pi/SYSTEM.md',
                contentType: 'raw',
                content: hydratedAgentsContent,
            });
        }

        return result;
    }

    async post(shared: Shared, _input: NodeInput, output: TBCRecord[]) {
        shared.stage.synthesized = {
            records: output,
        };
        return 'default';
    }
}