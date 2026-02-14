import { HAMIRegistrationManager } from '@hami-frameworx/core';

type TBCRecord = Record<string, any>;
type TBCCollection = Record<string, TBCRecord>;
type TBCStore = Record<string, TBCCollection>;
type TBCQueryType = 'list-all-ids' | 'filter-by-tags' | 'search-by-content';

type TBCQueryParams = {
    type: TBCQueryType;
    recursive?: boolean;
    // TODO: Add future query parameters as implementations are added:
    // tags?: string[];
    // searchTerm?: string;
    // limit?: number;
    // offset?: number;
    sortBy?: 'id' | 'created' | 'modified';
    sortOrder?: 'asc' | 'desc';
};

type TBCResult = {
    IDs?: string[];
    records?: TBCStore;
    totalCount?: number;
};

type TBCRecordOperation = {
    rootDirectory?: string;
    IDs?: string[];
    collection?: string;
    records?: TBCRecord[];
    query?: TBCQueryParams;
    result?: TBCResult;
    accumulate?: TBCResult;
};

/**
 * Shared storage interface for TBC record operations.
 * Defines the structure of data that can be shared between TBC record operation nodes.
 * Contains configuration options and results from various TBC record operations.
 */
type TBCShared = {
    /** HAMI registration manager for node creation and management. */
    registry: HAMIRegistrationManager;
    /** Current record operaton */
    record: TBCRecordOperation;
};

export {
    TBCRecord,
    TBCStore,
    TBCResult,
    TBCRecordOperation,
    TBCShared,
    TBCQueryParams,
};