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
  .option('--root <path>', 'Specify root directory for operations (defaults to current working directory)')
  .version(packageJson.version);

let cmdValidate = new Command('validate')
  .description('Validate current directory to check if it is a valid TBC root')
  .action(async () => {
    try {
      const cliOpts = program.opts();
      const isVerbose = !!cliOpts.verbose;
      const root = cliOpts.root;
      const opts = { verbose: isVerbose };
      const validateFlow = new ValidateFlow({
        verbose: opts.verbose,
      });
      await validateFlow.run({
        registry: registry,
        opts: opts,
        root: root,
      });
    } catch (error) {
      console.error('Error during validation:', error);
      process.exit(1);
    }
    return;
  });

program.addCommand(cmdValidate);

program.parse();