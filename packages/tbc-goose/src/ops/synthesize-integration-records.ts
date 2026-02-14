import { HAMINode } from "@hami-frameworx/core";
import { TBCRecord } from "@tbc-frameworx/tbc-record";

import { Shared } from "../types.js";

type NodeInput = {
    records: Record<string, any>;
    roleDefinition: string;
};

export class SynthesizeIntegrationRecordsNode extends HAMINode<Shared> {
    kind(): string {
        return "tbc-goose:synthesize-integration-records";
    }

    async prep(shared: Shared): Promise<NodeInput> {
        return {
            records: shared.stage.records || {},
            roleDefinition: shared.stage.roleDefinition,
        };
    }

    async exec(input: NodeInput): Promise<TBCRecord[]> {
        const {
            records,
            roleDefinition,
        } = input;
        const templates = records.templates || {};
        const result: TBCRecord[] = [];

        const agentsTemplate = templates[".goosehints"] || "";
        if (agentsTemplate) {
            let hydratedAgentsContent = agentsTemplate
                .replace(/{{roleDefinition}}/g, roleDefinition)
                ;
            result.push({
                id: '.goosehints',
                contentType: 'raw',
                content: hydratedAgentsContent,
            })
        }

        return result;
    }

    async post(shared: Shared, _input: NodeInput, output: TBCRecord[]) {
        shared.stage.synthesized = {
            records: output
        };
        return "default";
    }
}