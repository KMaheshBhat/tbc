import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { TBCProtocol } from './protocol.ts';
import type { TBCMessage } from './console.ts';

export interface TBCValidationResult {
  success: boolean;
  timestamp: string;
  messages: TBCMessage[];
}

export function runValidationChecks(rootDirectory: string, protocol: TBCProtocol): TBCValidationResult {
  const messages: TBCMessage[] = [];
  const timestamp = new Date().toISOString();
  let success = true;

  const manifest: Record<string, string[]> = {};
  
  function scanCollection(path: string, key: string) {
    if (existsSync(path)) {
      try {
        const entries = readdirSync(path);
        manifest[key] = entries;
      } catch (e) {
        manifest[key] = [];
      }
    }
  }

  scanCollection(join(rootDirectory, protocol.sysCollection), protocol.sysCollection);
  scanCollection(join(rootDirectory, protocol.skillsCollection), protocol.skillsCollection);
  scanCollection(join(rootDirectory, protocol.memCollection), protocol.memCollection);
  
  function add(level: TBCMessage['level'], code: string, source: string, message: string, suggestion?: string) {
    messages.push({ level, code, source, message, suggestion });
    if (level === 'error') success = false;
  }

  // 1. Sys checks
  const sys = manifest[protocol.sysCollection];
  const sysPurpose = ' (Context: The core anchor records for a Third Brain Companion System)';
  if (!sys) {
    add('error', 'COLLECTION_MISSING', protocol.sysCollection, `Mandatory collection [${protocol.sysCollection}] is missing.${sysPurpose}`, "ACTION: Run 'tbc sys init'. REASON: System root is uninitialized.");
  } else {
    ['root.md', 'companion.id', 'prime.id'].forEach(file => {
      if (!sys.includes(file)) {
        add('error', 'RECORD_MISSING', protocol.sysCollection, `Essential record "${file}" is missing from [${protocol.sysCollection}].${sysPurpose}`, 'ACTION: Verify vault integrity. REASON: A core identity record has been deleted.');
      } else {
        add('info', 'RECORD_VERIFIED', protocol.sysCollection, `Verified presence of "${file}".`);
      }
    });
    if (sys.length < 3) {
      add('warn', 'UNDERPOPULATED', protocol.sysCollection, `Collection [${protocol.sysCollection}] has only ${sys.length} records. Expected at least 3.`);
    }
  }

  // 2. Skills checks
  const skills = manifest[protocol.skillsCollection];
  if (!skills) {
    add('error', 'COLLECTION_MISSING', protocol.skillsCollection, `Mandatory collection [${protocol.skillsCollection}] is missing. (Context: Agent capabilities and toolsets)`);
  } else {
    if (skills.length < 1) {
      add('warn', 'UNDERPOPULATED', protocol.skillsCollection, `Collection [${protocol.skillsCollection}] has only ${skills.length} records. Expected at least 1.`, 'ACTION: Sync skills from TBC Project assets. REASON: Local skill-guides are out of sync.');
    }
  }

  // 3. Cross-reference checks
  let companionID = 'undefined';
  let primeID = 'undefined';
  let memoryMapID = 'undefined';

  const rootMdPath = join(rootDirectory, protocol.sysCollection, 'root.md');
  if (existsSync(rootMdPath)) {
    try {
      const content = readFileSync(rootMdPath, 'utf-8');
      const parsed = matter(content);
      companionID = parsed.data.companion || 'undefined';
      primeID = parsed.data.prime || 'undefined';
      memoryMapID = parsed.data.memory_map || 'undefined';
    } catch (e) {}
  }

  const mem = manifest[protocol.memCollection] || [];
  
  const checkIntegrity = (id: string, descriptor: string, suggestion: string) => {
    // Legacy check matched against .md filename
    const exists = mem.includes(`${id}.md`);
    if (exists) {
      add('info', 'INTEGRITY_OK', protocol.memCollection, `Referenced ${descriptor} "${id}" exists.`);
    } else {
      add('error', 'INTEGRITY_FAIL', protocol.memCollection, `The ${descriptor} ID "${id}" is referenced in the Root Record but is missing from [${protocol.memCollection}].`, suggestion);
    }
  };

  checkIntegrity(companionID, 'Companion Identity', 'ACTION: Re-initialize Companion Record. REASON: The ID in companion.id does not exist in the /mem/ collection.');
  checkIntegrity(primeID, 'Prime User Identity', 'ACTION: Search Git for missing Prime User record. REASON: Critical identity record lost from /mem/.');
  checkIntegrity(memoryMapID, 'Root Memory Map', 'ACTION: Re-index Root Record memory_map. REASON: The root memory pointer is orphaned.');

  return { success, timestamp, messages };
}
