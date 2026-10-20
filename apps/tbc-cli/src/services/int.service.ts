import { arch, hostname, platform, release, type, uptime } from 'node:os';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import packageJson from '../../package.json' with { type: 'json' };
import * as yaml from 'js-yaml';
import matter from 'gray-matter';

import { ASSETS } from '../lib/assets.js';
import { fetchRecord as fetchFsRecord, storeRecord, type TBCRecord } from '../lib/fs.js';
import { upsertRecord } from '../lib/db.js';
import { formatMessages, formatProtocolDiscovery, formatValidationAudit, type TBCMessage } from '../lib/message.js';
import { resolveProtocol, type TBCProtocol } from '../lib/protocol.js';
import { runValidationChecks } from '../lib/validator.js';

export interface IntProbeRequest {
  rootDirectory: string;
  verbose: boolean;
}

export interface IntGenerateRequest {
  rootDirectory: string;
  agentType: string;
  verbose: boolean;
}

function asset(path: string): string {
  const content = ASSETS[path];
  if (content === undefined) throw new Error(`Missing CLI asset: ${path}`);
  return content;
}

function renderProtocol(protocol: TBCProtocol, source: string, verbose: boolean): void {
  console.log(formatMessages(formatProtocolDiscovery(protocol, source), verbose));
}

function renderServiceMessage(source: string, message: string, verbose: boolean): void {
  console.log(formatMessages([{ level: 'info', source, code: 'SERVICE', message }], verbose));
}

function validateRoot(rootDirectory: string, protocol: TBCProtocol, source: string, verbose: boolean): boolean {
  const result = runValidationChecks(rootDirectory, protocol, source);
  console.log(formatMessages(formatValidationAudit(result, source), verbose));
  return result.success;
}

export async function probeInterface(request: IntProbeRequest): Promise<void> {
  const source = 'int:probe';
  const protocol = resolveProtocol(request.rootDirectory);
  renderProtocol(protocol, source, request.verbose);
  renderServiceMessage(source, 'Checking first ...', request.verbose);
  const validation = runValidationChecks(request.rootDirectory, protocol, source);
  if (!existsSync(join(request.rootDirectory, protocol.sysCollection, 'root.md')) &&
      !validation.messages.some((message) => message.message.includes('Essential record "root.md" is missing'))) {
    validation.messages.push({
      level: 'error',
      source,
      code: 'RECORD_MISSING',
      message: `Essential record "root.md" is missing from [${protocol.sysCollection}].`,
      suggestion: 'ACTION: Run \'tbc sys init\'. REASON: System root is uninitialized.',
    });
  }
  console.log(formatMessages(formatValidationAudit(validation, source), request.verbose));

  const messages: TBCMessage[] = [
    { level: 'info', kind: 'raw', source: '', code: '', message: ' ┌┤ Application Info ├────────────────────────────────────────' },
    { level: 'info', source, code: 'PROBE-APP-INFO', message: `TBC CLI: ${packageJson.version}` },
    { level: 'info', kind: 'raw', source: '', code: '', message: ' └┼───────────────────────────────────────────────────────────' },
    { level: 'info', kind: 'raw', source: '', code: '', message: ' ┌┤ TBC Info ├────────────────────────────────────────────────' },
    { level: validation.success ? 'info' : 'warn', source, code: validation.success ? 'PROBE-TBC-ROOT-VALID' : 'PROBE-TBC-ROOT-INVALID', message: `TBC Root: ${request.rootDirectory} (${validation.success ? 'valid' : 'invalid'})` },
    { level: 'info', kind: 'raw', source: '', code: '', message: ' └┼───────────────────────────────────────────────────────────' },
    { level: 'info', kind: 'raw', source: '', code: '', message: ' ┌┤ System Info ├─────────────────────────────────────────────' },
    { level: 'info', source, code: 'PROBE-SYSTEM-INFO-NODE', message: `Node.js Version: ${process.version}` },
    { level: 'info', source, code: 'PROBE-SYSTEM-INFO-USER', message: `User: ${process.env.USER || process.env.USERNAME || 'unknown'}` },
    { level: 'info', source, code: 'PROBE-SYSTEM-INFO-HOST', message: `Host: ${hostname()}` },
    { level: 'info', source, code: 'PROBE-SYSTEM-INFO-UPTIME', message: `Uptime: ${Math.floor(uptime() / 3600)}h ${Math.floor((uptime() % 3600) / 60)}m` },
    { level: 'info', source, code: 'PROBE-SYSTEM-INFO-LOCAL-TIME', message: `Local Time: ${new Date().toLocaleString()}` },
    { level: 'info', source, code: 'PROBE-SYSTEM-INFO-UTC-TIME', message: `UTC Time: ${new Date().toISOString()}` },
    { level: 'info', kind: 'raw', source: '', code: '', message: ' └┼───────────────────────────────────────────────────────────' },
    { level: 'info', kind: 'raw', source: '', code: '', message: ' ┌┤ OS and Shell Info ├───────────────────────────────────────' },
    { level: 'info', source, code: 'PROBE-OS-SHELL-INFO-OS', message: `OS: ${type()} ${release()} (${arch()})` },
    { level: 'info', source, code: 'PROBE-OS-SHELL-INFO-PLATFORM', message: `Platform: ${platform()}` },
    { level: 'info', source, code: 'PROBE-OS-SHELL-INFO-SHELL', message: `Shell: ${process.env.SHELL || 'unknown'}` },
    { level: 'info', kind: 'raw', source: '', code: '', message: ' └┼───────────────────────────────────────────────────────────' },
  ];
  console.log(formatMessages(messages, request.verbose));
}

