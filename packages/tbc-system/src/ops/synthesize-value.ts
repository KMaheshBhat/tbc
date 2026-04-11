import assert from 'node:assert';

import { HAMINode } from '@hami-frameworx/core';
import { TBCRecord } from '@tbc-frameworx/tbc-record';
import { Shared, SynthesizeRequest } from '@tbc-frameworx/tbc-synthesize';

type NodeInput = {
    request: SynthesizeRequest;
    templates: Record<string, string>;
    companionName: string;
    primeName: string;
};

export class SynthesizeValueNode extends HAMINode<Shared> {
    kind(): string {
        return 'tbc-system:synthesize-value';
    }

    async prep(shared: Shared): Promise<NodeInput> {
        assert(shared.stage.synthesizeRequest, 'SynthesizeRequest is missing from stage.');
        return {
            request: shared.stage.synthesizeRequest,
            templates: shared.stage.records?.templates || {},
            companionName: shared.system.companionRecord?.record_title || 'companion',
            primeName: shared.system.primeRecord?.record_title || 'prime',
        };
    }

    async exec(input: NodeInput): Promise<any[]> {
        const { request, templates, companionName, primeName } = input;
        const { type } = request;

        const templateName = `${type}.md`;
        const template = templates[templateName];
        assert(template, `Template Error: Template [${templateName}] not found.`);

        let hydratedContent = template
            .replace(/{{\s*companionName\s*}}/g, companionName)
            .replace(/{{\s*primeName\s*}}/g, primeName)
            .trim() + '\n';

        return [hydratedContent];
    }

    async post(shared: Shared, _input: NodeInput, output: any[]): Promise<string> {
        shared.stage.synthesized = {
            values: output,
        };
        return 'default';
    }
}
