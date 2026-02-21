import { createPlugin } from '@hami-frameworx/core';

import { CollateDigestNode } from './ops/collate-digest.js';
import { CollateMetadataIndexNode } from './ops/collate-metadata-index.js';
import { QueryIndicesNode } from './ops/query-indices.js';
import { SyncIncrementalIndexNode } from './ops/sync-incremental-index.js';

/**
 * TBC Dex Plugin for HAMI.
 * Provides essential TBC dex operations for generating and refreshing indexes.
 *
 * Included operations:
 * - `tbc-dex:collate-digest`: Collates a root and system definitions
 * - `tbc-dex:collate-metadata-index`: Collates JSONL based index from metadata of records
 * - `tbc-dex:sync-incremental-index`: Incremental update of JSONL based index for dirty records
 * - `tbc-dex:query-indices`: Query indices for provided query term
 */
const TBCDexPlugin = createPlugin(
  '@tbc-frameworx/tbc-dex',
  '0.1.0',
  [
    CollateDigestNode as any,
    CollateMetadataIndexNode as any,
    SyncIncrementalIndexNode as any,
    QueryIndicesNode as any,
  ],
  'TBC Dex Plugin - Index generation and refresh operations',
);

export { TBCDexPlugin };
