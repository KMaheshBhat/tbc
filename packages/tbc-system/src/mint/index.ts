import { MintFlow, mintIntent, mintIntentKind, WithMintComponent } from './component';
import { ChronoMintProvider } from './provider/chrono';

export const mint = {
  flow: MintFlow,
  mixin: WithMintComponent,
  intentKind: mintIntentKind,
  intent: mintIntent,
  providers: {
    chrono: ChronoMintProvider
  }
}
