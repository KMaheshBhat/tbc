import { MintFlow, mintIntent } from './component';
import { mintFlowKindBase, mintIntentKind } from './model';

import { ChronoMintProvider } from './provider/chrono';

export const mint = {
  flowKindBase: mintFlowKindBase,
  flow: MintFlow,
  intentKind: mintIntentKind,
  intent: mintIntent,
  providers: {
    chrono: ChronoMintProvider
  }
}
