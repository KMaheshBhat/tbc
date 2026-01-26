import { createPlugin } from "@hami-frameworx/core";

import { ViewRecordsFlow } from "./ops/view-records.js";

/**
 * TBC View Plugin for HAMI.
 * Provides view facade operations for TBC.
 *
 * Included operations:
 * - `tbc-view:view-records-flow`: Views records using configured providers
 */
const TBCViewPlugin = createPlugin(
    "@tbc-frameworx/tbc-view",
    "0.1.0",
    [
        ViewRecordsFlow as any,
    ],
    "TBC View Plugin - View facade operations for TBC",
);

export { TBCViewPlugin };