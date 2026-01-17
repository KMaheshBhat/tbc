import { HAMINode } from "@hami-frameworx/core";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import matter from "gray-matter";

import type { TBCDexStorage } from "../types.js";

interface GenerateDexSkillsNodeConfig {
    verbose: boolean;
}

export class GenerateDexSkillsNode extends HAMINode<TBCDexStorage, GenerateDexSkillsNodeConfig> {
    kind(): string {
        return "tbc-dex:generate-dex-skills";
    }

    async prep(shared: TBCDexStorage): Promise<any> {
        return {
            rootDirectory: shared.rootDirectory,
            verbose: this.config?.verbose
        };
    }

    async exec(params: any): Promise<any[]> {
        const { rootDirectory } = params;
        const skillRecords: any[] = [];

        // Find all SKILL.md files in skills/core and skills/ext
        const skillPaths = this.findSkillFiles(rootDirectory);
        for (const skillPath of skillPaths) {
            const record = this.parseSkillFile(skillPath);
            if (record) {
                skillRecords.push(record);
            }
        }

        const content = this.generateIndexContent(skillRecords);
        const record = {
            id: 'skills',
            filename: 'skills.md',
            contentType: 'markdown',
            title: 'Skills Index',
            content: content,
            record_type: 'dex'
        };

        return [record];
    }

    private findSkillFiles(rootDirectory: string): string[] {
        const skillFiles: string[] = [];
        const skillsDir = join(rootDirectory, 'skills');

        if (!existsSync(skillsDir)) {
            return skillFiles;
        }

        // Check skills/core and skills/ext
        for (const subDir of ['core', 'ext']) {
            const subDirPath = join(skillsDir, subDir);
            if (existsSync(subDirPath)) {
                try {
                    const entries = readdirSync(subDirPath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory()) {
                            const skillPath = join(subDirPath, entry.name, 'SKILL.md');
                            if (existsSync(skillPath)) {
                                skillFiles.push(skillPath);
                            }
                        }
                    }
                } catch (error) {
                    // Continue if directory can't be read
                }
            }
        }

        return skillFiles;
    }

    private parseSkillFile(skillPath: string): any | null {
        try {
            const content = readFileSync(skillPath, 'utf-8');
            const parsed = matter(content);

            // Return only the frontmatter data
            return {
                ...parsed.data,
                // Add some derived fields for indexing
                skill_path: skillPath,
                skill_type: skillPath.includes('/core/') ? 'core' : 'ext'
            };
        } catch (error) {
            console.error(`Error parsing skill file ${skillPath}:`, error);
            return null;
        }
    }

    private generateIndexContent(records: any[]): string {
        let content = "=== Skills Index ===\n\n";

        // Group by type (core vs ext)
        const coreSkills = records.filter((r: any) => r.skill_type === 'core');
        const extSkills = records.filter((r: any) => r.skill_type === 'ext');

        if (coreSkills.length > 0) {
            content += "== Core Skills ==\n\n";
            for (const record of coreSkills) {
                content += this.formatSkillEntry(record);
            }
            content += "\n";
        }

        if (extSkills.length > 0) {
            content += "== Extension Skills ==\n\n";
            for (const record of extSkills) {
                content += this.formatSkillEntry(record);
            }
            content += "\n";
        }

        return content;
    }

    private formatSkillEntry(record: any): string {
        const fields = this.extractSerializableFields(record);
        const fieldString = fields.map(([key, value]) => `${key}: ${value}`).join(', ');
        return `- ${fieldString}\n`;
    }

    private extractSerializableFields(record: any): [string, string][] {
        const fields: [string, string][] = [];

        for (const [key, value] of Object.entries(record)) {
            // Skip internal fields
            if (key === 'skill_path' || key === 'skill_type') continue;

            // Include only simple serializable values
            if (this.isSerializableValue(key, value)) {
                fields.push([key, String(value)]);
            }
        }

        return fields;
    }

    private isSerializableValue(key: string, value: any): boolean {
        const type = typeof value;

        // Exclude specific complex fields
        if (key === 'content' || key === 'fullContent' || key === 'filename') {
            return false;
        }

        // Include simple types
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return true;
        }

        // Exclude complex types
        if (value === null || value === undefined ||
            type === 'object' || type === 'function') {
            return false;
        }

        return true;
    }

    async post(shared: TBCDexStorage, prepRes: any, execRes: any[]): Promise<string | undefined> {
        // Store the generated records for use by store-records node
        shared.generatedDexSkills = execRes;

        // Set up records array for store operation
        shared.records = execRes;
        shared.collection = 'dex';

        return 'default'; // Follow HAMI pattern
    }
}