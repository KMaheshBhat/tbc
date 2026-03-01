import { HAMIRegistrationManager } from '@hami-frameworx/core';
import { TBCRecord, TBCRecordOperation } from '@tbc-frameworx/tbc-record';

type TBCCollectionProtocol = {
    collection: string;
    recordStorers: string[];
    // ...?
};

type TBCProtocol = {
    sys: TBCCollectionProtocol;
    skills: TBCCollectionProtocol;
    mem: TBCCollectionProtocol;
    dex: TBCCollectionProtocol;
    act: TBCCollectionProtocol;
};

type TBCLevel = 'debug' | 'info' | 'warn' | 'error' | 'raw';

const TBC_LEVEL_ICON_MAP = {
    debug: '»',
    info: 'i',
    warn: '!',
    error: '✗',
    raw: '',
} as const;

interface TBCMessage {
    level: TBCLevel;
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
};

export {
    Shared,
    TBCProtocol,
    TBCLevel,
    TBC_LEVEL_ICON_MAP,
    TBCMessage,
    TBCSystemOperation,
};
