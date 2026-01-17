import { HAMINode } from "@hami-frameworx/core";
import { readdir, stat } from "fs/promises";
import path from "path";
import crypto from "crypto";

import type { TBCDexStorage } from "../types.js";

type FSWalkerInput = {
    rootDirectory: string;
};

type FSWalkerOutput = {
    discoveredFiles: Array<{
        id: string;
        collection: string;
        filePath: string;
        hash: string;
        mtime: number;
    }>;
};

export class FSWalkerNode extends HAMINode<TBCDexStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-dex:fs-walker";
    }

    async prep(shared: TBCDexStorage): Promise<FSWalkerInput> {
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required in shared state");
        }
        return {
            rootDirectory: shared.rootDirectory,
        };
    }

    async exec(params: FSWalkerInput): Promise<FSWalkerOutput> {
        const collections = ['mem', 'sys', 'skills'];
        const discoveredFiles: FSWalkerOutput['discoveredFiles'] = [];

        for (const collection of collections) {
            const collectionPath = path.join(params.rootDirectory, collection);
            try {
                const files = await this.walkDirectory(collectionPath, collection, params.rootDirectory);
                discoveredFiles.push(...files);
            } catch (error) {
                // Collection directory doesn't exist, skip
                console.warn(`Collection ${collection} not found, skipping:`, error);
            }
        }

        return { discoveredFiles };
    }

    private async walkDirectory(dirPath: string, collection: string, rootDir: string): Promise<FSWalkerOutput['discoveredFiles'][0][]> {
        const files: FSWalkerOutput['discoveredFiles'][0][] = [];
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                // Recursively walk subdirectories
                const subFiles = await this.walkDirectory(fullPath, collection, rootDir);
                files.push(...subFiles);
            } else if (entry.isFile()) {
                // Check if it's a markdown or other supported file
                const ext = path.extname(entry.name).toLowerCase();
                if (['.md', '.json', '.yaml', '.yml'].includes(ext)) {
                    try {
                        const stats = await stat(fullPath);
                        const relativePath = path.relative(rootDir, fullPath);
                        const id = this.extractIdFromFilename(entry.name);

                        if (id) {
                            const hash = await this.computeFileHash(fullPath);
                            files.push({
                                id,
                                collection,
                                filePath: relativePath,
                                hash,
                                mtime: Math.floor(stats.mtime.getTime() / 1000),
                            });
                        }
                    } catch (error) {
                        console.warn(`Failed to process file ${fullPath}:`, error);
                    }
                }
            }
        }

        return files;
    }

    private extractIdFromFilename(filename: string): string | null {
        const name = path.basename(filename, path.extname(filename));
        // For UUID v7 and TSID, they should be valid identifiers
        // Simple check: if it looks like an ID (contains hyphens or is numeric)
        if (name.includes('-') || /^\d+$/.test(name)) {
            return name;
        }
        return null;
    }

    private async computeFileHash(filePath: string): Promise<string> {
        const content = await Bun.file(filePath).text();
        // Git-style SHA-256 blob hash
        const blob = `blob ${Buffer.byteLength(content, 'utf8')}\0${content}`;
        return crypto.createHash('sha256').update(blob).digest('hex');
    }

    async post(shared: TBCDexStorage, _prepRes: FSWalkerInput, execRes: FSWalkerOutput): Promise<string | undefined> {
        shared.discoveredFiles = execRes.discoveredFiles;
        return "default";
    }
}