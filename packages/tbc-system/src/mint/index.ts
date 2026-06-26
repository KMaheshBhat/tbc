import { MintFlow, mintIntent } from './flow';
import { kindMintFlowBase, kindMintIntent } from './model';

import { ChronoMintProvider } from './provider/chrono';

export const mint = {
  flowKindBase: kindMintFlowBase,
  flow: MintFlow,
  intentKind: kindMintIntent,
  intent: mintIntent,
  providers: {
    chrono: ChronoMintProvider
  }
}
