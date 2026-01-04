import { createPlugin } from "@hami-frameworx/core";

/**
 * TBC Record Plugin for HAMI.
 * Provides record facade operations for TBC.
 *
 * Included operations:
 * - `tbc-record:echo`: Simple echo operation for testing the plugin
 */
const TBCRecordPlugin = createPlugin(
    "@tbc-frameworx/tbc-record",
    "0.1.0",
    [
    ],
    "TBC Record Plugin - Record facade operations for TBC",
);

export { TBCRecordPlugin };