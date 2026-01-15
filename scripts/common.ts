import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "bun";

/**
 * Standardized command runner for the monorepo.
 * Handles the logic of switching between Bun-runtime and Compiled Binary.
 */
export function runMonorepoCommand(cwd: string, target: string, args: string[]) {
    const isBinary = target.endsWith('tbc') || !target.endsWith('.ts');
    const command = isBinary ? [target, ...args] : [process.execPath, target, ...args];

    const result = spawnSync(command, {
        cwd,
        stdout: "pipe",
        stderr: 1, // Merge stderr into stdout for easier testing
        env: { ...process.env, NO_COLOR: "1" },
    });

    return {
        output: result.stdout.toString(),
        exitCode: result.exitCode,
        success: result.success,
    };
}

/**
 * Generates a visual tree representation of a directory.
 */
export function generateFileTree(dir: string, prefix = ""): string {
    if (!statSync(dir).isDirectory()) return `${prefix} └── ${dir}\n`;
    
    const files = readdirSync(dir);
    return files.map((file, index) => {
        const path = join(dir, file);
        const isLast = index === files.length - 1;
        const connector = isLast ? " └── " : " ├── ";
        let tree = `${prefix}${connector}${file}\n`;

        if (statSync(path).isDirectory()) {
            const newPrefix = prefix + (isLast ? "     " : " │   ");
            tree += generateFileTree(path, newPrefix);
        }
        return tree;
    }).join("");
}

/**
 * Common regex for ID validation across tests
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
