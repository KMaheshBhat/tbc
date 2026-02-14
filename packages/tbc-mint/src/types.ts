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

type SharedStage = {
  mintRequest: MintRequest;
  minted: Minted;
  mintedAccumulate: Minted;
  mintRequests?: MintRequest[];
  [key: string]: any;
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
}

export {
  MintRequest,
  Minted,
  Shared,
};
