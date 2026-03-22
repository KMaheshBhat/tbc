import { createPlugin } from '@hami-frameworx/core';

import { MintIDsFlow } from './ops/mint-ids-flow.js';
import { MintTSIDNode } from './ops/tsid.js';
import { MintUUIDNode } from './ops/uuid.js';

/**
 * TBC Mint Plugin for HAMI.
 * Provides essential TBC ID minting operations.
 *
 * Included operations:
 * - `tbc-mint:mint-ids-flow`: Flow to generate multiple IDs (keyed and batched) for given types
 * - `tbc-mint:tsid-mint`: Mints TSID IDs
 * - `tbc-mint:uuid-mint`: Mints UUID v7 IDs
 */
const TBCMintPlugin = createPlugin(
    '@tbc-frameworx/tbc-mint',
    '0.1.0',
    [
        MintIDsFlow as any,
        MintTSIDNode as any,
        MintUUIDNode as any,
    ],
    'TBC Mint Plugin - ID minting operations for TBC',
);

export { TBCMintPlugin };