import { HAMIRegistrationManager } from '@hami-frameworx/core';
import { TBCRecord, TBCRecordOperation } from '@tbc-frameworx/tbc-record';

/**
 * A request to transform user input/intent into a structured TBC Record.
 */
export type SynthesizeRequest = {
  /** The record/value type to fulfill (e.g., 'note', 'goal', 'log' for records, or value type) */
  type: string;
  /** Node that provides the synthesize operation */
  provider: string;
  /** Optional identifier for the specific request batch */
  key?: string;
  /** Metadata or configuration specific to this synthesis request */
  meta?: Record<string, any>;
};

/**
 * The output bucket for a synthesis operation.
 */
export type Synthesized = {
  /** Array of hydrated TBCRecord objects ready for the write-flow */
  records?: TBCRecord[];
  values?: any[];
};

/**
 * The transient state used within the tbc-synthesize flows.
 */
export type SharedStage = {
  /** The current request being processed by a provider node */
  synthesizeRequest?: SynthesizeRequest;
  /** The output of the current individual provider node */
  synthesized?: Synthesized;
  /** The running total of records created during a multi-request flow */
  synthesizedAccumulate?: Synthesized;

  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
  /** Explicit root directory path. */
  rootDirectory?: string;

  /** Catch-all for other stage properties (e.g. system validation results) */
  [key: string]: any;
};

/**
 * Shared state interface for TBC Synthesize operations.
 * Designed to be compatible with tbc-system and tbc-record.
 */
export type Shared = {
  /** HAMI registration manager for node creation and management. */
  registry: HAMIRegistrationManager;

  /** Transient state for the current execution context. */
  stage: SharedStage;

  /** * The global record operation state.
   * Synthesized records are pushed here for tbc-system to consume.
   */
  record: TBCRecordOperation;

  /** Catch-all for other namespaces (system, etc.) */
  [key: string]: any;
};
