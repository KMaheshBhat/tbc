import assert from "assert";

import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { Minted, MintRequest, Shared } from "../types";


interface FlowConfig {
    requests: MintRequest[];
}

const FlowConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        requests: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                    },
                    key: {
                        type: 'string',
                    },
                    count: {
                        type: 'number',
                        minimum: 1,
                    }
                },
                required: ['type']
            },
        },
    },
    required: ['requests']
};

export class MintIDsFlow extends HAMIFlow<Shared, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-generator:mint-ids-flow";
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        const providers = [... new Set(this.config.requests.map(r => r.type))];
        for (const provider of providers) {
            const nodeKind = `tbc-generator-${provider}:mint`;
            assert(
                shared.registry.hasNodeClass(nodeKind),
                `Composition Error: The required node class [${nodeKind}] is not registered in the HAMI manager.`
            );
        }
        let finalNodeSequence = new Node();
        let tailNode = providers.length > 0 ? new Node() : finalNodeSequence;
        this.startNode
            .next(n("core:assign", { "stage.mintedAccumulate": "stage.minted" }))
            .next(tailNode)
            ;
        for (const [i, request] of this.config.requests.entries()) {
            const isLast = i === this.config.requests.length - 1;
            const targetNext = isLast ? finalNodeSequence : new Node();
            const nodeKind = `tbc-generator-${request.type}:mint`;
            tailNode
                .next(n('core:mutate', {
                    mutate: async (shared: Shared) => {
                        shared.stage.mintRequest = request;
                        shared.stage.minted = {
                            keys: {},
                            batch: [],
                        };
                    }
                }))
                .next(n(nodeKind))
                .next(new AccumulateNode())
                .next(targetNext);
            tailNode = targetNext;
        }
        finalNodeSequence
            .next(n("core:assign", { "stage.minted": "stage.mintedAccumulate" }))
            .next(n('core:mutate', {
                mutate: async (shared: Shared) => {
                    shared.stage.mintedAccumulate = {
                        keys: {},
                        batch: [],
                    };
                }
            }))
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}

class AccumulateNode extends Node {
    async prep(shared: Shared): Promise<[Minted, Minted]> {
        assert(shared.stage, 'shared.stage is required');
        return [shared.stage.mintedAccumulate || {}, shared.stage.minted || {}];
    }
    async exec(prepRes: [Minted, Minted]): Promise<Minted> {
        const [accumulated, incoming] = prepRes;
        return {
            keys: {
                ...accumulated.keys,
                ...incoming.keys,
            },
            batch: [
                ...(accumulated.batch || []),
                ...(incoming.batch || []),
            ],
        };
    }
    async post(
        shared: Shared,
        _prepRes: [Minted, Minted],
        execRes: Minted,
    ): Promise<string | undefined> {
        assert(shared.stage, 'shared.stage is required');
        shared.stage.mintedAccumulate = execRes;
        return undefined;
    }
}
