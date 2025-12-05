#!/usr/bin/env node

import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { bootstrap } from './bootstrap.js';
import { ValidateFlow } from './ops/index.js';

const { registry } = await bootstrap();

const program = new Command();

program
  .name('tbc')
  .description('Third Brain Companion CLI')
  .option('--verbose', 'Enable verbose logging')
  .version(packageJson.version);

let cmdInspect = new Command('inspect')
  .description('Inspect current directory to check if it is a valid TBC root')
  .action(async () => {
    try {
      const isVerbose = !!program.opts().verbose;
      const opts = { verbose: isVerbose };
      const validateFlow = new ValidateFlow({
        verbose: opts.verbose,
      });
      await validateFlow.run({
        registry: registry,
        opts: opts,
      });
    } catch (error) {
      console.error('Error during inspection:', error);
      process.exit(1);
    }
    return;
  });

program.addCommand(cmdInspect);

program.parse();