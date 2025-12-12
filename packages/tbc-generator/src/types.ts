/**
 * Options for TBC generator operations.
 * Defines configuration flags that can be used across TBC generator operations.
 */
type TBCGeneratorOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
}

/**
 * Shared storage interface for TBC generator operations.
 * Defines the structure of data that can be shared between TBC generator operation nodes.
 * Contains configuration options and results from various TBC generator operations.
 */
type TBCGeneratorStorage = {
  /** Optional configuration options for TBC generator operations. */
  opts?: TBCGeneratorOpts;
  /** Number of IDs to generate (default: 1). */
  count?: number;
  /** Generated IDs result (always an array). */
  generatedIds?: string[];
}

export {
  TBCGeneratorOpts,
  TBCGeneratorStorage,
};