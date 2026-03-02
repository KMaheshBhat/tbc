import { platform, release, type, arch, uptime, hostname } from 'node:os';

import { HAMINode } from '@hami-frameworx/core';

import { Shared, TBCMessage } from '../types.js';

type NodeOutput = {
    appInfo?: TBCMessage[];
    tbcRootInfo?: TBCMessage[];
    systemInfo?: TBCMessage[];
    osAndShellInfo?: TBCMessage[];
};

export class ProbeNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return 'tbc-system:probe';
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
        const appInfo: TBCMessage[] = [];
        const tbcRootInfo: TBCMessage[] = [];
        const systemInfo: TBCMessage[] = [];
        const osAndShellInfo: TBCMessage[] = [];

        // Application info (injected from CLI)
        if (shared?.app && shared?.appVersion) {
            appInfo.push({
                level: 'info',
                code: 'PROBE-APP-INFO',
                source: this.kind(),
                message: `${shared.app}: ${shared.appVersion}`,
            });
        }

        // TBC root directory information
        if (shared?.stage.rootDirectory) {
            if (shared.system.isValidTBCRoot) {
                tbcRootInfo.push({
                    level: 'info',
                    code: 'PROBE-TBC-ROOT-VALID',
                    source: this.kind(),
                    message: `TBC Root: ${shared.stage.rootDirectory} (valid)`,
                });
            } else {
                tbcRootInfo.push({
                    level: 'warn',
                    code: 'PROBE-TBC-ROOT-INVALID',
                    source: this.kind(),
                    message: `TBC Root: ${shared.stage.rootDirectory} (invalid)`,
                });
            }
        }

        systemInfo.push({
            level: 'info',
            code: 'PROBE-SYSTEM-INFO-NODE',
            source: this.kind(),
            message: `Node.js Version: ${process.version}`,
        });
        systemInfo.push({
            level: 'info',
            code: 'PROBE-SYSTEM-INFO-USER',
            source: this.kind(),
            message: `User: ${process.env.USER || process.env.USERNAME || 'unknown'}`,
        });
        systemInfo.push({
            level: 'info',
            code: 'PROBE-SYSTEM-INFO-HOST',
            source: this.kind(),
            message: `Host: ${hostname()}`,
        });
        systemInfo.push({
            level: 'info',
            code: 'PROBE-SYSTEM-INFO-UPTIME',
            source: this.kind(),
            message: `Uptime: ${Math.floor(uptime() / 3600)}h ${Math.floor((uptime() % 3600) / 60)}m`,
        });
        systemInfo.push({
            level: 'info',
            code: 'PROBE-SYSTEM-INFO-LOCAL-TIME',
            source: this.kind(),
            message: `Local Time: ${new Date().toLocaleString()}`,
        });
        systemInfo.push({
            level: 'info',
            code: 'PROBE-SYSTEM-INFO-UTC-TIME',
            source: this.kind(),
            message: `UTC Time: ${new Date().toISOString()}`,
        });

        osAndShellInfo.push({
            level: 'info',
            code: 'PROBE-OS-SHELL-INFO-OS',
            source: this.kind(),
            message: `OS: ${type()} ${release()} (${arch()})`,
        });
        osAndShellInfo.push({
            level: 'info',
            code: 'PROBE-OS-SHELL-INFO-PLATFORM',
            source: this.kind(),
            message: `Platform: ${platform()}`,
        });
        osAndShellInfo.push({
            level: 'info',
            code: 'PROBE-OS-SHELL-INFO-SHELL',
            source: this.kind(),
            message: `Shell: ${process.env.SHELL || 'unknown'}`,
        });

        return {
            appInfo,
            tbcRootInfo,
            systemInfo,
            osAndShellInfo,
        };
    }

    async post(
        shared: Shared,
        _prepRes: void,
        execRes: NodeOutput,
    ): Promise<string | undefined> {
        shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            message: ' ┌┤ Application Info ├────────────────────────────────────────',
        });
        shared.stage.messages.push(...execRes.appInfo || []);
        shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            message: ' └┼───────────────────────────────────────────────────────────',
        });
        shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            message: ' ┌┤ TBC Info ├────────────────────────────────────────────────',
        });
        shared.stage.messages.push(...execRes.tbcRootInfo || []);
        shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            message: ' └┼───────────────────────────────────────────────────────────',
        });
        shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            message: ' ┌┤ System Info ├─────────────────────────────────────────────',
        });
        shared.stage.messages.push(...execRes.systemInfo || []);
        shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            message: ' └┼───────────────────────────────────────────────────────────',
        });
        shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            message: ' ┌┤ OS and Shell Info ├───────────────────────────────────────',
        });
        shared.stage.messages.push(...execRes.osAndShellInfo || []);
        shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            message: ' └┼───────────────────────────────────────────────────────────',
        });
        return 'default';
    }
}
