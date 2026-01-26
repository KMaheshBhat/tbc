import assert from "assert";
import { Node } from "pocketflow";
import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { Shared } from "../types";

interface FlowConfig {
    verbose: boolean;
    recordStorers: string[];
    sourcePath: string;
    collection: string; // name of collection key in stage
    syncIndex: boolean;
}

const FlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        recordStorers: { type: "array", items: { type: "string" } },
        sourcePath: { type: "string" },
        collection: { type: "string" },
    },
    required: ['verbose', 'recordStorers', 'sourcePath', 'collection'],
};

class ViewRecordsStartNode extends HAMINode<Shared, FlowConfig> {
    kind(): string {
        return "tbc-view:view-records-flow-start";
    }

    async post(shared: Shared): Promise<string> {
        // Ensure shared.system exists as we rely on it for rootDirectory indirection
        assert(shared.system?.rootDirectory, "shared.system.rootDirectory is required for ViewRecordsFlow");
        return "default";
    }
}

export class ViewRecordsFlow extends HAMIFlow<Record<string, any>, FlowConfig> {
    startNode: Node;

    constructor(config: FlowConfig) {
        const startNode = new ViewRecordsStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
    }

    kind(): string {
        return "tbc-view:view-records-flow";
    }

    async prep(shared: Shared): Promise<void> {
        assert(this.config, 'flow must be configured');
        assert(shared.registry, 'registry is required');
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    protected resolvePath(obj: any, path: string): any {
        if (!path || !obj) return undefined;
        return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
    }
}