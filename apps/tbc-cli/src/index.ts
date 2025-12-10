#!/usr/bin/env node

import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { bootstrap } from './bootstrap.js';
import { ValidateFlow, ProbeFlow, InitFlow } from './ops/index.js';
import { RefreshCoreFlow } from '@tbc-frameworx/tbc-core';

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

let cmdProbe = new Command('probe')
  .description('Probe the environment for TBC CLI and system information')
  .action(async () => {
    try {
      const cliOpts = program.opts();
      const isVerbose = !!cliOpts.verbose;
      const root = cliOpts.root;
      const opts = { verbose: isVerbose };
      const probeFlow = new ProbeFlow({
        verbose: opts.verbose,
      });
      await probeFlow.run({
        registry: registry,
        opts: opts,
        root: root,
        app: 'TBC CLI',
        appVersion: packageJson.version,
      });
    } catch (error) {
      console.error('Error during probe:', error);
      process.exit(1);
    }
    return;
  });

program.addCommand(cmdProbe);

let cmdInit = new Command('init')
  .description('Initialize a new TBC companion directory')
  .option('--upgrade', 'Allow re-initialization of existing companion')
  .action(async (opts) => {
    try {
      const cliOpts = program.opts();
      const isVerbose = !!cliOpts.verbose;
      const root = cliOpts.root;
      const upgrade = !!opts.upgrade;
      const initFlow = new InitFlow({
        root: root,
        verbose: isVerbose,
        upgrade: upgrade,
      });
      await initFlow.run({
        registry: registry,
        opts: { verbose: isVerbose },
        app: 'TBC CLI',
        appVersion: packageJson.version,
      });
    } catch (error) {
      console.error('Error during initialization:', error);
      process.exit(1);
    }
    return;
  });

program.addCommand(cmdInit);

let cmdDex = new Command('dex')
  .description('Refresh the core system definitions index')
  .option('--root <path>', 'Root directory')
  .action(async (opts) => {
    try {
      const cliOpts = program.opts();
      const isVerbose = !!cliOpts.verbose;
      const root = opts.root || cliOpts.root;
      const refreshCoreFlow = new RefreshCoreFlow({
        verbose: isVerbose,
      });
      await refreshCoreFlow.run({
        registry: registry,
        opts: { verbose: isVerbose },
        root: root,
      });
    } catch (error) {
      console.error('Error during dex:', error);
      process.exit(1);
    }
    return;
  });

program.addCommand(cmdDex);

program.parse();