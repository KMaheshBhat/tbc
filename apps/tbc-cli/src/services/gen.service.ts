import { mintUuids, mintTsids } from '../lib/mint.js';
import { formatMintedIds, formatMessages } from '../lib/console.js';

export interface GenServiceConfig {
  count: number;
  rootDirectory: string;
  verbose: boolean;
  source: string;
}

export async function generateUuids(config: GenServiceConfig): Promise<void> {
  const ids = await mintUuids(config.count);
  const messages = formatMintedIds({ keys: {}, batch: ids }, config.source);
  console.log(formatMessages(messages, config.verbose));
}

export async function generateTsids(config: GenServiceConfig): Promise<void> {
  const ids = await mintTsids(config.count);
  const messages = formatMintedIds({ keys: {}, batch: ids }, config.source);
  console.log(formatMessages(messages, config.verbose));
}
