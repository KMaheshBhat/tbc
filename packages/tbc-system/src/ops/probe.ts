import { platform, release, type, arch, uptime, hostname } from "os";
import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

type NodeOutput = string[];

export class ProbeNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-system:probe";
    }

    async prep(
        shared: Shared,
    ): Promise<Shared> {
        // Pass shared state to exec
        return shared;
    }

    async exec(
        shared: Shared,
    ): Promise<NodeOutput> {
        const results: string[] = [];

        // Application info (injected from CLI)
        if (shared?.app && shared?.appVersion) {
            results.push(`${shared.app}: ${shared.appVersion}`);
        }

        // TBC root directory information
        if (shared?.rootDirectory) {
            results.push(`TBC Root: ${shared.rootDirectory}`);
            if (shared?.isValidTBCRoot !== undefined) {
                results.push(`TBC Root Valid: ${shared.isValidTBCRoot ? 'Yes' : 'No'}`);
            }
            if (shared?.isGitRepository !== undefined) {
                results.push(`Git Repository: ${shared.isGitRepository ? 'Yes' : 'No'}`);
            }
        }

        // System information
        results.push(`Node.js: ${process.version}`);
        results.push(`User: ${process.env.USER || process.env.USERNAME || 'unknown'}`);
        results.push(`Host: ${hostname()}`);
        results.push(`Uptime: ${Math.floor(uptime() / 3600)}h ${Math.floor((uptime() % 3600) / 60)}m`);
        results.push(`Local Time: ${new Date().toLocaleString()}`);
        results.push(`UTC Time: ${new Date().toISOString()}`);

        // OS and shell information
        results.push(`OS: ${type()} ${release()} (${arch()})`);
        results.push(`Platform: ${platform()}`);
        results.push(`Shell: ${process.env.SHELL || 'unknown'}`);

        return results;
    }

    async post(
        shared: Shared,
        _prepRes: void,
        execRes: NodeOutput,
    ): Promise<string | undefined> {
        shared.probeResults = execRes;
        return "default";
    }
}