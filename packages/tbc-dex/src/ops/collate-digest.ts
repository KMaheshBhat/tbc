import {
  HAMINode,
  HAMINodeConfigValidateResult,
  validateAgainstSchema,
  ValidationSchema,
} from '@hami-frameworx/core';

import { Shared } from '../types.js';

/**
 * Enhanced DX Config
 */
type CollateSource = {
  collection: string;
  idGlob: string; // e.g. 'root.md', '*.md', or 'UUID'
};

type CollateConfig = {
  output: { collection: string; id: string };
  sources: CollateSource[];
};

const CollateConfigSchema: ValidationSchema = {
  type: 'object',
  properties: {
    output: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        id: { type: 'string' },
      },
      required: ['collection', 'id'],
    },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          collection: { type: 'string' },
          idGlob: { type: 'string' },
        },
        required: ['collection', 'idGlob'],
      },
    },
  },
  required: ['output', 'sources'],
};

type NodeInput = {
  selectedRecords: Array<{ collection: string; id: string; content: string }>;
};

type NodeOutput = {
  destination: { collection: string; id: string };
  collatedContent: string;
  sourceSummary: string[];
};

export class CollateDigestNode extends HAMINode<Shared, CollateConfig> {
  kind(): string {
    return 'tbc-dex:collate-digest';
  }

  validateConfig(config: CollateConfig): HAMINodeConfigValidateResult {
    const result = validateAgainstSchema(config, CollateConfigSchema);
    return { valid: result.isValid, errors: result.errors || [] };
  }

  async prep(shared: Shared): Promise<NodeInput> {
    const allRecords = shared.stage?.records || {};
    const sources = this.config?.sources || [];
    const selectedRecords: NodeInput['selectedRecords'] = [];

    for (const source of sources) {
      const bucket = allRecords[source.collection];
      if (!bucket) continue;

      // Simple ID or Glob matching
      const ids = Object.keys(bucket);
      const matches = ids.filter((id) => {
        if (source.idGlob === '*') return true;
        if (source.idGlob.startsWith('*.')) {
          return id.endsWith(source.idGlob.slice(1));
        }
        return id === source.idGlob;
      });

      for (const id of matches) {
        const record = bucket[id];
        const content = typeof record === 'string' ? record : record.content || '';
        selectedRecords.push({ collection: source.collection, id, content });
      }
    }

    return { selectedRecords };
  }

  async exec(input: NodeInput): Promise<NodeOutput> {
    const collatedParts = input.selectedRecords.map(
      (rec) => `<<< SOURCE: ${rec.collection}/${rec.id} >>>\n${rec.content}`,
    );

    return {
      destination: this.config!.output,
      collatedContent: collatedParts.join('\n\n'),
      sourceSummary: input.selectedRecords.map((r) => `${r.collection}/${r.id}`),
    };
  }

  async post(shared: Shared, _input: NodeInput, output: NodeOutput): Promise<string> {
    shared.stage = shared.stage || {};
    // Dynamically use the collection from output config
    shared.stage[output.destination.collection] = shared.stage[output.destination.collection] || {};
    shared.stage[output.destination.collection].records =
      shared.stage[output.destination.collection].records || {};

    shared.stage[output.destination.collection].records[output.destination.id] = {
      content: output.collatedContent,
      metadata: {
        type: 'digest',
        sources: output.sourceSummary,
        generatedAt: new Date().toISOString(),
      },
    };

    return 'default';
  }
}
