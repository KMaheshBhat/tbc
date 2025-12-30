/**
 * Options for TBC interface operations.
 * Defines configuration flags that can be used across TBC interface operations.
 */
type TBCInterfaceOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
}

/**
 * Shared storage interface for TBC interface operations.
 * Defines the structure of data that can be shared between TBC interface operation nodes.
 * Contains configuration options and results from various TBC interface operations.
 */
type TBCInterfaceStorage = {
  /** Optional configuration options for TBC interface operations. */
  opts?: TBCInterfaceOpts;
  /** Root directory for operations */
  rootDirectory?: string;
  /** Companion ID */
  companionId?: string;
  /** Companion name */
  companionName?: string;
  /** Role definition for the companion */
  roleDefinition?: string;
  /** Records to be stored */
  records?: Record<string, any>[];
}

export {
  TBCInterfaceOpts,
  TBCInterfaceStorage,
};