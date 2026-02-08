import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { Shared } from "../types";

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

class ActPauseFlowStartNode extends HAMINode<Shared, FlowConfig> {
    kind(): string {
        return "tbc-activity:act-pause-flow-start";
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

export class ActPauseFlow extends HAMIFlow<Shared, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new ActPauseFlowStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-activity:act-pause-flow";
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
                        source: 'act-pause-flow',
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

        this.startNode
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-system:resolve-root-directory'))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'act-pause-flow',
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
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    const path = require('path');
                    const fs = require('fs');

                    const root = s.stage.rootDirectory;
                    const id = s.stage.activityId;
                    const sourcePath = path.join(root, 'act', 'current', id);
                    const targetDir = path.join(root, 'act', 'backlog');
                    const targetPath = path.join(targetDir, id);

                    // 1. Check if it exists in current
                    if (!fs.existsSync(sourcePath)) {
                        s.stage.messages.push({
                            level: 'error',
                            source: 'act-pause-flow',
                            message: `Activity ${id} not found in current workspace.`,
                            suggestion: 'Check "tbc act show" to verify the activity status or "tbc act start" to start a new activity.'
                        });
                        return;
                    }

                    // 2. Ensure backlog directory exists
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }

                    // 3. Move the directory
                    try {
                        fs.renameSync(sourcePath, targetPath);
                        s.stage.messages.push({
                            level: 'info',
                            source: 'act-pause-flow',
                            message: `Paused activity: ${id}`,
                            suggestion: `Use "tbc act start ${id}" to resume the activity.`
                        });
                    } catch (err: any) {
                        s.stage.messages.push({
                            level: 'error',
                            source: 'act-pause-flow',
                            message: `Failed to move activity: ${err.message}`
                        });
                    }
                }
            }))
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