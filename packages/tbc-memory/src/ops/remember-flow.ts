import assert from 'node:assert';

import { Node } from 'pocketflow';
import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types';

interface FlowConfig {
    verbose?: boolean;
    rootDirectory?: string;
    content?: string;
    type: string;
    title?: string;
    tags?: string[];
}

const FlowConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        rootDirectory: { type: 'string' },
        content: { type: 'string' },
        type: { type: 'string' },
        title: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['type'],
};

/**
 * Protocol Registry
 * Maps record_type to the specific providers and ID strategies.
 */
const RECORD_PROTOCOLS: Record<string, { provider: string; idType: 'tbc-mint:uuid-mint' | 'tbc-mint:tsid-mint' }> = {
    note: { provider: 'tbc-system:synthesize-record', idType: 'tbc-mint:uuid-mint' },
    goal: { provider: 'tbc-system:synthesize-record', idType: 'tbc-mint:uuid-mint' },
    log: { provider: 'tbc-system:synthesize-record', idType: 'tbc-mint:uuid-mint' },
    party: { provider: 'tbc-system:synthesize-record', idType: 'tbc-mint:uuid-mint' },
};

class RememberFlowStartNode extends HAMINode<Shared, FlowConfig> {
    kind(): string {
        return 'tbc-memory:remember-flow-start';
    }

    async post(shared: Shared): Promise<string> {
        shared.stage = shared.stage || {};
        shared.system = shared.system || {};

        // 1. Setup Base Stage context
        shared.stage.verbose = shared.stage.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.stage.rootDirectory || this.config?.rootDirectory;

        // 2. Resolve Protocol via Type
        const targetType = shared.stage.type || this.config?.type || 'note';
        const protocol = RECORD_PROTOCOLS[targetType];

        assert(protocol, `Protocol Error: No registered protocol for record type [${targetType}]`);

        shared.stage.activeProtocol = protocol;
        shared.stage.memoryInput = {
            content: shared.content || this.config?.content || '',
            type: targetType,
            title: shared.title || this.config?.title,
            tags: shared.tags || this.config?.tags || [],
        };

        shared.stage.memCollection = 'mem';

        return 'default';
    }
}

export class RememberFlow extends HAMIFlow<Shared, FlowConfig> {
    startNode: Node;

    constructor(config: FlowConfig) {
        const startNode = new RememberFlowStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
    }

    kind(): string {
        return 'tbc-memory:remember-flow';
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // --- ABORT SEQUENCE: System Guard ---
        const abortSequence = new Node();
        abortSequence
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'error',
                        code: 'OVERWRITE-GUARD',
                        source: 'remember-flow',
                        message: 'has no existing companion (not a valid TBC Root)',
                        suggestion: 'Use "tbc sys init" instead.',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));

        const branchToAbort = n('core:branch', {
            branch: (s: Shared) => s.stage.validationResult?.success ? 'default' : 'abort',
        });
        branchToAbort.on('abort', abortSequence);

        // --- MAIN ORCHESTRATION PIPELINE ---
        this.startNode
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-system:resolve-root-directory'))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'remember-flow',
                        message: 'Checking first ...',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('tbc-system:validate-flow', {
                verbose: this.config?.verbose,
                rootDirectory: this.config?.rootDirectory,
                resolveProtocol: true,
            }))
            .next(branchToAbort)
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'remember-flow',
                        message: 'existing valid TBC root found, proceeding ...',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'))

            // 1. IDENTITY MINTING
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    // We populate the key we promised to point to
                    s.stage.mintRequests = [{
                        type: s.stage.activeProtocol.idType,
                        count: 1,
                    }];
                },
            }))
            .next(n('tbc-mint:mint-ids-flow', {
                requestsKey: 'mintRequests', // Tell the flow where to look on s.stage
            }))

            // 2. RECORD REALIZATION (Synthesis)
            .next(n('tbc-system:load-system-assets'))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    // Correcting the lookup to 'batch' to match MintIDsFlow output
                    const mintedId = s.stage.minted?.batch?.[0];
                    assert(mintedId, 'Identity Minting failed: No ID found in stage.minted.batch.');

                    s.stage.synthesizeRequests = [{
                        type: s.stage.memoryInput.type,
                        provider: s.stage.activeProtocol.provider,
                        meta: {
                            ...s.stage.memoryInput,
                            id: mintedId,
                        },
                    }];
                },
            }))
            .next(n('tbc-synthesize:synthesize-record-flow', {
                requestsKey: 'synthesizeRequests',
            }))

            // 3. PERSISTENCE
            .next(n('tbc-write:write-records-flow', {
                verbose: this.config?.verbose,
                sourcePath: 'record.records',
                collection: 'memCollection',
                protocolKey: 'mem',
                syncIndex: true,
            }))
            // 4. FEEDBACK
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    const finalId = s.stage.minted?.batch?.[0];
                    shared.stage.messages.push({
                        level: 'raw',
                        message: ' ┌┼───────────────────────────────────────────────────────────',
                    });
                    s.stage.messages.push({
                        level: 'raw',
                        message: `[✓] Memory persisted (${s.stage.memoryInput.type}): ${finalId}`,
                    });
                    shared.stage.messages.push({
                        level: 'raw',
                        message: ' └┼───────────────────────────────────────────────────────────',
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'remember-flow',
                        message: `Record: ${shared.stage.memCollection}/${finalId}.md`,
                        suggestion: 'This file now contains the memory.  Adjust and enhance it if required.',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        return { valid: result.isValid, errors: result.errors || [] };
    }
}
