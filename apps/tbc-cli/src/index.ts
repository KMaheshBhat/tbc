#!/usr/bin/env node

import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { bootstrap } from './bootstrap.js';
import { SysValidateFlow, IntProbeFlow, SysInitFlow, SysUpgradeFlow, GenUuidFlow, GenTsidFlow, IntKilocodeFlow, IntGooseFlow, IntGitHubCopilotFlow } from './ops/index.js';
import { RefreshCoreFlow, RefreshExtensionsFlow,  RefreshRecordsFlow } from '@tbc-frameworx/tbc-core';

const { registry } = await bootstrap();

const program = new Command();

program
  .name('tbc')
  .description('Third Brain Companion CLI')
  .option('--verbose', 'Enable verbose logging')
  .option('--root <path>', 'Specify root directory for operations (defaults to current working directory)')
  .version(packageJson.version);

let cmdSys = new Command('sys')
    .description('System management commands');

let cmdSysInit = new Command('init')
    .description('Initialize a new Third Brain Companion directory')
    .option('--companion <name>', 'Name of the AI companion')
    .option('--prime <name>', 'Name of the prime user (group)')
    .action(async (opts) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;
            const companion = opts.companion;
            const prime = opts.prime;

            // Validation: both companion and prime must be provided
            if (!companion || !prime) {
                console.error('Error: Both --companion and --prime flags are required');
                process.exit(1);
            }

            const initFlow = new SysInitFlow({
                root: root,
                verbose: isVerbose,
                companion: companion,
                prime: prime,
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

let cmdSysUpgrade = new Command('upgrade')
    .description('Upgrade an existing Third Brain Companion directory')
    .action(async () => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;

            const upgradeFlow = new SysUpgradeFlow({
                root: root,
                verbose: isVerbose,
            });
            await upgradeFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                app: 'TBC CLI',
                appVersion: packageJson.version,
            });
        } catch (error) {
            console.error('Error during upgrade:', error);
            process.exit(1);
        }
        return;
    });

let cmdSysValidate = new Command('validate')
    .description('Validate current directory to check if it is a valid Third Brain Companion directory')
    .action(async () => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = cliOpts.root;
            const opts = { verbose: isVerbose };
            const validateFlow = new SysValidateFlow({
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

cmdSys.addCommand(cmdSysInit);
cmdSys.addCommand(cmdSysUpgrade);
cmdSys.addCommand(cmdSysValidate);

program.addCommand(cmdSys);

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

let cmdDexExtensions = new Command('extensions')
    .description('Refresh extensions index')
    .action(async (opts) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = opts.root || cliOpts.root;
            const refreshExtensionsFlow = new RefreshExtensionsFlow({
                verbose: isVerbose,
            });
            await refreshExtensionsFlow.run({
                registry: registry,
                opts: { verbose: isVerbose },
                root: root,
            });
        } catch (error) {
            console.error('Error during dex extensions:', error);
            process.exit(1);
        }
        return;
    });

cmdDex.addCommand(cmdDexCore);
cmdDex.addCommand(cmdDexRecords);
cmdDex.addCommand(cmdDexExtensions);

program.addCommand(cmdDex);

let cmdGen = new Command('gen')
    .description('Generate IDs')
    .option('--root <path>', 'Root directory')
    .option('-c, --count <number>', 'Number of IDs to generate', '1');

let cmdGenUuid = new Command('uuid')
    .description('Generate a UUID v7')
    .action(async (opts, cmd) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = opts.root || cliOpts.root;
            const count = parseInt(cmd.parent.opts().count, 10);
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
    .action(async (opts, cmd) => {
        try {
            const cliOpts = program.opts();
            const isVerbose = !!cliOpts.verbose;
            const root = opts.root || cliOpts.root;
            const count = parseInt(cmd.parent.opts().count, 10);
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

let cmdInt = new Command('int')
    .description('Interface commands');

let cmdIntProbe = new Command('probe')
    .description('Probe the environment for TBC CLI and system information')
    .action(async () => {
      try {
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const opts = { verbose: isVerbose };
        const probeFlow = new IntProbeFlow({
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

cmdInt.addCommand(cmdIntProbe);

let cmdIntKilocode = new Command('kilocode')
    .description('Generate Kilo Code interface configuration')
    .action(async (opts) => {
      try {
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const generateKilocodeCoreInterfaceFlow = new IntKilocodeFlow({
          root: root,
          verbose: isVerbose,
        });
        await generateKilocodeCoreInterfaceFlow.run({
          registry: registry,
          opts: { verbose: isVerbose },
        });
      } catch (error) {
        console.error('Error during int kilocode:', error);
        process.exit(1);
      }
      return;
    });

cmdInt.addCommand(cmdIntKilocode);

let cmdIntGoose = new Command('goose')
    .description('Generate Goose interface configuration')
    .action(async (opts) => {
      try {
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const generateGooseCoreInterfaceFlow = new IntGooseFlow({
          root: root,
          verbose: isVerbose,
        });
        await generateGooseCoreInterfaceFlow.run({
          registry: registry,
          opts: { verbose: isVerbose },
        });
      } catch (error) {
        console.error('Error during int goose:', error);
        process.exit(1);
      }
      return;
    });

cmdInt.addCommand(cmdIntGoose);

let cmdIntGitHubCopilot = new Command('github-copilot')
    .description('Generate GitHub Copilot interface configuration')
    .action(async (opts) => {
      try {
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        const root = cliOpts.root;
        const generateGitHubCopilotCoreInterfaceFlow = new IntGitHubCopilotFlow({
          root: root,
          verbose: isVerbose,
        });
        await generateGitHubCopilotCoreInterfaceFlow.run({
          registry: registry,
          opts: { verbose: isVerbose },
        });
      } catch (error) {
        console.error('Error during int github-copilot:', error);
        process.exit(1);
      }
      return;
    });

cmdInt.addCommand(cmdIntGitHubCopilot);

program.addCommand(cmdInt);

program.parse();