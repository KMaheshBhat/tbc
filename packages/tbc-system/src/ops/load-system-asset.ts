import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { HAMINode } from "@hami-frameworx/core";
import { Shared } from "../types.js";

// The isolated input for exec
type NodeInput = {
    assetsBase: string;
};

// The isolated output from exec (Records grouped by collection)
type NodeOutput = Record<string, Record<string, string>>;

export class LoadSystemAssetsNode extends HAMINode<Shared> {
    kind(): string {
        return "tbc-system:load-system-assets";
    }

    async prep(_shared: Shared): Promise<NodeInput> {
        // Resolve path in prep: stable and testable
        const currentFile = fileURLToPath(import.meta.url);
        // Assuming we are in dist/ops/ or src/ops/, we go up two levels to reach package root
        const assetsBase = join(currentFile, "..", "..", "assets");
        
        return { assetsBase };
    }

    async exec(input: NodeInput): Promise<NodeOutput> {
        const { assetsBase } = input;
        const result: NodeOutput = {};

        const mappings = [
            { folder: 'templates', collection: 'templates'},
            { folder: "sys/core", collection: "sys/core" },
            { folder: "sys/ext", collection: "sys/ext" },
            { folder: "skills/core", collection: "skills/core" },
            { folder: "skills/ext", collection: "skills/ext" }
        ];

        for (const mapping of mappings) {
            const sourcePath = join(assetsBase, mapping.folder);
            const folderRecords = await this.readFolder(sourcePath);
            
            if (Object.keys(folderRecords).length > 0) {
                result[mapping.collection] = {
                    ...(result[mapping.collection] || {}),
                    ...folderRecords
                };
            }
        }

        return result;
    }

    async post(
        shared: Shared,
        _input: NodeInput,
        output: NodeOutput,
    ): Promise<string | undefined> {
        // Only here do we touch the state
        shared.stage.records = shared.stage.records || {};
        
        // Merge the loaded assets into the stage
        for (const [collection, records] of Object.entries(output)) {
            shared.stage.records[collection] = {
                ...(shared.stage.records[collection] || {}),
                ...records
            };
        }

        return "default";
    }

    private async readFolder(dir: string): Promise<Record<string, string>> {
        const records: Record<string, string> = {};
        try {
            const entries = await readdir(dir, { recursive: true, withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile()) {
                    const fullPath = join(entry.parentPath, entry.name);
                    const content = await readFile(fullPath, "utf-8");
                    const recordId = relative(dir, fullPath);
                    records[recordId] = content;
                }
            }
        } catch (e) {
            // Optional folders might not exist, that's fine
        }
        return records;
    }
}