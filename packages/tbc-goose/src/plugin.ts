import { createPlugin } from '@hami-frameworx/core';

import { LoadAssetsNode } from './ops/load-assets.js';
import { SynthesizeIntegrationRecordsNode } from './ops/synthesize-integration-records.js';

/**
 * TBC Goose Plugin for HAMI.
 * Provides operations for generating Goose integration files.
 *
 * Included operations:
 * - `tbc-goose:load-assets`: Load templates
 * - `tbc-goose:synthesize-integration-records`: Synthetize agent records for Goose CLI interface
 */
const TBCGoosePlugin = createPlugin(
  '@tbc-frameworx/tbc-goose',
  '0.1.0',
  [
    LoadAssetsNode as any,
    SynthesizeIntegrationRecordsNode as any,
  ],
  'TBC Goose Plugin - Operations for Goose integration',
);

export { TBCGoosePlugin };
