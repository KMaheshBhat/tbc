import {
  HAMINode,
  HAMINodeConfigValidateResult,
  validateAgainstSchema,
  ValidationSchema,
} from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface Config {
  query?: string;
  type?: string;
  limit: number;
  outputKey: string;
}

export interface DexMatch {
  id: string;
  title: string;
  tags: string[];
  type: string;
  path: string;
}

// Data packet passed from prep to exec
interface PrepResult {
  queryStr: string;
  limit: number;
  contents: string[];
}

export class QueryIndicesNode extends HAMINode<Shared, Config> {
  kind(): string {
    return 'tbc-dex:query-indices';
  }

  // packages/tbc-dex/src/ops/query-indices.ts

  async prep(shared: Shared): Promise<PrepResult> {
    // 1. Correct the path based on PrepareRecordsManifestNode
    // shared.stage.records['dex'] is the map of filename -> { content }
    const dexCollection = shared.stage?.records?.['dex'] || {};

    const queryType = this.config?.type;

    // 2. Filter to ONLY include memory indices
    const allKeys = Object.keys(dexCollection);
    const memoryIndexKeys = allKeys.filter((k) => k.endsWith('.memory.jsonl'));

    let targetFileKeys: string[] = [];

    if (queryType) {
      const specificMatch = `${queryType}.memory.jsonl`;
      // Use the partition if it exists, otherwise filter by prefix
      targetFileKeys = dexCollection[specificMatch]
        ? [specificMatch]
        : memoryIndexKeys.filter((k) => k.startsWith(queryType));
    } else {
      targetFileKeys = memoryIndexKeys;
    }

    const contents = targetFileKeys
      .map((key) => {
        const entry = dexCollection[key];
        return typeof entry === 'string' ? entry : entry?.content;
      })
      .filter((c): c is string => !!c);

    return {
      queryStr: (this.config?.query || '').toLowerCase(),
      limit: this.config?.limit || 10,
      contents,
    };
  }

  async exec(prepRes: PrepResult): Promise<DexMatch[]> {
    const { queryStr, limit, contents } = prepRes;
    let allMatches: DexMatch[] = [];

    for (const content of contents) {
      // 1. Split and reverse to prioritize the 'bottom' of the file (newest)
      const lines = content.split('\n').reverse();

      for (const line of lines) {
        // We don't break yet because we might need to sort
        // across multiple files if 'type' wasn't specified
        if (!line.trim()) continue;

        try {
          const entry = JSON.parse(line);
          const searchText = [
            entry.record_title,
            entry.title,
            entry.id,
            ...(entry.record_tags || []),
            entry.party_type || '',
          ]
            .join(' ')
            .toLowerCase();

          if (!queryStr || searchText.includes(queryStr)) {
            allMatches.push({
              id: entry.id,
              title: entry.record_title || entry.title || entry.id,
              tags: entry.record_tags || [],
              type: entry.record_type || 'unknown',
              path: entry.path || '',
            });
          }
        } catch (e) {
          continue;
        }
      }
    }

    // 2. Global Sort by ID descending (UUIDv7 = Chronological)
    // This ensures that even if 'note.jsonl' and 'goal.jsonl' are mixed,
    // the truly newest items stay at the top.
    allMatches.sort((a, b) => b.id.localeCompare(a.id));

    // 3. Apply the limit AFTER sorting
    return allMatches.slice(0, limit);
  }

  async post(shared: Shared, _prep: PrepResult, matches: DexMatch[]): Promise<string> {
    shared.stage[this.config!.outputKey] = matches;

    shared.stage.messages = shared.stage.messages || [];
    shared.stage.messages.push({
      level: 'debug',
      source: 'tbc-dex',
      message: `DEX scan complete. Matches found: ${matches.length}`,
    });

    return 'default';
  }

  validateConfig(config: Config): HAMINodeConfigValidateResult {
    const schema: ValidationSchema = {
      type: 'object',
      properties: {
        query: { type: 'string' },
        type: { type: 'string' },
        limit: { type: 'number' },
        outputKey: { type: 'string' },
      },
      required: ['limit', 'outputKey'],
    };
    const result = validateAgainstSchema(config, schema);
    return { valid: result.isValid, errors: result.errors || [] };
  }
}
