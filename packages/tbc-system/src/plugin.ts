import { createPlugin } from '@hami-frameworx/core';

import { PrepareMessagesNode } from './ops/prepare-messages.js';
import { ClearMessagesNode } from './ops/clear-messages.js';
import { LogAndClearMessagesNode } from './ops/log-and-clear-messages.js';
import { ResolveRootDirectoryNode } from './ops/resolve-root-directory.js';
import { ResolveProtocolNode } from './ops/resolve-protocol.js';
import { AddMintedMessagesNode } from './ops/add-minted-messages.js';
import { AddManifestMessagesNode } from './ops/add-manifest-messages.js';
import { AddIdentityMessagesNode } from './ops/add-identity-messages.js';
import { LoadSystemAssetsNode } from './ops/load-system-asset.js';
import { PrepareRecordsManifestNode } from './ops/prepare-records-manifest.js';
import { SynthesizeMemRecordsNode } from './ops/synthesize-mem-records.js';
import { SynthesizeSysRecordsNode } from './ops/synthesize-sys-records.js';
import { SynthesizeRecordNode } from './ops/synthesize-record.js';
import { SynthesizeCollationDigestNode } from './ops/synthesize-collation-digest.js';
import { SynthesizeCollationMetadataNode } from './ops/synthesize-collation-metadata.js';
import { ProbeNode } from './ops/probe.js';
import { ValidateSystemNode } from './ops/validate-system.js';
import { InitFlow } from './ops/init-flow.js';
import { UpgradeFlow } from './ops/upgrade-flow.js';
import { SysValidateFlow } from './ops/validate-flow.js';
import { GenerateUUIDsFlow } from './ops/generate-uuids-flow.js';
import { GenerateTSIDsFlow } from './ops/generate-tsids-flow.js';
import { DexRebuildFlow } from './ops/dex-rebuild-flow.js';
import { SynthesizeValueNode } from './ops/synthesize-value.js';

/**
 * TBC System Plugin for HAMI.
 * Provides essential TBC system operations for probing environment information, initialization, validation, and core management.
 *
 * Included operations:
 * - `tbc-system:prepare-messages`: Setup staged messages for TBC operations
 * - `tbc-system:clear-messages`: Clear staged messages but add to allMessages
 * - `tbc-system:log-and-clear-messages`: Log staged messages but add to allMessages
 * - `tbc-system:resolve-root-directory`: Resolves working directory for TBC operations
 * - `tbc-system:resolve-protocol`: Resolves the protocols by sniffing out artifacts
 * - `tbc-system:add-minted-messages`: Stage messages based on minted IDs
 * - `tbc-system:add-manifest-messages`: Stage messages based on records manifest
 * - `tbc-system:add-identity-messages`: Stage messages based on given target (companionRecord or primeRecord)
 * - `tbc-system:load-system-assets`: Loads system assets into shared stage records
 * - `tbc-system:prepare-records-manifest`: Recreates the stage.manifest from stage.records
 * - `tbc-system:synthesize-mem-records`: Generates initial Party (companion and prime) and Structure (map of memory) records
 * - `tbc-system:synthesize-sys-records`: Generates system specification and connection records records
 * - `tbc-system:synthesize-record`: Generates a single record for a given type using core templates
 * - `tbc-system:synthesize-collation-digest`: Collates content from multiple sources into a synthesized record
 * - `tbc-system:synthesize-collation-metadata`: Extracts metadata from multiple sources into JSONL-formatted records
 * - `tbc-system:probe`: Probes the environment for TBC CLI version and OS/shell information
 * - `tbc-system:validate-system`: Validates the loaded system manifest
 * - `tbc-system:generate-role-definition`: Generates standard TBC role definition for AI integrations
 * - `tbc-system:init-flow`: Comprehensive flow for initializing a TBC environment
 * - `tbc-system:upgrade-flow`: Comprehensive flow for upgrading a TBC environment
 * - `tbc-system:validate-flow`: Comprehensive flow for validating a TBC environment
 * - `tbc-system:generate-uuids-flow`: Generation flow for UUID minting (batch only)
 * - `tbc-system:generate-tsids-flow`: Generation flow for TSID minting (batch only)
 * - `tbc-system:dex-rebuild-flow`: Rebuild all indexes
 * - `tbc-system:synthesize-value`: Generic synthesis node for generating values based on system templates and input parameters
 */
const TBCSystemPlugin = createPlugin(
    '@tbc-frameworx/tbc-system',
    '0.1.0',
    [
        PrepareMessagesNode as any,
        ClearMessagesNode as any,
        LogAndClearMessagesNode as any,
        ResolveRootDirectoryNode as any,
        ResolveProtocolNode as any,
        AddMintedMessagesNode as any,
        AddManifestMessagesNode as any,
        AddIdentityMessagesNode as any,
        LoadSystemAssetsNode as any,
        PrepareRecordsManifestNode as any,
        SynthesizeMemRecordsNode as any,
        SynthesizeSysRecordsNode as any,
        SynthesizeRecordNode as any,
        SynthesizeCollationDigestNode as any,
        SynthesizeCollationMetadataNode as any,
        ProbeNode as any,
        ValidateSystemNode as any,
        InitFlow as any,
        UpgradeFlow as any,
        SysValidateFlow as any,
        GenerateUUIDsFlow as any,
        GenerateTSIDsFlow as any,
        DexRebuildFlow as any,
        SynthesizeValueNode as any,
    ],
    'TBC System Plugin - Environment probing, initialization, validation, and core management operations',
);

export { TBCSystemPlugin };
