import { createPlugin } from "@hami-frameworx/core";

import { ExtractCompanionIdNode } from "./ops/extract-companion-id.js";
import { ExtractCompanionRecordNode } from "./ops/extract-companion-record.js";
import { ExtractCompanionNameNode } from "./ops/extract-companion-name.js";
import { ExtractPrimeIdNode } from "./ops/extract-prime-id.js";
import { ExtractPrimeNameNode } from "./ops/extract-prime-name.js";
import { ExtractPrimeRecordNode } from "./ops/extract-prime-record.js";
import { GenerateStubRecordsNode } from "./ops/generate-stub-records.js";
import { MemCompanionFlow } from "./ops/mem-companion-flow.js";
import { MemPrimeFlow } from "./ops/mem-prime-flow.js";
import { MemStubFlow } from "./ops/mem-stub-flow.js";
import { RememberFlow } from "./ops/remember-flow.js";
import { RecallFlow } from "./ops/recall-flow.js";
import { AddRecallMessagesNode } from "./ops/add-recall-messages.js";

/**
 * TBC Memory Plugin for HAMI.
 * Provides memory operations for TBC.
 *
 * Included operations:
 * - `tbc-memory:extract-companion-id`: Extracts companion ID from sys/companion.id
 * - `tbc-memory:extract-companion-record`: Extracts companion record from memory
 * - `tbc-memory:remember-flow`: Creates a memory records
 * - `tbc-memory:recall-flow`: Retrieves identity and memory records
 * - `tbc-memory:add-recall-messages`: Adds recalled records from view into system messsages
 * - Memory flows for companion operations
 */
const TBCMemoryPlugin = createPlugin(
    "@tbc-frameworx/tbc-memory",
    "0.1.0",
    [
        ExtractCompanionIdNode as any,
        ExtractCompanionRecordNode as any,
        ExtractCompanionNameNode as any,
        ExtractPrimeIdNode as any,
        ExtractPrimeNameNode as any,
        ExtractPrimeRecordNode as any,
        GenerateStubRecordsNode as any,
        MemCompanionFlow as any,
        MemPrimeFlow as any,
        MemStubFlow as any,
        RememberFlow as any,
        RecallFlow as any,
        AddRecallMessagesNode as any,
    ],
    "TBC Memory Plugin - Memory operations for TBC",
);

export { TBCMemoryPlugin };