function hydrateRoleDefinition(companionName: string, primeName: string): string {
  return asset('templates/int/role-definition.md')
    .replace(/\{\{\s*companionName\s*\}\}/g, companionName)
    .replace(/\{\{\s*primeName\s*\}\}/g, primeName);
}

function toLowerKebabCase(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function identityNames(rootDirectory: string, protocol: TBCProtocol): { companionName: string; primeName: string } {
  const companionId = fetchFsRecord(rootDirectory, protocol.sysCollection, 'companion.id')?.content.trim();
  const primeId = fetchFsRecord(rootDirectory, protocol.sysCollection, 'prime.id')?.content.trim();
  const companion = companionId ? fetchFsRecord(rootDirectory, protocol.memCollection, companionId) : null;
  const prime = primeId ? fetchFsRecord(rootDirectory, protocol.memCollection, primeId) : null;
  return {
    companionName: String(companion?.data.record_title || 'companion'),
    primeName: String(prime?.data.record_title || 'prime'),
  };
}

function integrationRecord(agentType: string, roleDefinition: string, companionName: string): TBCRecord {
  switch (agentType) {
    case 'generic':
      return { id: 'AGENTS.md', data: {}, content: roleDefinition };
    case 'gemini-cli':
      return { id: '.gemini/GEMINI.md', data: {}, content: roleDefinition };
    case 'goose':
      return { id: '.goosehints', data: {}, content: `${roleDefinition}\n` };
    case 'github-copilot':
      {
        const template = asset('templates/int/github-copilot/agent.md')
          .replace(/\{\{\s*companionName\s*\}\}/g, companionName)
          .replace(/\{\{\s*roleDefinition\s*\}\}/g, roleDefinition);
        const parsed = matter(template);
        return { id: `.github/agents/${toLowerKebabCase(companionName)}.agent.md`, data: parsed.data, content: parsed.content };
      }
    case 'kilocode':
      return {
        id: '.kilocodemodes',
        data: {},
        content: yaml.dump({ customModes: [{ slug: companionName.toLowerCase(), name: companionName, roleDefinition, groups: ['read', 'edit', 'browser', 'command', 'mcp'], source: 'project' }] }, { lineWidth: -1 }),
      };
    case 'pi':
      return { id: '.pi/SYSTEM.md', data: {}, content: asset('templates/int/pi/SYSTEM.md').replace(/\{\{\s*roleDefinition\s*\}\}/g, roleDefinition) };
    default:
      throw new Error(`Unsupported agent type: ${agentType}`);
  }
}

export async function generateInterface(request: IntGenerateRequest): Promise<void> {
  const source = `int:${request.agentType}`;
  const protocol = resolveProtocol(request.rootDirectory);
  renderProtocol(protocol, source, request.verbose);
  renderServiceMessage(source, 'Checking first ...', request.verbose);
  if (!validateRoot(request.rootDirectory, protocol, source, request.verbose)) {
    console.log(formatMessages([{ level: 'error', source, code: 'OVERWRITE-GUARD', message: 'has no existing companion (not a valid TBC Root)', suggestion: 'Use "tbc sys init" instead.' }], request.verbose));
    return;
  }

  const { companionName, primeName } = identityNames(request.rootDirectory, protocol);
  const record = integrationRecord(request.agentType, hydrateRoleDefinition(companionName, primeName), companionName);
  storeRecord(request.rootDirectory, '.', record);
  if (protocol.hasSqlite) upsertRecord(protocol.sqlitePath, '.', record);

  console.log(formatMessages([
    { level: 'info', kind: 'raw', source: '', code: '', message: ' ┌┼───────────────────────────────────────────────────────────' },
    { level: 'info', kind: 'raw', source: '', code: '', message: `[✓] Integration files created for Agent Type: ${request.agentType}` },
    { level: 'info', kind: 'raw', source: '', code: '', message: ' └┼───────────────────────────────────────────────────────────' },
    { level: 'info', source, code: 'INTEGRATION-DONE', message: 'Agent integration done.', suggestion: 'Highly recommended that the Prime User restarts the interface session for agent integration to take effect.' },
  ], request.verbose));
}
