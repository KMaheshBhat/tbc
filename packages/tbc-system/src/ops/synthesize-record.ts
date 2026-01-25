import assert from "assert";
import { HAMINode } from "@hami-frameworx/core";
import { TBCRecord } from "@tbc-frameworx/tbc-record";
import { Shared, SynthesizeRequest } from "@tbc-frameworx/tbc-synthesize";

type NodeInput = {
    request: SynthesizeRequest;
    templates: Record<string, string>;
    mintedIds: string[];
    companionName: string;
};

export class SynthesizeRecordNode extends HAMINode<Shared> {
    kind(): string {
        return "tbc-system:synthesize-record";
    }

    async prep(shared: Shared): Promise<NodeInput> {
        assert(shared.stage.synthesizeRequest, "SynthesizeRequest is missing from stage.");
        return {
            request: shared.stage.synthesizeRequest,
            templates: shared.stage.records?.templates || {},
            mintedIds: shared.stage.minted?.batch || [],
            companionName: shared.system.companionRecord?.record_title || 'companion',
        };
    }

    async exec(input: NodeInput): Promise<TBCRecord[]> {
        const { request, templates, mintedIds, companionName } = input;
        const { type, meta } = request;

        const recordId = meta?.id || mintedIds[0];
        assert(recordId, `Synthesis Error: No ID available for record type [${type}]`);

        const templateName = `${type}.md`;
        const template = templates[templateName];
        assert(template, `Template Error: Template [${templateName}] not found.`);

        const toLowerKebabCase = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // 1. Title Generation
        let derivedTitle = meta?.title;
        if (!derivedTitle && meta?.content) {
            const words = meta.content.trim().split(/\s+/);
            derivedTitle = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
        }
        derivedTitle = derivedTitle || `New ${type}`;

        // 2. Date & Identity
        const timestamp = new Date().toISOString();
        const companionTag = `c/agent/${toLowerKebabCase(companionName)}`;

        // 3. Robust Tag Processing - Force every tag through the transformation
        const rawTags: string[] = [];
        if (meta?.tags) {
            // Convert anything (Array, String, Proxy) into a flat array of strings
            const sourceTags = Array.isArray(meta.tags)
                ? meta.tags
                : String(meta.tags).split(',');

            sourceTags.forEach(t => {
                const trimmed = String(t).trim();
                if (trimmed) {
                    // Logic: if it doesn't match "x/", add "t/"
                    const processed = /^[a-z]\//.test(trimmed) ? trimmed : `t/${trimmed}`;
                    rawTags.push(processed);
                }
            });
        }

        // Deduplicate
        const tags = Array.from(new Set([companionTag, ...rawTags]));

        // Ensure no non-breaking spaces in the YAML map
        const tagsYaml = tags.map(t => `  - ${t}`).join('\n');

        // 4. Hydrate Body Content
        let hydratedContent = template
            .replace(/{{id}}/g, recordId)
            .replace(/{{title}}/g, derivedTitle)
            .replace(/{{content}}/g, meta?.content || "")
            .replace(/{{tags}}/g, tagsYaml)
            .replace(/{{date}}/g, timestamp)
            .trim() + "\n";

        // 5. Construct Record
        const record: TBCRecord = {
            id: recordId,
            record_type: type,
            record_tags: tags,
            record_title: derivedTitle,
            record_create_date: timestamp,
            content: hydratedContent,
            contentType: "markdown",
        };

        return [record];
    }

    async post(shared: Shared, _input: NodeInput, output: TBCRecord[]): Promise<string> {
        shared.stage.synthesized = {
            records: output
        };
        return "default";
    }
}
