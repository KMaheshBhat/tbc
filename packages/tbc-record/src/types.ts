import { HAMIRegistrationManager } from '@hami-frameworx/core';

type TBCRecord = Record<string, any>;
type TBCCollection = Record<string, TBCRecord>;
type TBCStore = Record<string, TBCCollection>;
type TBCQueryType = 'list-all-ids' | 'filter-by-tags' | 'search-by-content';

/**
 * Capabilities a TBC RecordStore can claim.
 */
export type TBCRecordStoreCapability = 'store' | 'query' | 'fetch' | 'graph' | 'index';

/**
 * The TBC-specific techno-business contract for Record Storage.
 * Designed to handle the collaboration between Human and Agent across 
 * defined collections (sys, skills, mem, dex, act, and extensions).
 */
export interface RecordStore {
    /**
     * The Handshake:
     * System provides config; Store returns capabilities.
     * Often scoped to the rootDirectory or a specific DB connection.
     */
    initialize(config: Record<string, any>): Promise<TBCRecordStoreCapability[]>;

    /** * Indexing / Reconciliation:
     * Scoped by collection to allow surgical rebuilds of specific domains.
     */
    index?: (action: 'rebuild' | 'clear' | 'verify', collection: string) => Promise<void>;

    /** * Persistence: 
     * The collection is typically embedded in TBCRecord, but explicit 
     * scoping here ensures the Store can route data to the correct partition.
     */
    store?: (collection: string, records: TBCRecord[], relations?: any[]) => Promise<void>;

    /** * Discovery: 
     * Find record IDs within a specific TBC domain.
     */
    query?: (collection: string, params: TBCQueryParams) => Promise<string[]>;

    /** * Hydration: 
     * Turn IDs into full objects. Scoping by collection allows for 
     * faster lookup in partitioned stores (like FS subfolders).
     */
    fetch?: (collection: string, ids: string[]) => Promise<TBCStore>;

    /** * Relation Navigation: 
     * Explore the graph within (or originating from) a specific collection.
     */
    graph?: (collection: string, id: string, direction: 'in' | 'out' | 'both', kind?: string) => Promise<string[]>;

    /** Cleanup resources. */
    teardown(): Promise<void>;
}

type TBCQueryParams = {
    type: TBCQueryType;
    recursive?: boolean;
    searchTerm?: string;
    limit?: number;
    offset?: number;
    // TODO: Add future query parameters as implementations are added:
    // tags?: string[];
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