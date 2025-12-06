import { createPlugin } from "@hami-frameworx/core";

import { ResolveNode } from "./ops/resolve.js";
import { ValidateNode } from "./ops/validate.js";

/**
 * TBC File System Plugin for HAMI.
 * Provides essential TBC file system operations.
 *
 * Included operations:
 * - `tbc-fs:resolve`: Resolves strategy to target working directory
 * - `tbc-fs:validate`: Validates TBC directory structure (tbc/, vault/, dex/)
 */
const TBCFSPlugin = createPlugin(
    "@tbc-frameworx/tbc-fs",
    "0.1.0",
    [
        ResolveNode as any,
        ValidateNode as any,
    ],
    "TBC File System Plugin - File system operations for TBC directories",
);

export { TBCFSPlugin };