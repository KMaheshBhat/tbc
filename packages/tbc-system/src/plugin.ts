import { createPlugin } from '@hami-frameworx/core';

import { AddIdentityMessagesNode } from './ops/add-identity-messages.js';
import { AddManifestMessagesNode } from './ops/add-manifest-messages.js';
import { ClearMessagesNode } from './ops/clear-messages.js';
import { LoadSystemAssetsNode } from './ops/load-system-asset.js';
import { LogAndClearMessagesNode } from './ops/log-and-clear-messages.js';
import { PrepareRecordsManifestNode } from './ops/prepare-records-manifest.js';
import { ProbeNode } from './ops/probe.js';
import { ResolveCollectionsNode } from './ops/resolve-collections.js';
import { ResolveProtocolNode } from './ops/resolve-protocol.js';
import { ResolveRootDirectoryNode } from './ops/resolve-root-directory.js';
import { SynthesizeCollationDigestNode } from './ops/synthesize-collation-digest.js';
import { SynthesizeCollationMetadataNode } from './ops/synthesize-collation-metadata.js';
import { SynthesizeMemRecordsNode } from './ops/synthesize-mem-records.js';
import { SynthesizeRecordNode } from './ops/synthesize-record.js';
import { SynthesizeSysRecordsNode } from './ops/synthesize-sys-records.js';
import { SynthesizeValueNode } from './ops/synthesize-value.js';
import { ValidateSystemNode } from './ops/validate-system.js';

import { AddMintedMessagesNode } from './ops/add-minted-messages.js';
import { DexRebuildFlow } from './ops/dex-rebuild-flow.js';
import { GenerateTSIDsFlow } from './ops/generate-tsids-flow.js';
import { GenerateUUIDsFlow } from './ops/generate-uuids-flow.js';
import { InitFlow } from './ops/init-flow.js';
import { LoadCoreMemoriesFlow } from './ops/load-core-memories-flow.js';
import { LoadSpecificationsFlow } from './ops/load-specifications-flow.js';
import { PrepareMessagesNode } from './ops/prepare-messages.js';
import { ResolveFlow } from './ops/resolve-flow.js';
import { UpgradeFlow } from './ops/upgrade-flow.js';
import { ValidateFlow } from './ops/validate-flow.js';

/**
 * TBC System Plugin for HAMI.
 * Provides essential TBC system operations for probing environment information, initialization, validation, and core management.
 *
 * Included operations:
 * - Nodes:
 *   - `tbc-system:add-identity-messages`: Stage messages based on given target (companionRecord or primeRecord)
 *   - `tbc-system:add-manifest-messages`: Stage messages based on records manifest
 *   - `tbc-system:clear-messages`: Clear staged messages but add to allMessages
 *   - `tbc-system:load-system-assets`: Loads system assets into shared stage records
 *   - `tbc-system:log-and-clear-messages`: Log staged messages but add to allMessages
 *   - `tbc-system:prepare-records-manifest`: Recreates the stage.manifest from stage.records
 *   - `tbc-system:probe`: Probes the environment for TBC CLI version and OS/shell information
 *   - `tbc-system:resolve-collections`: Resolves collection names from protocol
 *   - `tbc-system:resolve-protocol`: Resolves the protocols by sniffing out artifacts
 *   - `tbc-system:resolve-root-directory`: Resolves working directory for TBC operations
 *   - `tbc-system:synthesize-collation-digest`: Collates content from multiple sources into a synthesized record
 *   - `tbc-system:synthesize-collation-metadata`: Extracts metadata from multiple sources into JSONL-formatted records
 *   - `tbc-system:synthesize-mem-records`: Generates initial Party (companion and prime) and Structure (map of memory) records
 *   - `tbc-system:synthesize-record`: Generates a single record for a given type using core templates
 *   - `tbc-system:synthesize-sys-records`: Generates system specification and connection records records
 *   - `tbc-system:synthesize-value`: Generic synthesis node for generating values based on system templates and input parameters
 *   - `tbc-system:validate-system`: Validates the loaded system manifest
 * - Flows:
 *   - `tbc-system:add-minted-messages`: Stage messages based on minted IDs
 *   - `tbc-system:dex-rebuild-flow`: Rebuild all indexes
 *   - `tbc-system:generate-tsids-flow`: Generation flow for TSID minting (batch only)
 *   - `tbc-system:generate-uuids-flow`: Generation flow for UUID minting (batch only)
 *   - `tbc-system:init-flow`: Comprehensive flow for initializing a TBC environment
 *   - `tbc-system:load-core-memories`: Flow for loading core memories (companion, prime, memoryMap) - protocol-aware
 *   - `tbc-system:load-specifications-flow`: Flow for loading system specifications
 *   - `tbc-system:prepare-messages`: Setup staged messages for TBC operations
 *   - `tbc-system:resolve-flow`: Flow for resolving root directory and protocol
 *   - `tbc-system:upgrade-flow`: Comprehensive flow for upgrading a TBC environment
 *   - `tbc-system:validate-flow`: Comprehensive flow for validating a TBC environment
 */
const TBCSystemPlugin = createPlugin(
    '@tbc-frameworx/tbc-system',
    '0.1.0',
    [
        // Nodes
        AddIdentityMessagesNode as any,
        AddManifestMessagesNode as any,
        ClearMessagesNode as any,
        LoadSystemAssetsNode as any,
        LogAndClearMessagesNode as any,
        PrepareRecordsManifestNode as any,
        ProbeNode as any,
        ResolveCollectionsNode as any,
        ResolveProtocolNode as any,
        ResolveRootDirectoryNode as any,
        SynthesizeCollationDigestNode as any,
        SynthesizeCollationMetadataNode as any,
        SynthesizeMemRecordsNode as any,
        SynthesizeRecordNode as any,
        SynthesizeSysRecordsNode as any,
        SynthesizeValueNode as any,
        ValidateSystemNode as any,
        // Flows
        AddMintedMessagesNode,
        DexRebuildFlow,
        GenerateTSIDsFlow,
        GenerateUUIDsFlow,
        InitFlow,
        LoadCoreMemoriesFlow,
        LoadSpecificationsFlow,
        PrepareMessagesNode,
        ResolveFlow,
        UpgradeFlow,
        ValidateFlow,
    ],
    'TBC System Plugin - Environment probing, initialization, validation, and core management operations',
);

export { TBCSystemPlugin };
