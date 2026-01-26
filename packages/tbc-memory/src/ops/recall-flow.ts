import assert from "assert";
import { Node } from "pocketflow";
import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';
import { Shared } from "../types";

interface FlowConfig {
    verbose?: boolean;
    rootDirectory?: string;
    query?: string;
    type?: string;
}

const FlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        rootDirectory: { type: "string" },
        query: { type: "string" },
        type: { type: "string" },
    }
};

class RecallFlowStartNode extends HAMINode<Shared, FlowConfig> {
    kind() { return "tbc-memory:recall-flow-start"; }

    async post(shared: Shared): Promise<string> {
        shared.stage = shared.stage || {};
        shared.system = shared.system || {};

        shared.stage.verbose = shared.stage.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.stage.rootDirectory || this.config?.rootDirectory;

        // Capture inputs for downstream nodes
        shared.stage.recallQuery = shared.query || this.config?.query;
        shared.stage.recallType = shared.type || this.config?.type;

        return "default";
    }
}

export class RecallFlow extends HAMIFlow<Shared, FlowConfig> {
    startNode: Node;

    constructor(config: FlowConfig) {
        const startNode = new RecallFlowStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
    }

    kind() { return "tbc-memory:recall-flow"; }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);


        // --- IDENTITY SEQUENCES ---
        const companionSequence = new Node();
        companionSequence
            .next(n('tbc-system:add-identity-messages', {
                title: 'Companion Identity',
                target: 'companionRecord'
            }))
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'recall-flow',
                        message: `This is **your** identity.`,
                        suggestion: `Lookup the record to know more.`
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            ;

        const primeSequence = new Node();
        primeSequence
            .next(n('tbc-system:add-identity-messages', {
                title: 'Prime Identity',
                target: 'primeRecord'
            }))
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'recall-flow',
                        message: `This is your prime's identity.`,
                        suggestion: `Lookup the record to know more.`
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            ;

        // --- BRANCH LOGIC: Route to Identity or Search ---
        const router = n('core:branch', {
            branch: (s: Shared) => {
                const q = s.stage.recallQuery?.toLowerCase();
                if (q === 'companion' || q === 'who am i') return 'identity-companion';
                if (q === 'prime' || q === 'who is my prime') return 'identity-prime';
                return 'continue'; // Default to memory search
            }
        });

        // --- SEARCH SEQUENCE (The "Main" Recall) ---
        // This will eventually live in your proposed 'view-records' style logic
        const searchSequence = new Node();
        searchSequence
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    console.log('in search sequence');
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'));
            /*
            .next(n('tbc-dex:query-indices', {
                query: this.config?.query,
                type: this.config?.type
            }))
            .next(n('tbc-memory:display-memories'))
            ;
            */

        router.on('identity-companion', companionSequence);
        router.on('identity-prime', primeSequence);
        router.on('continue', searchSequence);

        // --- ABORT SEQUENCE: System Guard ---
        const abortSequence = new Node();
        abortSequence
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'error',
                        code: 'OVERWRITE-GUARD',
                        source: 'remember-flow',
                        message: `has no existing companion (not a valid TBC Root)`,
                        suggestion: 'Use "tbc sys init" instead.',
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'));

        const branchToAbort = n('core:branch', {
            branch: (s: Shared) => s.stage.validationResult?.success ? 'default' : 'abort',
        });
        branchToAbort.on('abort', abortSequence);

        // --- ORCHESTRATION ---
        this.startNode
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-system:resolve-root-directory'))
            .next(n('tbc-system:validate-flow', {
                verbose: this.config?.verbose
            }))
            .next(branchToAbort)
            .next(router)
            ;
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        return { valid: result.isValid, errors: result.errors || [] };
    }
}