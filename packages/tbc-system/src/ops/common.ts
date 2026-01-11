import { TBC_LEVEL_ICON_MAP, TBCMessage } from "./validate-system";

export function composeMessages(messages: TBCMessage[]): string {
    const lines: string[] = [];
    lines.push("─────────────────────────────────────────────────────────────");
    messages.forEach(m => {
        lines.push(...composeMessage(m));
    })
    lines.push("─────────────────────────────────────────────────────────────");
    return lines.join('\n');
}

export function composeMessage(m: TBCMessage): string[] {
    const lines: string[] = [];
    const icon = TBC_LEVEL_ICON_MAP[m.level];
    const connector = ('suggestion' in m && m.suggestion) ? '┬' : '─';
    lines.push(`[${icon}] ${connector} ${m.level.padEnd(5)} | ${m.source} | ${m.message}`);
    if ('suggestion' in m && m.suggestion) {
        lines.push(`    └─ Suggestion: ${m.suggestion}`);
    }
    return lines;
}
