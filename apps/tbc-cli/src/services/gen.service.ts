import { mintUuids, mintTsids } from '../lib/mint.js';
import { formatMintedIds, formatMessages } from '../lib/message.js';

export interface GenRequest {
  count: number;
  rootDirectory: string;
  verbose: boolean;
  source: string;
}

export async function generateUuids(request: GenRequest): Promise<void> {
  const ids = await mintUuids(request.count);
  const messages = formatMintedIds({ keys: {}, batch: ids }, request.source);
  console.log(formatMessages(messages, request.verbose));
}

export async function generateTsids(request: GenRequest): Promise<void> {
  const ids = await mintTsids(request.count);
  const messages = formatMintedIds({ keys: {}, batch: ids }, request.source);
  console.log(formatMessages(messages, request.verbose));
}
