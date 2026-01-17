import { HAMIRegistrationManager } from "@hami-frameworx/core";
import { Minted, MintRequest } from "@tbc-frameworx/tbc-mint";

type SharedStage = {
  mintRequest: MintRequest;
  minted: Minted;
};

/**
 * Shared storage interface for TBC generator TSID operations.
 * Defines the structure of data that can be shared between TBC generator TSID operation nodes.
 */
type Shared = {
  /** HAMI registration manager for node creation and management. */
  registry: HAMIRegistrationManager;
  stage: SharedStage;
}

export {
  Shared,
};