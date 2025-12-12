#!/usr/bin/env node

import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { bootstrap } from './bootstrap.js';
import { ValidateFlow, ProbeFlow, InitFlow, GenUuidFlow, GenTsidFlow } from './ops/index.js';
import { RefreshCoreFlow, RefreshRecordsFlow } from '@tbc-frameworx/tbc-core';

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
    .description('Refresh indexes')
    .option('--root <path>', 'Root directory');

let cmdDexCore = new Command('core')
    .description('Refresh the core system definitions index')
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
            console.error('Error during dex core:', error);
            process.exit(1);
        }
        return;
    });

let cmdDexRecords = new Command('records')
    .description('Refresh all records indexes')
    .action(async (opts) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = opts.root || cliOpts.root;
            const refreshRecordsFlow = new RefreshRecordsFlow({
                verbose: isVerbose,
            });
            await refreshRecordsFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
            });
        } catch (error) {
            console.error('Error during dex records:', error);
            process.exit(1);
        }
        return;
    });

cmdDex.addCommand(cmdDexCore);
cmdDex.addCommand(cmdDexRecords);

program.addCommand(cmdDex);

let cmdGen = new Command('gen')
    .description('Generate IDs')
    .option('--root <path>', 'Root directory');

let cmdGenUuid = new Command('uuid')
    .description('Generate a UUID v7')
    .option('-c, --count <number>', 'Number of UUIDs to generate', '1')
    .action(async (opts) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = opts.root || cliOpts.root;
            const count = parseInt(opts.count, 10);
            const genUuidFlow = new GenUuidFlow({
                verbose: isVerbose,
            });
            await genUuidFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
                count: count,
            });
        } catch (error) {
            console.error('Error during gen uuid:', error);
            process.exit(1);
        }
        return;
    });

let cmdGenTsid = new Command('tsid')
    .description('Generate a timestamp ID')
    .option('-c, --count <number>', 'Number of TSIDs to generate', '1')
    .action(async (opts) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = opts.root || cliOpts.root;
            const count = parseInt(opts.count, 10);
            const genTsidFlow = new GenTsidFlow({
                verbose: isVerbose,
            });
            await genTsidFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
                count: count,
            });
        } catch (error) {
            console.error('Error during gen tsid:', error);
            process.exit(1);
        }
        return;
    });

cmdGen.addCommand(cmdGenUuid);
cmdGen.addCommand(cmdGenTsid);

program.addCommand(cmdGen);

program.parse();