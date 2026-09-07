import { Command } from 'commander';

import { createGenCommand } from './gen.js';
import { createSysCommand } from './sys.js';
import { createMemCommand } from './mem.js';
import { createActCommand } from './act.js';
import { createIntCommand } from './int.js';
import { createDexCommand } from './dex.js';

export function createNgCommand(rootProgram: Command) {
  const ngCommand = new Command('ng')
    .description('Next Generation (decoupled) commands');

  ngCommand.addCommand(createGenCommand(rootProgram));
  ngCommand.addCommand(createSysCommand(rootProgram));
  ngCommand.addCommand(createMemCommand(rootProgram));
  ngCommand.addCommand(createActCommand(rootProgram));
  ngCommand.addCommand(createIntCommand(rootProgram));
  ngCommand.addCommand(createDexCommand(rootProgram));

  return ngCommand;
}
