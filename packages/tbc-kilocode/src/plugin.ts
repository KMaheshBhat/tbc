import { createPlugin } from '@hami-frameworx/core';

import { LoadAssetsNode } from './ops/load-assets.js';
import { SynthesizeIntegrationRecordsNode } from './ops/synthesize-integration-records.js';

/**
 * TBC Kilo Code Plugin for HAMI.
 * Provides operations for generating Kilo Code integration files.
 *
 * Included operations:
 * - `tbc-kilocode:load-assets`: Load templates
 * - `tbc-kilocode:synthesize-integration-records`: Synthetize agent records for Kilo Code interface
 */
const TBCKilocodePlugin = createPlugin(
  '@tbc-frameworx/tbc-kilocode',
  '0.1.0',
  [
    LoadAssetsNode as any,
    SynthesizeIntegrationRecordsNode as any,
  ],
  'TBC Kilo Code Plugin - Operations for Kilo Code integration',
);

export { TBCKilocodePlugin };
