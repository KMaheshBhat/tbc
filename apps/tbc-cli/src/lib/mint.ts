import { uuidv7 } from 'uuidv7';

/**
 * Generates batch UUID v7 IDs with a small delay between calls
 * to avoid collision (mirrors MintUUIDNode sleep behaviour).
 */
export async function mintUuids(count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(uuidv7());
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }
  return ids;
}

/**
 * Generates batch timestamp IDs (TSID) in YYYYMMDDHHMMSS format
 * with a 1-second pause between calls (mirrors MintTSIDNode behaviour).
 */
export async function mintTsids(count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    ids.push(`${year}${month}${day}${hours}${minutes}${seconds}`);
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return ids;
}
