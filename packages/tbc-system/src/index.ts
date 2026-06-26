import { bootstrap } from './component';
import { console } from './console';
import { generate } from './generate';
import { message } from './message';
import { mint } from './mint';

export const system = {
  bootstrap: bootstrap,
  components: {
    message: message,
    console: console,
    mint: mint,
    generate: generate,
  }
}
