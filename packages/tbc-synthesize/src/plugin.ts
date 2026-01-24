import { createPlugin } from "@hami-frameworx/core";

import { SynthesizeRecordFlow } from "./ops/synthesize-record-flow.js";


/**
 * TBC Synthesize Plugin for HAMI.
 * Provides essential TBC record synthesis operations.
 *
 * Included operations:
 * - `tbc-synthesize:synthesize-record-flow`: Flow to generate synthesized records for given types
 */
const TBCSynthesizePlugin = createPlugin(
    "@tbc-frameworx/tbc-synthesize",
    "0.1.0",
    [
        SynthesizeRecordFlow as any,
    ],
    "TBC Synthesize Plugin - Record synthesis operations for TBC",
);

export { TBCSynthesizePlugin };