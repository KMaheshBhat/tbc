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
    return 'tbc-kilocode:synthesize-integration-records';
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

    const kilocodeModes = {
      customModes: [
        {
          slug: companionName.toLowerCase(),
          name: companionName,
          roleDefinition: roleDefinition,
          groups: ['read', 'edit', 'browser', 'command', 'mcp'],
          source: 'project',
        },
      ],
    };

    const result = [
      {
        id: '.kilocodemodes',
        filename: '.kilocodemodes',
        contentType: 'yaml',
        content: kilocodeModes,
      },
    ];

    return result;
  }

  async post(shared: Shared, _input: NodeInput, output: TBCRecord[]) {
    shared.stage.synthesized = {
      records: output,
    };
    return 'default';
  }
}
