import { MintFlow, mintIntent } from './component';
import { mintIntentKind } from './model';

import { ChronoMintProvider } from './provider/chrono';

export const mint = {
  flow: MintFlow,
  intentKind: mintIntentKind,
  intent: mintIntent,
  providers: {
    chrono: ChronoMintProvider
  }
}
