import { HAMINode } from "@hami-frameworx/core";

import { TBCMemoryStorage } from "../types.js";

type GenerateStubRecordsNodeOutput = any[];

export class GenerateStubRecordsNode extends HAMINode<TBCMemoryStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-memory:generate-stub-records";
    }

    async prep(
        shared: TBCMemoryStorage,
    ): Promise<{ uuid: string; recordType: string; companionName: string; rootDirectory: string }> {
        // Ensure required data is available
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for generate-stub-records operation");
        }
        if (!shared.generatedIds || shared.generatedIds.length < 1) {
            throw new Error("generatedIds with 1 UUID is required for generate-stub-records operation");
        }
        if (!shared.opts?.recordType) {
            throw new Error("recordType is required for generate-stub-records operation");
        }
        if (!shared.companionName) {
            throw new Error("companionName is required for generate-stub-records operation");
        }

        return {
            uuid: shared.generatedIds[0],
            recordType: shared.opts.recordType,
            companionName: shared.companionName,
            rootDirectory: shared.rootDirectory,
        };
    }

    async exec(
        params: { uuid: string; recordType: string; companionName: string; rootDirectory: string },
    ): Promise<GenerateStubRecordsNodeOutput> {
        const { uuid, recordType, companionName } = params;
        const records: any[] = [];

        // Helper function to convert to lower-kebab-case
        const toLowerKebabCase = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const companionSlug = toLowerKebabCase(companionName);

        const companionTag = `c/agent/${companionSlug}`;

        if (recordType === 'party') {
            const partyRecord = {
                id: uuid,
                record_type: "party",
                record_tags: [companionTag],
                party_type: "person",
                title: "Jane Doe",
                contentType: "markdown",
                content: `# Jane Doe\n\nJane Doe is a stub example party record representing a team member or collaborator in the Third Brain Companion System. This record demonstrates the structure for storing information about people involved in the system.`
            };
            records.push(partyRecord);
        } else if (recordType === 'goal') {
            const goalRecord = {
                id: uuid,
                record_type: "goal",
                record_tags: [companionTag],
                goal_owner: "stub-party-id", // Placeholder - would be replaced with actual party ID
                goal_type: "project",
                goal_status: "active",
                title: "Complete Project Documentation",
                contentType: "markdown",
                content: `# Complete Project Documentation\n\nThis goal represents a stub example of a project objective. The goal is to complete comprehensive documentation for the current project, including user guides, API references, and deployment instructions.`
            };
            records.push(goalRecord);
        } else if (recordType === 'log') {
            const logRecord = {
                id: uuid,
                record_type: "log",
                record_tags: [companionTag],
                log_type: "activity",
                title: "Sample Activity Log",
                contentType: "markdown",
                content: `## Context/Background\n\nThis is a stub example of an activity log record. It represents a session where work was performed on a project task.\n\n## Process/Dialogue Log\n\n- Started working on documentation\n- Reviewed existing code\n- Updated README file\n- Committed changes\n\n## Deliverables/Outcomes\n\n- Updated project documentation\n- Created example code snippets\n- Improved user onboarding flow`
            };
            records.push(logRecord);
        } else if (recordType === 'note') {
            const noteRecord = {
                id: uuid,
                record_type: "note",
                record_tags: [companionTag],
                title: "Project Ideas and Observations",
                contentType: "markdown",
                content: `# Project Ideas and Observations\n\nThis is a stub example of a note record for storing general knowledge, observations, and unstructured reflections.\n\n## Key Observations\n\n- The current architecture scales well for small teams\n- Documentation is crucial for onboarding\n- Automated testing reduces bugs significantly\n\n## Future Ideas\n\n- Consider implementing caching for performance\n- Explore integration with external APIs\n- Add support for real-time collaboration`
            };
            records.push(noteRecord);
        } else if (recordType === 'structure') {
            const structureRecord = {
                id: uuid,
                record_type: "structure",
                record_tags: [companionTag],
                title: "Project Components Map",
                contentType: "markdown",
                content: `# Project Components Map\n\nThis is a stub example of a structure record that provides navigational maps or groupings of other records.\n\n## Core Components\n\n- **Frontend**: User interface and client-side logic\n- **Backend**: Server-side API and business logic\n- **Database**: Data storage and retrieval\n- **Infrastructure**: Deployment and scaling\n\n## Related Records\n\n- See goal records for project objectives\n- See log records for recent activity\n- See note records for project observations`
            };
            records.push(structureRecord);
        }

        return records;
    }

    async post(
        shared: TBCMemoryStorage,
        _prepRes: any,
        execRes: GenerateStubRecordsNodeOutput,
    ): Promise<string | undefined> {
        // Set records and collection for store-records operation
        shared.records = execRes;
        shared.collection = "mem";

        // Store the created record ID for logging
        if (execRes.length > 0) {
            shared.createdRecordId = execRes[0].id;
        }

        return "default";
    }
}