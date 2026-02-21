import { HAMIRegistrationManager } from '@hami-frameworx/core';

type TBCRecord = Record<string, any>;
type TBCCollection = Record<string, TBCRecord>;
type TBCStore = Record<string, TBCCollection>;
type TBCQueryType = 'list-all-ids' | 'filter-by-tags' | 'search-by-content';

/**
 * RDBMSStore interface for high-performance read model operations.
 * Follows CQRS pattern where tbc-record-fs (DocumentStore) is the canonical
 * Source of Truth (Write Model), and RDBMSStore serves as the Read Model
 * for graph traversal and complex querying.
 */
interface RDBMSStore {
    /** Initialize the database connection, performance pragmas, and schema. */
    initialize(): Promise<void>;
    /** Close the database connection and cleanup resources. */
    teardown(): Promise<void>;
    /** Upsert a node (record) in the database. Overwrites data if ID exists. */
    upsertNode(id: string, kind: string, collection: string, data: Record<string, any>, contentHash?: string): Promise<void>;
    /** Get a node by its ID. Returns null if not found. */
    getNode(id: string): Promise<Record<string, any> | null>;
    /** Delete a node by its ID. Implementation must ensure foreign key cascades remove related edges. */
    deleteNode(id: string): Promise<void>;
    /** Upsert an edge (relation) between two nodes. */
    upsertEdge(id: string, kind: string, fromId: string, toId: string, data: Record<string, any>): Promise<void>;
    /** Delete edges from a node, optionally filtered by kind. */
    deleteEdges(fromId: string, kind?: string): Promise<void>;
    /** * Get related node IDs by direction and optional kind filter.
     * @param atDate Optional ISO date string to query the graph state at a specific time. 
     * Defaults to current time.
     */
    getRelatedIds(
        id: string,
        direction: 'in' | 'out' | 'both',
        kind?: string,
        atDate?: string
    ): Promise<string[]>;
    /** List node IDs with support for filtering, sorting, and pagination. */
    listNodeIds(options: {
        kind?: string;
        collection?: string;
        sortBy?: 'id' | 'created' | 'updated';
        sortOrder?: 'asc' | 'desc';
        limit?: number;
        offset?: number;
    }): Promise<string[]>;
    /** Get the total count of nodes matching the criteria (essential for pagination metadata). */
    countNodes(kind?: string, collection?: string): Promise<number>;
    /** Search for nodes based on a text query against the internal data/content. */
    searchNodes(query: string, collection?: string): Promise<string[]>;
}

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
    RDBMSStore,
};