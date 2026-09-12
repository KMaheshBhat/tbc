import matter from 'gray-matter';
import type { TBCRecord } from './fs.js';
import type { TBCProtocol } from './protocol.js';
import { ASSETS } from './assets.js';

/**
 * Pure data builders for TBC record synthesis.
 * These functions take inputs and return TBCRecord objects with zero knowledge
 * of console logging, CLI options, or execution flow.
 */

export function synthesizeCompanionRecord(id: string, name: string, date: string): TBCRecord {
  return {
    id,
    record_type: 'party',
    data: {
      id,
      record_type: 'party',
      party_type: 'agent',
      record_title: name,
      record_create_date: date,
    },
    content: `# ${name}\n\nCompanion Agent for the Third Brain Companion system.`,
  };
}

export function synthesizePrimeRecord(id: string, name: string, date: string): TBCRecord {
  return {
    id,
    record_type: 'party',
    data: {
      id,
      record_type: 'party',
      party_type: 'person',
      record_title: name,
      record_create_date: date,
    },
    content: `# ${name}\n\nPrime User for the Third Brain Companion system.`,
  };
}

export function synthesizeMemoryMapRecord(id: string, date: string): TBCRecord {
  return {
    id,
    record_type: 'structure',
    data: {
      id,
      record_type: 'structure',
      record_title: 'Map of Memories',
      record_create_date: date,
    },
    content: `# Map of Memories\n\nRoot structure record for the memory vault.`,
  };
}

export function synthesizeSystemPointers(companionId: string, primeId: string): TBCRecord[] {
  return [
    {
      id: 'companion.id',
      record_type: 'system',
      data: { id: 'companion.id', record_type: 'system' },
      content: companionId,
    },
    {
      id: 'prime.id',
      record_type: 'system',
      data: { id: 'prime.id', record_type: 'system' },
      content: primeId,
    },
  ];
}

export function synthesizeRootRecord(
  protocol: TBCProtocol,
  companionId: string,
  primeId: string,
  memoryMapId: string,
  name: string,
  primeName: string,
  date: string,
): TBCRecord {
  const rootTemplate = ASSETS['templates/root.md'];
  const rootContent = rootTemplate
    .replace(/\{\{companionName\}\}/g, name)
    .replace(/\{\{primeName\}\}/g, primeName)
    .replace(/\{\{companionID\}\}/g, companionId)
    .replace(/\{\{primeID\}\}/g, primeId)
    .replace(/\{\{memoryMapID\}\}/g, memoryMapId);

  return {
    id: 'root',
    record_type: 'system',
    data: {
      id: 'root',
      record_type: 'system',
      companion: companionId,
      prime: primeId,
      system_path: protocol.sysCollection,
      skills_path: protocol.skillsCollection,
      memory_path: protocol.memCollection,
      memory_map: memoryMapId,
      view_path: protocol.dexCollection,
      activity_path: protocol.actCollection,
      record_create_date: date,
    },
    content: rootContent,
  };
}

export function synthesizeCoreSpecsAndSkills(
  protocol: TBCProtocol,
  assets: Record<string, string>,
): Map<string, TBCRecord[]> {
  const records = new Map<string, TBCRecord[]>();

  const sysCoreRecord: TBCRecord = {
    id: '20251228150423',
    record_type: 'specification',
    data: {
      id: '20251228150423',
      record_type: 'specification',
      specification_name: 'tbc-system-spec',
      record_title: 'Third Brain Companion System Specification 0.6.0',
      record_create_date: '2025-12-28 15:04:23 UTC',
      record_tags: ['c/public/tbc'],
    },
    content: assets['sys/core/20251228150423.md'].split('---\n').slice(2).join('---\n'),
  };

  records.set(`${protocol.sysCollection}/core`, [sysCoreRecord]);

  const skillRecords: TBCRecord[] = [];
  for (const skillName of [
    'tbc-act-ops',
    'tbc-dex-ops',
    'tbc-env-probe',
    'tbc-int-ops',
    'tbc-mem-ops',
    'tbc-sys-ops',
  ]) {
    const assetKey = `skills/core/${skillName}/SKILL.md`;
    const content = assets[assetKey];
    if (content) {
      const parsed = matter(content);
      skillRecords.push({
        id: skillName,
        record_type: 'specification',
        data: parsed.data,
        content: parsed.content,
      });
    }
  }

  records.set(`${protocol.skillsCollection}/core`, skillRecords);

  return records;
}
