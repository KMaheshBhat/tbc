import assert from "assert";
import { Node } from "pocketflow";
import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { Synthesized, SynthesizeRequest, Shared } from "../types.js";

interface FlowConfig {
    requests?: SynthesizeRequest[];
    requestsKey?: string; // NEW
}

const FlowConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        requests: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    provider: { type: 'string' },
                    key: { type: 'string' },
                },
                required: ['type', 'provider']
            },
        },
        requestsKey: { type: 'string' } // NEW
    }
};

export class SynthesizeRecordFlow extends HAMIFlow<Shared, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-synthesize:synthesize-record-flow";
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // --- DYNAMIC RESOLUTION ---
        let activeRequests: SynthesizeRequest[] = this.config.requests || [];
        if (activeRequests.length === 0 && this.config.requestsKey) {
            // Using the dynamic key from stage
            activeRequests = shared.stage[this.config.requestsKey] || [];
        }

        assert(activeRequests.length > 0, `Synthesis Error: No requests found in config or stage.${this.config.requestsKey}`);

        // Validation: Ensure all provider nodes exist using activeRequests
        const providerNodes = [... new Set(activeRequests.map(r => r.provider))];
        for (const nodeKind of providerNodes) {
            assert(
                shared.registry.hasNodeClass(nodeKind),
                `Composition Error: Synthesis provider [${nodeKind}] is not registered.`
            );
        }

        let finalNodeSequence = new Node();
        let tailNode = activeRequests.length > 0 ? new Node() : finalNodeSequence;

        this.startNode
            .next(n("core:mutate", {
                mutate: (s: Shared) => {
                    s.stage.synthesizedAccumulate = { records: [] };
                }
            }))
            .next(tailNode);

        for (const [i, request] of activeRequests.entries()) {
            const isLast = i === activeRequests.length - 1;
            const targetNext = isLast ? finalNodeSequence : new Node();
            const nodeKind = request.provider;

            tailNode
                .next(n('core:mutate', {
                    mutate: async (s: Shared) => {
                        s.stage.synthesizeRequest = request;
                        s.stage.synthesized = { records: [] };
                    }
                }))
                .next(n(nodeKind))
                .next(new AccumulateNode())
                .next(targetNext);

            tailNode = targetNext;
        }

        finalNodeSequence
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.record = s.record || { records: [] };
                    if (!s.record.records) s.record.records = [];

                    const incoming = s.stage.synthesizedAccumulate?.records || [];
                    s.record.records.push(...incoming);

                    // Cleanup
                    s.stage.synthesizedAccumulate = { records: [] };
                    s.stage.synthesized = { records: [] };
                }
            }));
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        const errors = result.errors || [];
        
        if (!config.requests && !config.requestsKey) {
            errors.push("SynthesizeRecordFlow requires 'requests' or 'requestsKey'");
        }

        return {
            valid: errors.length === 0 && result.isValid,
            errors,
        };
    }
}


/**
 * Collects records from s.stage.synthesized and merges them into s.stage.synthesizedAccumulate
 */
class AccumulateNode extends Node {
    async prep(shared: Shared): Promise<[Synthesized, Synthesized]> {
        assert(shared.stage, 'shared.stage is required');
        return [
            shared.stage.synthesizedAccumulate || { records: [] },
            shared.stage.synthesized || { records: [] }
        ];
    }

    async exec(prepRes: [Synthesized, Synthesized]): Promise<Synthesized> {
        const [accumulated, incoming] = prepRes;
        return {
            records: [
                ...(accumulated.records || []),
                ...(incoming.records || []),
            ],
        };
    }

    async post(shared: Shared, _prepRes: any, execRes: Synthesized): Promise<string | undefined> {
        shared.stage.synthesizedAccumulate = execRes;
        return undefined;
    }
}