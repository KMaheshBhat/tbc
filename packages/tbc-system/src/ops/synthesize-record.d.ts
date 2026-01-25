import { HAMINode } from "@hami-frameworx/core";
import { TBCRecord } from "@tbc-frameworx/tbc-record";
import { Shared, SynthesizeRequest } from "@tbc-frameworx/tbc-synthesize";
type NodeInput = {
    request: SynthesizeRequest;
    templates: Record<string, string>;
    mintedIds: string[];
    companionName: string;
};
export declare class SynthesizeRecordNode extends HAMINode<Shared> {
    kind(): string;
    prep(shared: Shared): Promise<NodeInput>;
    exec(input: NodeInput): Promise<TBCRecord[]>;
    post(shared: Shared, _input: NodeInput, output: TBCRecord[]): Promise<string>;
}
export {};
//# sourceMappingURL=synthesize-record.d.ts.map