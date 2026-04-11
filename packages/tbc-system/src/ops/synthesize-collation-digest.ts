import assert from 'node:assert';
import { HAMINode } from '@hami-frameworx/core';
import { TBCRecord } from '@tbc-frameworx/tbc-record';
import { Shared, SynthesizeRequest } from '@tbc-frameworx/tbc-synthesize';

/**
 * Configuration for a single collation source.
 */
type CollateSource = {
  /** Collection name to read from */
  collection: string;
  /** Glob pattern for ID matching: '*', '*.md', or exact ID */
  idGlob: string;
};

/**
 * Meta configuration for collation digest synthesis.
 * Passed via SynthesizeRequest.meta
 */
type CollateDigestMeta = {
  /** Array of sources to collate from */
  sources: CollateSource[];
  /** ID for the synthesized record */
  id: string;
};

type NodeInput = {
  request: SynthesizeRequest;
  sources: CollateSource[];
  selectedRecords: Array<{
    collection: string;
    id: string;
    content: string;
  }>;
};

/**
 * SynthesizeCollationDigestNode collates content from multiple sources
 * in shared.stage.records and outputs a synthesized TBCRecord.
 * 
 * This node is designed to be used as a provider for tbc-synthesize:synthesize-records-flow.
 * Configuration is passed via SynthesizeRequest.meta.
 * 
 * @example
 * const request: SynthesizeRequest = {
 *   type: 'digest',
 *   provider: 'tbc-system:synthesize-collation-digest',
 *   meta: {
 *     sources: [
 *       { collection: 'sys', idGlob: '*.md' },
 *       { collection: 'templates', idGlob: 'root.md' },
 *     ],
 *     id: 'collated-digest',
 *   },
 * };
 */
export class SynthesizeCollationDigestNode extends HAMINode<Shared> {
  kind(): string {
    return 'tbc-system:synthesize-collation-digest';
  }

  async prep(shared: Shared): Promise<NodeInput> {
    assert(shared.stage.synthesizeRequest, 'SynthesizeRequest is missing from stage.');
    const request = shared.stage.synthesizeRequest;
    const meta = request.meta as CollateDigestMeta;
    const sources = meta?.sources || [];
    
    const allRecords = shared.stage.records || {};
    const selectedRecords: NodeInput['selectedRecords'] = [];

    for (const source of sources) {
      const bucket = allRecords[source.collection];
      if (!bucket) continue;

      const ids = Object.keys(bucket);
      const matches = ids.filter(id => {
        if (source.idGlob === '*') return true;
        if (source.idGlob.startsWith('*.')) {
          return id.endsWith(source.idGlob.slice(1));
        }
        return id === source.idGlob;
      });

      for (const id of matches) {
        const record = bucket[id];
        const content = typeof record === 'string' 
          ? record 
          : (record.content || '');
        selectedRecords.push({ collection: source.collection, id, content });
      }
    }

    return { request, sources, selectedRecords };
  }

  async exec(input: NodeInput): Promise<TBCRecord[]> {
    const { request, selectedRecords } = input;
    const meta = request.meta as CollateDigestMeta;
    
    const recordId = meta?.id;

    // Collate content with source markers
    const collatedParts = selectedRecords.map(rec =>
      `<<<< SOURCE: ${rec.collection}/${rec.id} >>>>\n${rec.content}`
    );
    const content = collatedParts.join('\n\n');

    const record: TBCRecord = {
      id: recordId,
      content,
      contentType: 'raw',
    };

    return [record];
  }

  async post(shared: Shared, _input: NodeInput, output: TBCRecord[]): Promise<string> {
    shared.stage.synthesized = {
      records: output,
    };
    return 'default';
  }
}
