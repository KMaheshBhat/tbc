import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { Shared } from "../types";
import { existsSync } from "fs";
import { join } from "path";

interface FlowConfig {
    verbose?: boolean;
    rootDirectory?: string;
    activityId: string;
}

const FlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        rootDirectory: { type: "string" },
        activityId: { type: "string" },
    },
    required: ["activityId"],
};

class ActCloseFlowStartNode extends HAMINode<Shared, FlowConfig> {
    kind(): string {
        return "tbc-activity:act-close-flow-start";
    }

    async post(shared: Shared): Promise<string> {
        shared.stage = shared.stage || {};
        shared.system = shared.system || {};
        shared.stage.verbose = shared.stage.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.stage.rootDirectory || this.config?.rootDirectory;
        shared.stage.activityId = shared.stage.activityId || this.config?.activityId;
        return "default";
    }
}

export class ActCloseFlow extends HAMIFlow<Shared, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new ActCloseFlowStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-activity:act-close-flow";
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
                        source: 'act-close-flow',
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

        const abortOnMissingActivity = new Node();
        abortOnMissingActivity
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'error',
                        source: 'act-close-flow',
                        code: 'ACTIVITY-NOT-FOUND',
                        message: `Activity ${s.stage.activityId} not found in current workspace.`,
                        suggestion: 'Verify the ID with "tbc act show" or check if it is already in the backlog/archive.'
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'));

        const branchOnMissingActivity = n('core:branch', {
            branch: (s: Shared) => {
                const actPath = join(s.stage.rootDirectory, "act", "current", s.stage.activityId);
                if (existsSync(actPath)) {
                    return 'default';
                }
                return 'abort';
            },
        });
        branchOnMissingActivity.on('abort', abortOnMissingActivity);

        this.startNode
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-system:resolve-root-directory'))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'act-close-flow',
                        message: 'Checking first ...',
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('tbc-system:validate-flow', {
                verbose: this.config?.verbose,
                rootDirectory: this.config?.rootDirectory
            }))
            .next(branchToAbort)
            .next(branchOnMissingActivity)
            // TODO
            .next(n('tbc-system:log-and-clear-messages'))
            ;
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        return { valid: result.isValid, errors: result.errors || [] };
    }

    async run(shared: Shared): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.stage.activityId = shared.activityId || this.config?.activityId;
        return super.run(shared);
    }
}