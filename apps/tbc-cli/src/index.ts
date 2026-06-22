#!/usr/bin/env bun

import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { version } from '@hami-frameworx/core';

const program = new Command();

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

let cmdScaffold = new Command('scaffold')
    .description('Quick actions for current development - not for production use')
    .action(async () => {
      console.log(`HAMI v${version}`);
    });

program.addCommand(cmdScaffold);

program.parse();
