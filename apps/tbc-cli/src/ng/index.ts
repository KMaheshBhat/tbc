import { Command } from 'commander';
import packageJson from '../../package.json' with { type: 'json' };

import { createGenCommand } from './gen.js';
import { createSysCommand } from './sys.js';
import { createMemCommand } from './mem.js';
import { createActCommand } from './act.js';
import { createIntCommand } from './int.js';
import { createDexCommand } from './dex.js';

export function createNgCommand(rootProgram: Command) {
  const ngCommand = new Command('ng')
    .name('ng')
    .description('Third Brain Companion CLI')
    .option('--verbose', 'Enable verbose logging')
    .option('--root <path>', 'Specify root directory for operations (defaults to current working directory)')
    .version(packageJson.version);

  ngCommand.addCommand(createGenCommand(rootProgram));
  ngCommand.addCommand(createSysCommand(rootProgram));
  ngCommand.addCommand(createMemCommand(rootProgram));
  ngCommand.addCommand(createActCommand(rootProgram));
  ngCommand.addCommand(createIntCommand(rootProgram));
  ngCommand.addCommand(createDexCommand(rootProgram));

  return ngCommand;
}
