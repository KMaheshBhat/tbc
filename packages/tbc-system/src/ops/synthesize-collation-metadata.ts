import assert from 'node:assert';
import { HAMINode } from '@hami-frameworx/core';
import { TBCRecord } from '@tbc-frameworx/tbc-record';
import { Shared, SynthesizeRequest } from '@tbc-frameworx/tbc-synthesize';
import { YAML } from 'bun';

/**
 * Configuration for a single metadata index source.
 */
type IndexSource = {
  /** Collection name to read from */
  collection: string;
  /** Glob pattern for ID matching: '*', '*.md', or exact ID */
  idGlob: string;
  /** Optional key to partition output into multiple files */
  partitionKey?: string;
  /** Optional keys to exclude from the metadata index */
  excludeKeys?: string[];
};

/**
 * Meta configuration for collation metadata index synthesis.
 * Passed via SynthesizeRequest.meta
 */
type CollateMetadataMeta = {
  /** Array of sources to extract metadata from */
  sources: IndexSource[];
  /** Base ID for the synthesized records (may be suffixed with partition value) */
  id: string;
};

interface ExtractedMetadata {
  id: string;
  collection: string;
  partitionValue: string | null;
  data: Record<string, any>;
}

type NodeInput = {
  request: SynthesizeRequest;
  sources: IndexSource[];
  extractedMetadata: ExtractedMetadata[];
};


export class SynthesizeCollationMetadataNode extends HAMINode<Shared> {
  kind(): string {
    return 'tbc-system:synthesize-collation-metadata';
  }

  async prep(shared: Shared): Promise<NodeInput> {
    assert(shared.stage.synthesizeRequest, 'SynthesizeRequest is missing from stage.');
    const request = shared.stage.synthesizeRequest;
    const meta = request.meta as CollateMetadataMeta;
    const sources = meta?.sources || [];
    
    const allRecords = shared.stage.records || {};
    const extractedMetadata: ExtractedMetadata[] = [];

    // Global defaults to always exclude from a metadata index
    const globalExcludes = ['content', 'fullContent', 'data'];

    for (const source of sources) {
      const bucket = allRecords[source.collection];
      if (!bucket) continue;

      for (const [id, record] of Object.entries(bucket)) {
        if (!this.matchesGlob(id, source.idGlob)) continue;

        const regex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
        const match = (record as string).match(regex);
        if (!match) {
          continue;
        }
        const frontmatter  = YAML.parse(match[1]) as Record<string, any>;
        const customExcludes = source.excludeKeys || [];
        const allExcludes = [...globalExcludes, ...customExcludes];
        // Create a clean metadata object by filtering keys
        const filteredData = Object.keys(frontmatter)
          .filter(key => !allExcludes.includes(key))
          .reduce((obj, key) => {
            obj[key] = frontmatter[key];
            return obj;
          }, {} as Record<string, any>);

        extractedMetadata.push({
          id,
          collection: source.collection,
          // Use the rawRecord for partitioning logic
          partitionValue: source.partitionKey ? String(frontmatter[source.partitionKey] || 'unknown') : null,
          data: filteredData,
        });
      }
    }

    return { request, sources, extractedMetadata };
  }

  async exec(input: NodeInput): Promise<TBCRecord[]> {
    const { request, extractedMetadata } = input;
    const meta = request.meta as CollateMetadataMeta;
    const baseId = meta?.id;

    const fileGroups: Record<string, string[]> = {};

    for (const meta of extractedMetadata) {
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

    // Convert to TBCRecord array
    const records: TBCRecord[] = [];
    for (const [fileName, lines] of Object.entries(fileGroups)) {
      records.push({
        id: fileName,
        content: lines.join('\n'),
        contentType: 'raw',
      });
    }

    return records;
  }

  async post(shared: Shared, _input: NodeInput, output: TBCRecord[]): Promise<string> {
    shared.stage.synthesized = {
      records: output,
    };
    return 'default';
  }

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