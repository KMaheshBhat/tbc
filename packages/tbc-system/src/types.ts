import { HAMIRegistrationManager } from '@hami-frameworx/core';
import { TBCRecord, TBCRecordOperation } from '@tbc-frameworx/tbc-record';

/**
 * Lean results from DEX (.jsonl).
 * Extracted into its own type for easier casting from stage.
 */
export type TBCViewMatch = {
    id: string;
    title: string;
    tags: string[];
    path: string;
    type?: string;
};

export type TBCViewOperation = {
    query?: string;
    type?: string;
    matches: TBCViewMatch[];
    records: TBCRecord[];
};

type TBCCollectionProtocol = {
    /** The collection name to use within the stores */
    collection: string;
    /** Event-driven provider configuration */
    on?: {
        /** The Write-side: Every storer in this list gets the data (Multicast) */
        'store'?: Array<{ id: string; config?: Record<string, any> }>;
        /** The Discovery-side: Try these in order, stop at the first hit (Fallthrough) */
        'query'?: Array<{ id: string; config?: Record<string, any> }>;
        /** The Hydration-side: Fetch from all, merging subsequent data onto the first (Overlay) */
        'fetch'?: Array<{ id: string; config?: Record<string, any> }>;
        /** Full index rebuild */
        'index-full'?: Array<{ id: string; config?: Record<string, any> }>;
        /** Incremental index update */
        'index-incremental'?: Array<{ id: string; config?: Record<string, any> }>;
        /** DEX rebuild - rebuild DEX shards for this collection */
        'rebuild'?: Array<{ id: string; config?: Record<string, any> }>;
    };
};

type TBCProtocol = {
    sys: TBCCollectionProtocol;
    skills: TBCCollectionProtocol;
    mem: TBCCollectionProtocol;
    dex: TBCCollectionProtocol;
    act: TBCCollectionProtocol;
};

type TBCMessageKind = 'structured' | 'raw';

type TBCLevel = 'debug' | 'info' | 'warn' | 'error';

const TBC_LEVEL_ICON_MAP = {
    debug: '»',
    info: 'i',
    warn: '!',
    error: '✗',
} as const;

interface TBCMessage {
    level: TBCLevel;
    kind?: TBCMessageKind;  // 'structured' (default) | 'raw'
    source: string;      // The node or specific check that generated this
    code: string;        // Machine-readable error code for logic branching
    message: string;     // Descriptive message for the LLM
    suggestion?: string; // Actionable hint for self-healing
}

type SharedStage = Record<string, any>;

type TBCSystemOperation = {
    rootDirectory: string;
    isValidTBCRoot: boolean;
    protocol: TBCProtocol;
    manifest: Record<string, string[]>;
    rootRecord: TBCRecord;
    companionID: string;
    companionRecord: TBCRecord;
    primeID: string;
    primeRecord: TBCRecord;
    memoryMapID: string;
    memoryMapRecord: TBCRecord;
};

/**
 * Shared state interface for TBC System operations.
 */
type Shared = {
    /** HAMI registration manager for node creation and management. */
    registry: HAMIRegistrationManager;
    stage: SharedStage;
    system: TBCSystemOperation;
    record: TBCRecordOperation;
    /** Optional configuration options for TBC core operations. */
    opts?: { verbose?: boolean };
    /** Application name (injected from CLI). */
    app?: string;
    /** Application version (injected from CLI). */
    appVersion?: string;
    /** Explicit root directory path (optional, defaults to CWD). */
    root?: string;
    /** Resolved root directory for TBC operations. */
    rootDirectory?: string;
    /** Whether the directory is a valid TBC root. */
    isValidTBCRoot?: boolean;
    /** Fetched records by collection and ID (from record-fs operations). */
    fetchResults?: Record<string, Record<string, Record<string, any>>>;
    /** Companion name for enhanced initialization. */
    companionName?: string;
    /** Prime user name for enhanced initialization. */
    primeName?: string;
    /** Manifest of records by collection. */
    manifest?: Record<string, string[]>;
    /** View operation for viewing records */
    view?: TBCViewOperation;
};

export {
    Shared,
    TBCProtocol,
    TBCLevel,
    TBCMessageKind,
    TBC_LEVEL_ICON_MAP,
    TBCMessage,
    TBCSystemOperation,
};
