import { createPlugin, HAMIFlow, HAMINode } from '@hami-frameworx/core';

import { LoadAssetsNode } from './ops/load-assets.js';
import { SynthesizeIntegrationRecordsNode } from './ops/synthesize-integration-records.js';

/**
 * TBC Gemini Plugin for HAMI.
 * Provides operations for generating Gemini CLI integration files.
 *
 * Included operations:
 * - `tbc-gemini:load-assets`: Load templates
 * - `tbc-gemini:synthesize-integration-records`: Synthetize agent records for Gemini CLI interface
 */
const TBCGeminiPlugin = createPlugin(
  '@tbc-frameworx/tbc-gemini',
  '0.1.0',
  [
    // Nodes
    LoadAssetsNode,
    SynthesizeIntegrationRecordsNode,
  ] as unknown as (typeof HAMINode | typeof HAMIFlow)[],
  'TBC Gemini Plugin - Operations for Gemini CLI integration',
);

export { TBCGeminiPlugin };
