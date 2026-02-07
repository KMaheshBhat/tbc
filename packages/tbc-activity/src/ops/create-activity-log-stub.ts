import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

type CreateActivityLogStubNodeOutput = any[];

export class CreateActivityLogStubNode extends HAMINode<Shared> {
    kind(): string {
        return "tbc-activity:create-activity-log-stub";
    }

    async prep(shared: Shared): Promise<{ uuid: string; companionName: string; rootDirectory: string }> {
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required");
        }
        if (!shared.activityId) {
            throw new Error("activityId is required");
        }
        if (!shared.companionName) {
            throw new Error("companionName is required");
        }

        return {
            uuid: shared.activityId,
            companionName: shared.companionName,
            rootDirectory: shared.rootDirectory,
        };
    }

    async exec(params: { uuid: string; companionName: string; rootDirectory: string }): Promise<CreateActivityLogStubNodeOutput> {
        const { uuid, companionName } = params;
        const records: any[] = [];

        const toLowerKebabCase = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const companionSlug = toLowerKebabCase(companionName);
        const companionTag = `c/agent/${companionSlug}`;

        const logRecord = {
            id: uuid,
            record_type: "log",
            record_tags: [companionTag],
            log_type: "activity",
            title: `Activity ${uuid}`,
            contentType: "markdown",
            content: `## Context/Background

This activity log captures the session for activity ${uuid}.

## Process/Dialogue Log

- Activity started
- [Add your process notes here]

## Deliverables/Outcomes

- [Add deliverables and outcomes here]`
        };
        records.push(logRecord);

        return records;
    }

    async post(shared: Shared, _prepRes: any, execRes: CreateActivityLogStubNodeOutput): Promise<string | undefined> {
        shared.records = execRes;
        shared.collection = `act/current/${shared.activityId}`;
        if (execRes.length > 0) {
            shared.createdRecordId = execRes[0].id;
        }
        return "default";
    }
}