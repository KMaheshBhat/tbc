import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';

export interface TBCProtocol {
  rootDirectory: string;
  sysCollection: string;
  skillsCollection: string;
  memCollection: string;
  dexCollection: string;
  actCollection: string;
  hasSqlite: boolean;
  sqlitePath: string;
}

const EXCLUDED_DIRS = ['bak-', 'mem', 'dex', 'act', 'skills'];

const BASELINE_PROTOCOL: TBCProtocol = {
  rootDirectory: '',
  sysCollection: 'sys',
  skillsCollection: 'skills',
  memCollection: 'mem',
  dexCollection: 'dex',
  actCollection: 'act',
  hasSqlite: false,
  sqlitePath: '',
};

const NEXT_PROTOCOL: TBCProtocol = {
  rootDirectory: '',
  sysCollection: 'sys_next',
  skillsCollection: 'skills_next',
  memCollection: 'mem_next',
  dexCollection: 'dex_next',
  actCollection: 'act_next',
  hasSqlite: false,
  sqlitePath: '',
};

const PROTOCOLS: Record<'baseline' | 'next', TBCProtocol> = {
  baseline: BASELINE_PROTOCOL,
  next: NEXT_PROTOCOL,
};

function findRootMd(rootDir: string): string | null {
  function scan(dir: string): string | null {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        const shouldExclude = EXCLUDED_DIRS.some((excluded) => entry.startsWith(excluded));
        if (!shouldExclude) {
          const found = scan(fullPath);
          if (found) return found;
        }
      } else if (entry === 'root.md' || entry === 'root') {
        return fullPath;
      }
    }
    return null;
  }

  return scan(rootDir);
}

function sniffSqlite(rootDir: string, protocol: TBCProtocol): { hasSqlite: boolean; sqlitePath: string } {
  const rootDbPath = join(rootDir, 'records.db');
  const dexDbPath = join(rootDir, protocol.dexCollection, 'records.db');

  if (existsSync(rootDbPath)) {
    return { hasSqlite: true, sqlitePath: rootDbPath };
  }
  if (existsSync(dexDbPath)) {
    return { hasSqlite: true, sqlitePath: dexDbPath };
  }
  return { hasSqlite: false, sqlitePath: rootDbPath };
}

export function resolveProtocol(rootDirectory: string, profile?: 'baseline' | 'next'): TBCProtocol {
  const rootMdPath = findRootMd(rootDirectory);

  if (rootMdPath) {
    const content = readFileSync(rootMdPath, 'utf-8');
    const parsed = matter(content);

    const protocol: TBCProtocol = {
      rootDirectory,
      sysCollection: parsed.data.system_path || 'sys',
      skillsCollection: parsed.data.skills_path || 'skills',
      memCollection: parsed.data.memory_path || 'mem',
      dexCollection: parsed.data.view_path || 'dex',
      actCollection: parsed.data.activity_path || 'act',
      hasSqlite: false,
      sqlitePath: '',
    };

    const sqliteInfo = sniffSqlite(rootDirectory, protocol);
    protocol.hasSqlite = sqliteInfo.hasSqlite;
    protocol.sqlitePath = sqliteInfo.sqlitePath;

    return protocol;
  }

  const fallbackProfile = profile || 'baseline';
  const fallback = { ...PROTOCOLS[fallbackProfile] };
  fallback.rootDirectory = rootDirectory;

  const sqliteInfo = sniffSqlite(rootDirectory, fallback);
  fallback.hasSqlite = sqliteInfo.hasSqlite;
  fallback.sqlitePath = sqliteInfo.sqlitePath;

  return fallback;
}