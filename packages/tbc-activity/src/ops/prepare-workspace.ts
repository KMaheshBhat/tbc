import assert from 'node:assert';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

import { HAMINode } from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface WorkspaceJob {
    activityId: string;
    currentPath: string;
    backlogPath: string;
}

interface WorkspaceResult {
    status: 'resumed' | 'created' | 'active';
    activityPath: string;
}

export class PrepareWorkspaceNode extends HAMINode<Shared> {
    kind(): string {
        return 'tbc-activity:prepare-workspace';
    }

    async prep(shared: Shared): Promise<WorkspaceJob> {
        const { activityId, rootDirectory } = shared.stage;

        assert(activityId, 'activityId is required for workspace preparation');
        assert(rootDirectory, 'rootDirectory is required for workspace preparation');

        const actCollectionRoot = shared.system.protocol.act.collection ?? 'act';
        const actRoot = join(rootDirectory, actCollectionRoot);

        return {
            activityId,
            currentPath: join(actRoot, 'current', activityId),
            backlogPath: join(actRoot, 'backlog', activityId),
        };
    }

    async exec(job: WorkspaceJob): Promise<WorkspaceResult> {
        const { currentPath, backlogPath } = job;

        // 1. If already in current, no physical move needed
        if (existsSync(currentPath)) {
            return { status: 'active', activityPath: currentPath };
        }

        // 2. Resume scenario: Move from backlog to current
        if (existsSync(backlogPath)) {
            // Ensure the 'current' parent dir exists before moving
            const currentParent = join(currentPath, '..');
            if (!existsSync(currentParent)) mkdirSync(currentParent, { recursive: true });

            renameSync(backlogPath, currentPath);
            return { status: 'resumed', activityPath: currentPath };
        }

        // 3. Fresh start scenario: Create new directory
        mkdirSync(currentPath, { recursive: true });
        return { status: 'created', activityPath: currentPath };
    }

    async post_legacy_to_delete(
        shared: Shared,
        job: WorkspaceJob,
        result: WorkspaceResult,
    ): Promise<string> {
        // Update shared state for synthesis/writing nodes
        shared.stage.activityPath = result.activityPath;

        // Map internal status to user-facing messages
        const messageMap = {
            active: `Activity ${job.activityId} is already active.`,
            resumed: `Resumed activity from backlog: ${job.activityId}`,
            created: `Created new workspace for activity: ${job.activityId}`,
        };

        shared.stage.messages.push({
            level: result.status === 'resumed' ? 'success' : 'info',
            source: this.kind(),
            message: messageMap[result.status],
        });

        return 'default';
    }

    async post(
        shared: Shared,
        job: WorkspaceJob,
        result: WorkspaceResult,
    ): Promise<string> {
        shared.stage.activityPath = result.activityPath;

        const messageMap = {
            active: `Activity ${job.activityId} is already active.`,
            resumed: `Resumed activity from backlog: ${job.activityId}`,
            created: `Created new workspace for activity: ${job.activityId}`,
        };

        shared.stage.messages.push({
            level: 'info',
            source: this.kind(),
            message: messageMap[result.status],
        });

        return 'default';
    }
}
