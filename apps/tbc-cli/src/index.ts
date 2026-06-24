#!/usr/bin/env bun

import { version } from '@hami-frameworx/core';
import { system } from '@tbc-frameworx/tbc-system';
import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };

const kernel = system.bootstrap();

const program = new Command();

const handleError = (message: string, error: unknown, verbose: boolean) => {
    if (error instanceof Error) {
        console.error(`${message}: ${error.message}`);
        error.cause && console.error(error.cause);
        verbose && console.error(error);
    } else {
        console.error(message);
        console.error(error);
    }
};

const detailedVersion = `
TBC CLI v${packageJson.version}
   HAMI v${version}
`

program
    .name('tbc')
    .description('Third Brain Companion CLI')
    .option('--verbose', 'Enable verbose logging')
    .option('--root <path>', 'Specify root directory for operations (defaults to current working directory)')
    .version(detailedVersion);

let cmdGen = new Command('gen')
    .description('Generate IDs')
    .option('-c, --count <number>', 'Number of IDs to generate', '1')
    .hook('preAction', (thisCommand, actionCommand) => {
        const opts = thisCommand.opts();
        const count = opts.count;
        const parsed = parseInt(count, 10);
        opts.count = parsed;
    });

let cmdGenUuid = new Command('uuid')
    .description('Generate/mint IDs of UUID v7')
    .action(async (_opts, cmd) => {
        const cliOpts = program.opts();
        const isVerbose = !!cliOpts.verbose;
        try {
          await kernel.runFlow(system.components.generate.intent ({
            type: 'uuid',
            count: cmd.parent.opts().count,
          }))
        } catch (error) {
          handleError(`Error running gen uuid`, error, isVerbose);
          process.exit(1);
        }
        return;
    });
cmdGen.addCommand(cmdGenUuid);

let cmdGenTsid = new Command('tsid')
    .description('Generate/mint IDs of timestamp')
    .action(async (_opts, cmd) => {
      const cliOpts = program.opts();
      const isVerbose = !!cliOpts.verbose;
      try {
        await kernel.runFlow(system.components.generate.intent ({
          type: 'tsid',
          count: cmd.parent.opts().count,
        }))
      } catch (error) {
        handleError(`Error running gen tsid`, error, isVerbose);
        process.exit(1);
      }
      return;
    });
cmdGen.addCommand(cmdGenTsid);

program.addCommand(cmdGen);

program.parse();
