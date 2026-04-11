import { HAMIRegistrationManager } from '@hami-frameworx/core';
import { TBCSystemOperation } from '@tbc-frameworx/tbc-system';
import { TBCRecordOperation } from '@tbc-frameworx/tbc-record';

/**
 * Shared storage interface for TBC activity operations.
 * Defines the structure of data that can be shared between TBC activity operation nodes.
 */
type Shared = {
    /** HAMI registration manager for node creation and management. */
    registry: HAMIRegistrationManager;
    /** Dynamic stage storage for flow-specific data. */
    stage: Record<string, any>;
    /** System operations instance. */
    system: TBCSystemOperation;
    /** Record operations instance. */
    record: TBCRecordOperation;
    /** Whether to enable verbose logging. */
    verbose?: boolean;
    /** Root directory for operations. */
    rootDirectory?: string;
    /** Activity ID (UUID). */
    activityId?: string;
};

export { Shared };
