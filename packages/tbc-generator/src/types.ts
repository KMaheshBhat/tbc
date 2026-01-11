import { HAMIRegistrationManager } from "@hami-frameworx/core";

type MintRequest = {
    type: string;
    key?: string;
    count?: number;
};

type Minted = {
  keys: Record<string, string>;
  batch: string[];
}

/**
 * Options for TBC generator operations.
 * Defines configuration flags that can be used across TBC generator operations.
 */
type TBCGeneratorOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
}

type SharedStage = {
  mintRequest: MintRequest;
  minted: Minted;
  mintedAccumulate: Minted;
};

/**
 * Shared storage interface for TBC generator operations.
 * Defines the structure of data that can be shared between TBC generator operation nodes.
 * Contains configuration options and results from various TBC generator operations.
 */
type Shared = {
  /** HAMI registration manager for node creation and management. */
  registry: HAMIRegistrationManager;
  stage: SharedStage;

  /** Optional configuration options for TBC generator operations. */
  opts?: TBCGeneratorOpts;
  /** Number of IDs to generate (default: 1). */
  count?: number;
  /** Generated IDs result (always an array). */
  generatedIds?: string[];
}

export {
  TBCGeneratorOpts,
  MintRequest,
  Minted,
  Shared,
};