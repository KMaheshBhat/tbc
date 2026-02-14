import {
  HAMINode,
  HAMINodeConfigValidateResult,
  validateAgainstSchema,
  ValidationSchema,
} from '@hami-frameworx/core';

import { Shared } from '../types.js';

type IndexSource = {
  collection: string;
  idGlob: string;
  partitionKey?: string;
  excludeKeys?: string[];
};

type Config = {
  output: { collection: string; id: string };
  sources: IndexSource[];
};

const ConfigSchema: ValidationSchema = {
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
          partitionKey: { type: 'string' },
          excludeKeys: { type: 'array', items: { type: 'string' } },
        },
        required: ['collection', 'idGlob'],
      },
    },
  },
  required: ['output', 'sources'],
};

interface ExtractedMetadata {
  id: string;
  collection: string;
  partitionValue: string | null;
  data: Record<string, any>;
}

export class CollateMetadataIndexNode extends HAMINode<Shared, Config> {
  kind(): string {
    return 'tbc-dex:collate-metadata-index';
  }

  validateConfig(config: Config): HAMINodeConfigValidateResult {
    const result = validateAgainstSchema(config, ConfigSchema);
    return { valid: result.isValid, errors: result.errors || [] };
  }

  async prep(shared: Shared): Promise<ExtractedMetadata[]> {
    const allRecords = shared.stage?.records || {};
    const sources = this.config?.sources || [];
    const extracted: ExtractedMetadata[] = [];

    // Global defaults to always exclude from a metadata index
    const globalExcludes = ['content', 'fullContent'];

    for (const source of sources) {
      const bucket = allRecords[source.collection];
      if (!bucket) continue;

      for (const [id, record] of Object.entries(bucket)) {
        if (!this.matchesGlob(id, source.idGlob)) continue;

        const rawRecord = record as Record<string, any>;
        const customExcludes = source.excludeKeys || [];
        const allExcludes = [...globalExcludes, ...customExcludes];

        // Create a clean metadata object by filtering keys
        const filteredData = Object.keys(rawRecord)
          .filter(key => !allExcludes.includes(key))
          .reduce((obj, key) => {
            obj[key] = rawRecord[key];
            return obj;
          }, {} as Record<string, any>);

        extracted.push({
          id,
          collection: source.collection,
          // Use the rawRecord for partitioning logic
          partitionValue: source.partitionKey ? String(rawRecord[source.partitionKey] || 'unknown') : null,
          data: filteredData,
        });
      }
    }
    return extracted;
  }

  async exec(metadataList: ExtractedMetadata[]): Promise<Record<string, string>> {
    const fileGroups: Record<string, string[]> = {};
    const baseId = this.config!.output.id;

    for (const meta of metadataList) {
      // Determine filename: e.g., "party.memory.jsonl" or "skills.jsonl"
      const fileName = meta.partitionValue
        ? `${meta.partitionValue}.${baseId}`
        : baseId;

      if (!fileGroups[fileName]) fileGroups[fileName] = [];

      // Construct the index entry
      const entry = {
        id: meta.id,
        collection: meta.collection,
        ...meta.data,
      };

      fileGroups[fileName].push(JSON.stringify(entry));
    }

    // Join lines into JSONL format
    const outputMap: Record<string, string> = {};
    for (const [file, lines] of Object.entries(fileGroups)) {
      outputMap[file] = lines.join('\n');
    }

    return outputMap;
  }

  async post(shared: Shared, _input: any, outputMap: Record<string, string>): Promise<string> {
    const destCol = this.config!.output.collection;
    shared.stage[destCol] = shared.stage[destCol] || {};
    shared.stage[destCol].records = shared.stage[destCol].records || {};

    for (const [fileName, content] of Object.entries(outputMap)) {
      shared.stage[destCol].records[fileName] = {
        content,
        metadata: {
          type: 'index',
          generatedAt: new Date().toISOString(),
        },
      };
    }
    return 'default';
  }

  /**
   * Helper for Glob matching:
   * - '*' matches everything
   * - '*.md' matches extensions
   * - '* /SKILL.md' matches sub-directory structures
   */
  private matchesGlob(id: string, glob: string): boolean {
    if (glob === '*') return true;

    // Convert glob to regex:
    // 1. Escape dots
    // 2. Replace '*' with '.*' (non-greedy)
    // 3. Anchor start and end
    const pattern = glob
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');

    const regex = new RegExp(`^${pattern}$`);
    return regex.test(id);
  }
}
